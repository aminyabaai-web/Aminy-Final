# ADR 003: AI Conversation Design with Memory System and Context Engine

## Status

Accepted

## Date

2024-12-01

## Context

Aminy's core differentiator is "Ask Aminy" -- an AI behavioral wellness coach that provides personalized, context-aware guidance to parents of neurodivergent children. The AI must:

1. **Remember past interactions**: A parent discussing sensory triggers in one session should not have to repeat this context in the next session.
2. **Be module-aware**: When a parent is on the Daily Plan screen, the AI should prioritize routine-related suggestions. On the Coverage screen, it should discuss insurance benefits.
3. **Be safe**: The system handles discussions about child behavior, mental health, and crisis situations. It must detect crisis language, never provide medical diagnoses, and appropriately escalate.
4. **Support multiple AI providers**: The team wants flexibility to switch between OpenAI (GPT-4o) and Anthropic (Claude) based on cost, quality, and availability.
5. **Respect tier limits**: Free users get 10 AI messages/day, Starter gets 50, and Core+ gets unlimited.

The team evaluated:

1. **Stateless chat**: Each conversation starts fresh with only the system prompt.
2. **Memory-augmented chat**: A context engine that fetches user data, recent memories, and module context to inject into each AI call.
3. **RAG (Retrieval-Augmented Generation)**: Using vector embeddings of uploaded documents to provide clinical context.

## Decision

Implement a three-layer AI architecture:

### Layer 1: Context Engine (`src/ai/contextLayer.tsx`)

The context layer aggregates user data from across all Aminy modules into a `UserContext` object:

- **Child profile**: Name, age, diagnoses, priorities, communication level
- **Recent activity**: Last Junior Mode session, last shop purchase, last community post
- **Behavioral patterns**: Best time of day, current struggles, recent wins
- **Progress metrics**: Sessions completed this week, calm moments, new strategies

This context is fetched from the KV store via the main server and serialized into a natural language string injected as part of the system prompt.

### Layer 2: Memory System

Memories are short-lived contextual notes (30-day lifecycle) stored via the `/memory/store` endpoint:

- **Categories**: `calm_cue`, `progress`, `insight`, `milestone`
- **Storage**: KV store with TTL, keyed by user ID
- **Retrieval**: Recent memories (last 5) are fetched and injected into the AI context

### Layer 3: Module-Aware Routing

The `getCurrentContext()` function detects which module the user is currently viewing and adjusts:

- **System prompt**: Module-specific instructions (e.g., "You are helping with daily routines" vs "You are helping understand insurance coverage")
- **Placeholder text**: Context-appropriate input hints
- **Context chips**: Quick-select suggestions relevant to the current screen

### AI Provider Abstraction

The `callAI()` function in the main server supports both OpenAI and Anthropic:

- Checks for `OPENAI_API_KEY` first, then falls back to `ANTHROPIC_API_KEY`
- Translates message formats between providers (OpenAI uses `system` role in messages; Claude uses a separate `system` parameter)
- Tracks token usage and estimated cost per request via KV store
- Alerts when daily per-user AI spend exceeds $10

### Safety Controls

- **PII scrubbing**: The `sanitize.ts` module strips SSNs, detects prompt injection attempts, and sanitizes messages before sending to AI providers.
- **Content moderation**: The `moderate-content` edge function screens user-generated content via OpenAI's Moderation API with additional PII regex patterns.
- **Rate limiting**: Per-tier daily message limits enforced server-side (Free: 10, Starter: 50, Core+: unlimited).
- **Crisis detection**: System prompts instruct the AI to recognize crisis language and provide appropriate resources (988 Suicide & Crisis Lifeline, Crisis Text Line).

## Consequences

### Positive

- **Personalized experience**: Users feel the AI "knows" them because it references their child's name, recent activities, and behavioral patterns.
- **Module awareness**: The AI provides contextually relevant responses without the user having to explain what screen they are on.
- **Provider flexibility**: Switching between OpenAI and Anthropic requires only changing an environment variable.
- **Cost visibility**: Per-user token tracking enables cost monitoring and budget alerts.
- **Safety-first**: Multiple layers of content filtering protect vulnerable users.

### Negative

- **Context window limits**: Injecting user context, memories, and module context consumes AI tokens, leaving less room for conversation history. Currently mitigated by limiting injected context to ~500 tokens.
- **Memory staleness**: 30-day TTL means older context is lost. Important long-term insights (e.g., "child diagnosed with ADHD") should be stored in the profile, not memory.
- **Dual-provider complexity**: Different providers have different response formats, token counting methods, and pricing. The abstraction layer must handle these differences.
- **No streaming**: Current implementation waits for the full AI response before returning it to the client. Streaming would improve perceived latency.

### Future Considerations

- **RAG integration**: The `process-document` edge function already generates pgvector embeddings from uploaded clinical documents. A future iteration will query these embeddings to provide document-grounded responses.
- **Conversation history persistence**: Currently, conversation history is session-scoped. Future work will persist history in the database for continuity across sessions.
- **Fine-tuned safety model**: A custom classifier for behavioral health crisis detection would be more reliable than prompt-based detection.
