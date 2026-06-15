import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * AI Chat Edge Function — powers Ask Aminy
 *
 * Supports both Anthropic Claude (preferred) and OpenAI GPT-4o (fallback).
 * Set ANTHROPIC_API_KEY in Supabase secrets to use Claude.
 * Falls back to OPENAI_API_KEY if Anthropic key is not set.
 *
 * To switch to Claude:
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, max_tokens = 1024, temperature = 0.5, stream = false, context } = await req.json()
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    const openAiKey = Deno.env.get('OPENAI_API_KEY')

    // ── Claude (preferred) ──────────────────────────────────────
    if (anthropicKey) {
      // Convert OpenAI-format messages to Anthropic format
      // System message goes in the system parameter, not messages array
      const systemMessage = messages.find((m: { role: string }) => m.role === 'system')?.content || ''
      const conversationMessages = messages
        .filter((m: { role: string }) => m.role !== 'system')
        .map((m: { role: string; content: string }) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }))

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'prompt-caching-2024-07-31',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: max_tokens,
          temperature: temperature,
          // Cache the system prompt — it's ~1,200 tokens sent on every message.
          // Cached tokens cost 90% less ($0.30/MTok vs $3/MTok input).
          system: systemMessage ? [{ type: 'text', text: systemMessage, cache_control: { type: 'ephemeral' } }] : undefined,
          messages: conversationMessages,
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('Anthropic API error:', errorData)
        // Fall through to OpenAI if Anthropic fails
        if (!openAiKey) {
          throw new Error(`Anthropic API Error: ${response.status} ${errorData}`)
        }
      } else {
        const data = await response.json()
        // Convert Anthropic response to OpenAI-compatible format
        // so the client doesn't need to change
        const aiText = data.content?.[0]?.text || ''
        return new Response(JSON.stringify({
          message: aiText,
          response: aiText,
          choices: [{ message: { content: aiText } }],
          model: data.model,
          usage: data.usage,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
    }

    // ── OpenAI (fallback) ───────────────────────────────────────
    if (!openAiKey) {
      throw new Error('No AI API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in Supabase secrets.')
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // fallback only — 20× cheaper than gpt-4o, quality fine for edge cases
        messages: messages,
        max_tokens: max_tokens,
        temperature: temperature,
        stream: stream,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`OpenAI API Error: ${response.status} ${errorData}`)
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
        status: 200,
      })
    }

    const data = await response.json()
    // Normalize OpenAI response to match our expected format
    const aiText = data.choices?.[0]?.message?.content || ''
    return new Response(JSON.stringify({
      message: aiText,
      response: aiText,
      choices: data.choices,
      model: data.model,
      usage: data.usage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
