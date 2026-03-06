# ADR 004: Subscription Tier System Design

## Status

Accepted

## Date

2024-12-15

## Context

Aminy uses a freemium model to acquire users (parents of neurodivergent children) and convert them to paid subscribers. The platform also serves B2B customers (ABA clinics, therapy practices, school districts). The tier system must:

1. **Gate features server-side**: Client-side feature flags are easily bypassed. The server must be the source of truth for what a user can access.
2. **Support granular feature gating**: Different tiers unlock different combinations of features (AI chat limits, document vault access, clinical reports, etc.).
3. **Integrate with Stripe**: Subscription changes in Stripe must automatically update the user's tier in the database.
4. **Support HSA/FSA eligibility**: Healthcare spending accounts require specific billing codes and descriptions.

The team evaluated:

1. **Simple boolean flags** (e.g., `is_premium: true/false`)
2. **Numeric tier levels** (e.g., `tier_level: 0-4`)
3. **Feature set per tier** (a named tier maps to a set of feature strings)

## Decision

Implement a named tier system with server-side feature sets.

### Consumer Tiers (4 tiers)

| Tier | Price | Key Features |
|------|-------|-------------|
| **Free** | $0 | 10 AI messages/day, basic daily plan, 5 calm tools, community read-only |
| **Starter** | $9.99/mo | 50 AI messages/day, custom tasks, push reminders, community posting, weekly reports |
| **Core** | $19.99/mo | Unlimited AI, adaptive daily plan, document vault, AI document analysis, marketplace access, multi-child (3), care plan export |
| **Pro** | $34.99/mo | Everything in Core + monthly BCBA consult, clinical reports, priority support, 20% marketplace discount, 30 min/mo Live AI Video |
| **Pro+** | $49.99/mo | Everything in Pro + unlimited children, unlimited Live AI Video, monthly human consultation credit, API access, dedicated support |

### B2B Tiers (4 tiers)

B2B tiers are for organizations (clinics, schools) and include multi-seat licensing, CentralReach integration, analytics dashboards, and white-labeling.

### Implementation

**Database**: The `profiles` table stores a `tier` column with CHECK constraint:
```sql
tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'basic', 'core', 'pro', 'proplus'))
```

**Server-side feature sets** (`auth-middleware.ts`): Each tier maps to a `Set<string>` of feature identifiers:
```typescript
const TIER_FEATURES: Record<TierType, Set<string>> = {
  free: new Set(['limited-ai-chat', 'basic-daily-plan', 'basic-calm-tools', ...]),
  starter: new Set(['limited-ai-chat', 'custom-tasks', 'full-calm-tools', ...]),
  core: new Set(['unlimited-ai-chat', 'adaptive-daily-plan', 'vault-access', ...]),
  pro: new Set(['unlimited-ai-chat', 'bcba-consult', 'clinical-reports', ...]),
  proplus: new Set(['unlimited-ai-chat', 'multi-child-unlimited', 'api-access', ...]),
};
```

**Feature gating**: The `verifyAuthAndFeature()` middleware function verifies the JWT, fetches the user's tier from the database, and checks if the tier includes the required feature. It returns the minimum tier needed for upgrade prompts.

**Stripe integration**: Stripe webhook events (`customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`) trigger tier updates in the `profiles` table via the main server's webhook handler. The `stripe_customers` table maps Supabase user IDs to Stripe customer IDs.

**Rate limiting**: AI message limits are enforced per-tier via the `rate-limiter.ts` module:
```typescript
const DAILY_MESSAGE_LIMITS: Record<TierType, number> = {
  free: 10,
  starter: 50,
  core: Infinity,
  pro: Infinity,
  proplus: Infinity,
};
```

## Consequences

### Positive

- **Server-enforced**: Feature access is verified server-side on every API call. Client-side tier checks are for UX only (showing upgrade prompts).
- **Granular control**: New features can be added to specific tiers without schema changes -- just add a string to the appropriate Set.
- **Upgrade path is clear**: The `minimumTier` field in 403 responses tells the client exactly which tier to suggest.
- **Stripe sync is automatic**: Webhook-driven tier updates mean no manual intervention when users subscribe, upgrade, or cancel.

### Negative

- **Feature set duplication**: The server-side feature sets must be kept in sync with client-side tier utilities (`tier-utils.ts`). A mismatch causes confusing UX where the client shows a feature as available but the server rejects it.
- **Tier name normalization**: The database accepts multiple tier name variants (`basic` maps to `starter`, `premium` maps to `proplus`). This normalization logic in `normalizeTier()` adds complexity.
- **No per-feature billing**: The system does not support pay-per-use pricing (e.g., $2 per additional AI message beyond the daily limit). This would require a more complex metering system.

### Future Considerations

- **B2B organization tiers**: Organization-level tiers with seat-based pricing and admin controls are planned but not yet implemented in the tier middleware.
- **Usage-based billing**: For high-volume AI users, a usage-based component (pay per message beyond tier limits) could be layered on top.
- **HSA/FSA integration**: Stripe metadata will include HSA/FSA-eligible billing codes for healthcare spending account reimbursement.
