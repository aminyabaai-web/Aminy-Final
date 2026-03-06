import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

const openAiKey = Deno.env.get('OPENAI_API_KEY')

serve(async (req: any) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { content, userId } = await req.json()

    if (!content) {
      return new Response(JSON.stringify({ error: 'Missing content' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (!openAiKey) {
      console.warn('OPENAI_API_KEY is not set')
      // For demo, if API key is missing, just approve it
      return new Response(JSON.stringify({
        flagged: false,
        reason: null,
        message: 'Moderation skipped (no API key)'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Call OpenAI Moderation API
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        input: content
      })
    })

    const data = await response.json()
    const result = data.results[0]

    // Add custom simplistic PII check (e.g. standard phone or SSN pattern)
    // Note: REAL PII detection would require something like AWS Comprehend Medical or a dedicated regex pipeline
    const ssnPattern = /[0-9]{3}-[0-9]{2}-[0-9]{4}/;
    const isPiiFlagged = ssnPattern.test(content);

    let reason = null;
    let flagged = false;

    if (result.flagged) {
      flagged = true;
      // Find the top category that violated the limit
      reason = Object.entries(result.categories)
        .filter(([_, value]) => value === true)
        .map(([key]) => key)
        .join(', ');
    } else if (isPiiFlagged) {
      flagged = true;
      reason = 'PII Detected (Social Security Number)';
    }

    return new Response(
      JSON.stringify({
        flagged,
        reason,
        message: flagged ? `Content blocked due to: ${reason}` : 'Content approved'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
