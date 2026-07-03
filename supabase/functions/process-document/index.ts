import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import pdf from 'npm:pdf-parse@1.1.1'
import { Buffer } from 'node:buffer'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { documentId } = await req.json()
        console.log(`Processing document: ${documentId}`)

        // 1. Setup Supabase admin client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const openAiKey = Deno.env.get('OPENAI_API_KEY')!

        if (!openAiKey) {
            throw new Error('OPENAI_API_KEY is not configured')
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 2. Fetch the document record from the vault
        const { data: document, error: fetchError } = await supabase
            .from('vault_documents')
            .select('*')
            .eq('id', documentId)
            .single()

        if (fetchError || !document) {
            throw new Error(`Failed to fetch document: ${fetchError?.message || 'Not found'}`)
        }

        // Schema (migrations 016 + 20260304000000): file_name, file_path,
        // mime_type (e.g. "application/pdf"), file_type (extension, e.g. "pdf").
        const mimeType: string = document.mime_type || ''
        const isPdf = mimeType === 'application/pdf' || document.file_type === 'pdf'
        const isText = mimeType.includes('text') || ['txt', 'md', 'csv'].includes(document.file_type)

        console.log(`Found document: ${document.file_name} (mime: ${mimeType})`)

        // We only process PDFs and text for now
        if (!isPdf && !isText) {
            return new Response(
                JSON.stringify({ message: "Unsupported file type for text extraction.", type: mimeType || document.file_type }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // 3. Download the actual file from Supabase Storage
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('vault-documents')
            .download(document.file_path)

        if (downloadError || !fileData) {
            throw new Error(`Failed to download file: ${downloadError?.message}`)
        }

        let extractedText = ""

        // 4. Extract text based on file type
        if (isPdf) {
            const arrayBuffer = await fileData.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            try {
                const pdfData = await pdf(buffer)
                extractedText = pdfData.text
                console.log("PDF extraction complete using pdf-parse.")
            } catch (err: any) {
                console.warn("Failed to parse PDF with pdf-parse:", err.message)
                throw new Error("Unable to extract text from this PDF file.")
            }
        } else {
            // Simple text file
            extractedText = await fileData.text()
        }

        if (!extractedText.trim()) {
            throw new Error('No text could be extracted from the document')
        }

        // 5. Chunk the text (simple implementation by paragraph/sentence)
        // Production RAG systems use specialized token chunkers (e.g. LangChain recursive chunker)
        const chunks = extractedText
            .split(/(?<=\.)\s+/) // Split by sentences generally
            .reduce((acc, sentence) => {
                // Group sentences into ~300 character chunks
                if (acc.length === 0 || acc[acc.length - 1].length > 300) {
                    acc.push(sentence);
                } else {
                    acc[acc.length - 1] += ` ${sentence}`;
                }
                return acc;
            }, [] as string[])
            .filter(chunk => chunk.trim().length > 10);

        console.log(`Created ${chunks.length} chunks from document`);

        // 6. Generate embeddings for each chunk via OpenAI
        const embeddingsResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: chunks,
                dimensions: 512, // Match our database schema
            }),
        })

        if (!embeddingsResponse.ok) {
            const errorData = await embeddingsResponse.text();
            throw new Error(`OpenAI Embeddings API Error: ${embeddingsResponse.status} ${errorData}`)
        }

        const embeddingsData = await embeddingsResponse.json()
        const extractedEmbeddings = embeddingsData.data

        // 7. Insert into pgvector embeddings table
        const embeddingRecords = chunks.map((chunk, index) => ({
            user_id: document.user_id,
            content: chunk,
            content_type: 'document',
            embedding: extractedEmbeddings[index].embedding,
            metadata: {
                document_id: document.id,
                document_name: document.file_name,
                chunk_index: index,
                source: 'vault'
            }
        }))

        const { error: insertError } = await supabase
            .from('embeddings')
            .insert(embeddingRecords)

        if (insertError) {
            throw new Error(`Failed to insert embeddings: ${insertError.message}`)
        }

        // 8. Update the document to indicate it's been processed.
        // vault_documents has no usable_by_assistant column — the processed
        // flag + extracted text live in the metadata JSONB (the client maps
        // metadata.ocrStatus → "Aminy read it" chip and metadata.extractedText
        // → in-vault full-text search).
        await supabase
            .from('vault_documents')
            .update({
                metadata: {
                    ...(document.metadata || {}),
                    ocrStatus: 'complete',
                    extractedText: extractedText.slice(0, 8000),
                },
            })
            .eq('id', document.id)

        return new Response(
            JSON.stringify({
                success: true,
                message: `Processed ${chunks.length} embeddings successfully`,
                chunks: chunks.length
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        console.error(`Edge Function Error: ${error.message}`);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
