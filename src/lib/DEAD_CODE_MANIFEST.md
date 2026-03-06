# Dead Code Manifest

Files in `src/lib/` with **zero imports** from the rest of the codebase.
These are candidates for removal or future integration.

Last audited: 2025-03-04

## Large Files (500+ lines, 0 imports)

| File | Lines | Notes |
|------|-------|-------|
| provider-dashboard.ts | 927 | Provider admin — may be needed for B2B launch |
| ai-engine/conversation-memory.ts | 725 | Superseded by ai-memory-engine.ts? |
| hipaa-compliance.ts | 674 | Critical for healthcare — wire up before HIPAA audit |
| provider-routing.ts | 650 | Provider matching logic |
| telehealth.ts | 642 | May be superseded by telehealth-api.ts |
| credential-verification.ts | 618 | Provider credential checks |
| moderation-service.ts | 596 | Content moderation engine |
| provider-service.ts | 592 | Provider CRUD operations |
| ai-engine/claude-client.ts | 539 | May be superseded by aminy-ai-brain.ts |
| treatment-goals.ts | 501 | Care plan goal management |

## Medium Files (200-499 lines, 0 imports)

| File | Lines | Notes |
|------|-------|-------|
| rate-limiter.ts | 472 | Rate limiting (has test but no imports) |
| ai-engine/index.ts | 439 | AI engine barrel export |
| ai-engine/embeddings.ts | 413 | Embedding generation |
| ai-conversation.ts | 403 | Conversation management |
| mobile-safe-areas.ts | 365 | Safe area utilities |
| memory-integration.ts | 357 | Memory system integration |
| vault-integration.ts | 269 | Vault storage integration |
| sanitize.ts | 239 | Input sanitization |
| security/encrypted-storage.ts | 312 | Encrypted localStorage |
| security/secure-fetch.ts | 234 | Secure HTTP client |
| security/sanitize.ts | 228 | XSS prevention |
| security/session.ts | 222 | Session management |
| security/auth-rate-limit.ts | 219 | Auth rate limiting |
| content-moderation.ts | 218 | Content moderation |

## Small Files (<200 lines, 0 imports)

| File | Lines | Notes |
|------|-------|-------|
| security/headers.ts | 128 | Security headers |
| fms-exporter.ts | 111 | FMS export |
| security/index.ts | 97 | Security barrel export |
| security/csrf.ts | 85 | CSRF protection |
| fhir-resources.ts | 46 | FHIR interop |
| clinical-outcomes.ts | 37 | Clinical outcome types |
| ai-config.ts | 30 | AI config constants |
| user-settings.ts | 28 | User settings interface |

## Recommendation

- **Keep**: hipaa-compliance.ts, security/*, provider-dashboard.ts (needed for B2B)
- **Review**: ai-engine/* (may be superseded by newer AI modules)
- **Remove**: Duplicated functionality (telehealth.ts vs telehealth-api.ts, sanitize.ts vs security/sanitize.ts)

Total: **34 files, ~10,000+ lines** of code with zero imports.
