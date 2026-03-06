# ADR 002: Supabase Edge Functions as Primary Backend

## Status

Accepted

## Date

2024-11-15

## Context

Aminy requires server-side logic for several security-sensitive operations:

- **AI chat**: Calling the Anthropic Claude and OpenAI APIs requires API keys that must never be exposed to the client.
- **Payment processing**: Stripe webhook signature verification, subscription management, and checkout session creation require server-side Stripe secret keys.
- **Telehealth**: Daily.co room creation and meeting token generation require a server-side API key.
- **Healthcare data**: Insurance eligibility checks (EDI 270/271), claim submissions (EDI 837P), and clearinghouse communication involve HIPAA-regulated data that must be processed server-side with audit logging.
- **Content moderation**: User-generated community content must be screened via OpenAI's Moderation API before publication.
- **Document processing**: Uploaded clinical documents (IEPs, assessments) are processed into vector embeddings for RAG-based AI retrieval.

The team evaluated:

1. **Traditional Node.js API server** (Express/Fastify on a VPS or container)
2. **Supabase Edge Functions** (Deno-based serverless functions deployed alongside the database)
3. **AWS Lambda / Vercel Functions** (third-party serverless platforms)

Key considerations:

- **Colocation with database**: Supabase Edge Functions run in the same infrastructure as the Supabase Postgres database, minimizing latency for DB operations.
- **Deno runtime**: Edge Functions use Deno, which provides built-in TypeScript support, a secure-by-default permissions model, and ESM imports from URLs (no `node_modules`).
- **HIPAA compliance**: Supabase offers a HIPAA-compliant tier with BAA (Business Associate Agreement). Running backend logic within the same HIPAA-compliant boundary simplifies compliance.
- **Serverless scaling**: Edge Functions scale automatically with no server management, which is critical for telehealth appointment surges.
- **Cost**: Pay-per-invocation pricing is more economical than maintaining always-on servers during the early growth phase.

## Decision

Use Supabase Edge Functions as the primary backend for all server-side operations. The architecture consists of:

1. **`make-server-8a022548`** (Hono framework): The main API server handling AI chat, Stripe billing, video rooms, provider management, email services, and rate limiting. Uses the Hono web framework for routing.
2. **`chat`**: Standalone chat completion function (OpenAI passthrough).
3. **`stripe-checkout`**: Standalone Stripe checkout session creation for store purchases.
4. **`telehealth`**: Full telehealth API (appointments, payments, video rooms, notifications, providers).
5. **`calendar-sync`**: Bidirectional Google Calendar synchronization.
6. **`push-notifications`**: Web Push notification delivery via VAPID.
7. **`moderate-content`**: Content moderation via OpenAI Moderation API with PII detection.
8. **`process-document`**: Document ingestion pipeline (text extraction, chunking, OpenAI embeddings, pgvector storage).
9. **`clearinghouse`**: Healthcare clearinghouse integration (Availity) for insurance eligibility (270/271), claim submission (837P), and claim status (276/277).

## Consequences

### Positive

- **Single deployment target**: `supabase functions deploy` deploys all backend logic. No separate CI/CD pipeline for a backend server.
- **HIPAA boundary**: All PHI processing occurs within Supabase's HIPAA-compliant infrastructure.
- **Auto-scaling**: Functions scale from zero to thousands of concurrent invocations without configuration.
- **Database proximity**: Sub-millisecond latency to Postgres for RLS-verified queries.
- **TypeScript everywhere**: Deno's native TypeScript support means the same language is used across frontend and backend.

### Negative

- **Cold starts**: Edge Functions have ~100-300ms cold start latency. Mitigated by the Hono framework's lightweight initialization in the main server.
- **Deno ecosystem**: Smaller package ecosystem than Node.js. Some npm packages require `npm:` or `esm.sh` import specifiers. Not all Node.js packages work in Deno.
- **10 MB function size limit**: The main server function (`make-server-8a022548`) aggregates many modules; this must be monitored.
- **Vendor lock-in**: Logic is tightly coupled to Supabase's Edge Function runtime. Migration to another platform would require rewriting import paths and authentication patterns.
- **No persistent connections**: Edge Functions are stateless. WebSocket-based features (real-time chat streaming) require alternative approaches or Supabase Realtime.

### Alternatives Considered

- **Express.js on Railway/Render**: Would provide a more familiar Node.js environment but requires server management, health monitoring, and a separate deployment pipeline.
- **Vercel Serverless Functions**: Good TypeScript support but would split the backend across two providers (Supabase for DB, Vercel for functions), complicating HIPAA compliance.
- **AWS Lambda with API Gateway**: Most mature serverless platform but adds AWS operational complexity and moves away from the Supabase ecosystem.
