# ADR 005: CentralReach and Clearinghouse Integration

## Status

Accepted

## Date

2025-01-15

## Context

Aminy serves two audiences that require healthcare billing integration:

1. **Parents**: Need to verify insurance eligibility, understand coverage for ABA therapy, and track claim status for reimbursement.
2. **Providers (BCBAs)**: Need to submit professional claims (EDI 837P) for ABA therapy sessions, verify patient eligibility, and manage prior authorization requests.

The ABA therapy ecosystem relies heavily on:

- **CentralReach**: The dominant practice management platform for ABA therapy providers. Providers use it for scheduling, session notes, billing, and compliance.
- **Clearinghouses**: Intermediaries (Availity, Waystar, Office Ally) that route EDI transactions between providers and insurance payers. They handle eligibility checks (270/271), claim submissions (837P), claim status inquiries (276/277), and remittance advice (835).

The team evaluated:

1. **Direct payer API integration**: Connect directly to each insurance payer's API.
2. **Clearinghouse integration via Availity**: Use Availity as a single integration point for all payers.
3. **CentralReach bidirectional sync**: Synchronize appointment and billing data between Aminy and CentralReach.

## Decision

Implement a two-part integration:

### Part 1: Clearinghouse Integration (`clearinghouse` Edge Function)

The `clearinghouse` edge function provides a server-side proxy to the Availity API with three endpoints:

**Eligibility Check (POST /eligibility)**
- Maps to EDI 270/271 transaction
- Input: member ID, DOB, name, provider NPI, payer ID, service date, service codes
- Output: Plan details, coverage status, deductible/OOP max, copays by service type, prior auth requirements
- Includes mock responses for development when Availity credentials are not configured

**Claim Submission (POST /claims)**
- Maps to EDI 837P (Professional) transaction
- Input: Billing provider, subscriber, diagnosis codes, service lines, total charges, prior auth number
- Builds EDI 837P payload (simplified; production would use a proper X12 library)
- Returns claim control number and acceptance status

**Claim Status (POST /claim-status)**
- Maps to EDI 276/277 transaction
- Input: Claim control number, member ID, payer ID, service dates, provider NPI
- Output: Claim status (approved/denied/pending), amounts charged/paid, check information

### Part 2: Security and Compliance

**Authentication**: All clearinghouse endpoints require a valid Supabase JWT. The user's role is verified from their profile.

**HIPAA Audit Logging**: Every clearinghouse interaction is logged to the `audit_log` table with:
- User ID (who made the request)
- Action type (eligibility_check, claim_submit, claim_status_check)
- Resource type (insurance, claim)
- Sanitized details (only last 4 digits of member IDs)

**Credential Isolation**: Availity OAuth credentials (`AVAILITY_CLIENT_ID`, `AVAILITY_CLIENT_SECRET`) are stored as Supabase Edge Function secrets, never exposed to the client. Token caching with automatic refresh minimizes OAuth token requests.

**PII Handling**: Member IDs and other PII are transmitted only server-side. The client sends the data to the edge function, which communicates with Availity. No PII is logged in full -- only truncated identifiers for audit trails.

### Part 3: CentralReach Sync (Planned)

Bidirectional sync with CentralReach is planned for a future phase:

- **Push**: Aminy session data and care plans sync to CentralReach as client records
- **Pull**: CentralReach appointment schedules and billing status sync back to Aminy
- **Authorization management**: Prior authorization tracking across both platforms

## Consequences

### Positive

- **Single clearinghouse**: Availity supports 95%+ of US commercial payers through one integration point, avoiding the need to integrate with each payer individually.
- **HIPAA-compliant architecture**: All PHI processing occurs server-side within Supabase's HIPAA-compliant infrastructure with comprehensive audit logging.
- **Graceful degradation**: Mock responses allow development and demo without Availity credentials. The `isAvailityConfigured()` check makes this transparent.
- **Parent-facing simplification**: Parents can check their insurance eligibility and understand coverage in plain language without needing to call their insurer.

### Negative

- **EDI complexity**: The 837P format is complex (X12 standard). The current simplified JSON-to-EDI translation is a placeholder; production requires a proper EDI library or service.
- **Payer-specific rules**: Each insurance payer has specific requirements for service codes, modifiers, and prior authorization. The current implementation does not handle payer-specific variations.
- **Availity sandbox limitations**: Availity's sandbox environment has limited test payers and does not fully replicate production behavior.
- **CentralReach API access**: CentralReach's API requires a partnership agreement and has usage limits. This integration is contingent on a business relationship.

### Future Considerations

- **Real EDI 837P generation**: Replace the placeholder with a production X12 library (e.g., `stedi` or `x12-parser`).
- **ERA/835 processing**: Automated remittance advice processing to reconcile payments with claims.
- **Prior authorization workflow**: End-to-end prior auth request, tracking, and renewal integrated with the provider portal.
- **Multi-clearinghouse support**: Add Waystar or Office Ally as fallback clearinghouses for payers not supported by Availity.
