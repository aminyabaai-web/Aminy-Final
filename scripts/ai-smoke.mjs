#!/usr/bin/env node
/**
 * Prod AI smoke test — proves the deployed `chat` edge function returns a REAL
 * response AND that it's served by Claude (not the OpenAI fallback).
 *
 * Why this exists: the ANTHROPIC_API_KEY lives only as a Supabase secret. If it
 * is ever unset/expired, the function silently falls back to OpenAI gpt-4o and
 * every "Claude-powered" claim becomes false with NO build/test failure. This
 * script makes that regression loud.
 *
 * Usage:  node scripts/ai-smoke.mjs
 * CI:     add as a step (nightly or pre-deploy). Reads creds from env or .env.local.
 * Exit:   0 = real Claude response · 1 = down / non-200 / served by fallback model.
 */
import { readFileSync } from 'node:fs';

function loadEnv(name) {
  if (process.env[name]) return process.env[name];
  try {
    const line = readFileSync('.env.local', 'utf8')
      .split('\n')
      .find((l) => l.startsWith(`${name}=`));
    if (line) return line.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, '');
  } catch { /* no .env.local */ }
  return undefined;
}

const SUPABASE_URL = loadEnv('VITE_SUPABASE_URL');
const ANON = loadEnv('VITE_SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !ANON) {
  console.warn('[ai-smoke] SKIPPED — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not available in this environment.');
  process.exit(0); // don't fail CI where secrets aren't present
}

const REQUIRE_CLAUDE = process.env.AI_SMOKE_REQUIRE_CLAUDE !== 'false'; // default: require Claude

const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'Reply with exactly: SMOKE_TEST_OK' }], max_tokens: 20 }),
}).catch((e) => { console.error('[ai-smoke] FAIL — request error:', e.message); process.exit(1); });

if (!res.ok) { console.error(`[ai-smoke] FAIL — HTTP ${res.status}`); process.exit(1); }

const data = await res.json();
const model = String(data.model || '');
const content = (data.choices?.[0]?.message?.content) || data.response || data.message || '';

if (!content) { console.error('[ai-smoke] FAIL — empty AI response', data); process.exit(1); }

const isClaude = model.toLowerCase().includes('claude');
console.log(`[ai-smoke] model=${model} content=${JSON.stringify(content).slice(0, 40)}`);

if (REQUIRE_CLAUDE && !isClaude) {
  console.error(`[ai-smoke] FAIL — served by FALLBACK model "${model}", not Claude. Set ANTHROPIC_API_KEY in Supabase secrets.`);
  process.exit(1);
}
console.log(`[ai-smoke] PASS — real response${isClaude ? ' from Claude' : ` (model: ${model})`}.`);
process.exit(0);
