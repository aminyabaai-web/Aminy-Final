# Edge Functions API Reference

All backend logic runs as Supabase Edge Functions (Deno runtime). This document covers every deployed function, its routes, authentication requirements, request/response shapes, and error codes.

> **Base URL**: `https://<project-ref>.supabase.co/functions/v1`

---

## Table of Contents

1. [Main Server (`make-server-8a022548`)](#1-main-server-make-server-8a022548)
2. [Chat (`chat`)](#2-chat)
3. [Stripe Checkout (`stripe-checkout`)](#3-stripe-checkout)
4. [Telehealth (`telehealth`)](#4-telehealth)
5. [Calendar Sync (`calendar-sync`)](#5-calendar-sync)
6. [Push Notifications (`push-notifications`)](#6-push-notifications)
7. [Content Moderation (`moderate-content`)](#7-content-moderation-moderate-content)
8. [Document Processing (`process-document`)](#8-document-processing-process-document)
9. [Clearinghouse (`clearinghouse`)](#9-clearinghouse)
10. [Authentication & Error Patterns](#10-authentication--error-patterns)

---

## 1. Main Server (`make-server-8a022548`)

The primary API server built with the **Hono** web framework. Aggregates AI, analytics, billing, video, provider, and email routes into a single deployable function.

**Prefix**: `/make-server-8a022548`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | One of these | OpenAI GPT-4o API key (checked first) |
| `ANTHROPIC_API_KEY` | One of these | Anthropic Claude API key (fallback) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for admin DB operations |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key for billing operations |
| `DAILY_API_KEY` | Yes | Daily.co API key for video rooms |

### AI Provider Selection

The server checks for `OPENAI_API_KEY` first, then falls back to `ANTHROPIC_API_KEY`. Token costs are tracked per-user in the KV store:

| Provider | Model | Input Cost | Output Cost |
|----------|-------|------------|-------------|
| OpenAI | `gpt-4o` | $2.50 / 1M tokens | $10.00 / 1M tokens |
| Anthropic | `claude-sonnet-4-20250514` | $3.00 / 1M tokens | $15.00 / 1M tokens |

A daily per-user spend alert triggers at **$10**.

---

### 1.1 Health Check

```
GET /make-server-8a022548/health
```

**Auth**: None

**Response** `200`:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "version": "1.0.0"
}
```

---

### 1.2 AI Routes

#### POST `/make-server-8a022548/ai/categorize`

Categorizes a task using AI (e.g., classifying parent questions by topic).

**Auth**: Supabase JWT (Bearer token)
**Rate Limit**: Tier-based daily limits (Free: 10, Starter: 50, Core+: unlimited)

**Request Body**:
```json
{
  "text": "My child had a meltdown at the grocery store",
  "categories": ["sensory", "behavior", "communication", "routine"]
}
```

**Response** `200`:
```json
{
  "category": "sensory",
  "confidence": 0.87,
  "reasoning": "Grocery stores are common sensory overload triggers."
}
```

---

#### POST `/make-server-8a022548/ai/brain`

Contextual AI endpoint that enriches prompts with the full child profile, vault documents, behavioral patterns, and recent memories.

**Auth**: Supabase JWT
**Rate Limit**: Tier-based

**Request Body**:
```json
{
  "message": "What strategies work for bedtime routines?",
  "childId": "uuid",
  "moduleContext": "daily-plan"
}
```

**Response** `200`:
```json
{
  "response": "Based on Alex's sensory profile and your recent success with...",
  "tokensUsed": { "input": 1250, "output": 380 },
  "estimatedCost": 0.0069,
  "memoryUpdates": ["calm_cue: weighted blanket at bedtime"]
}
```

---

#### POST `/make-server-8a022548/ai/chat`

Primary conversational AI endpoint. Handles onboarding conversations, "Ask Aminy" sessions, and module-specific assistance. Includes prompt injection detection via `sanitize.ts`.

**Auth**: Supabase JWT
**Rate Limit**: Tier-based

**Request Body**:
```json
{
  "messages": [
    { "role": "user", "content": "How do I read my insurance EOB?" }
  ],
  "conversationType": "ask-aminy",
  "moduleContext": "coverage"
}
```

**Response** `200`:
```json
{
  "response": "An Explanation of Benefits (EOB) shows...",
  "conversationId": "uuid",
  "tokensUsed": { "input": 800, "output": 450 },
  "dailyUsage": { "used": 3, "limit": 50, "remaining": 47 }
}
```

**Response** `429` (rate limited):
```json
{
  "error": "Daily message limit reached",
  "dailyUsage": { "used": 10, "limit": 10, "remaining": 0 },
  "minimumTier": "starter",
  "upgradeMessage": "Upgrade to Starter for 50 messages/day"
}
```

---

#### GET `/make-server-8a022548/ai/usage`

Returns the authenticated user's daily AI usage status.

**Auth**: Supabase JWT

**Response** `200`:
```json
{
  "used": 7,
  "limit": 50,
  "remaining": 43,
  "tier": "starter",
  "resetAt": "2025-01-16T00:00:00.000Z"
}
```

---

### 1.3 Focus Task Routes

#### GET `/make-server-8a022548/focus/current`

Get the user's current focus task and streak data.

**Auth**: Supabase JWT

**Response** `200`:
```json
{
  "task": { "id": "uuid", "title": "Practice deep breathing", "category": "calm" },
  "streak": { "current": 5, "best": 12 }
}
```

#### POST `/make-server-8a022548/focus/update`

Update the current focus task.

**Auth**: Supabase JWT

**Request Body**:
```json
{
  "taskId": "uuid",
  "title": "New task title",
  "category": "routine"
}
```

#### POST `/make-server-8a022548/focus/complete`

Mark the current focus task as complete. Increments the user's streak.

**Auth**: Supabase JWT

**Request Body**:
```json
{
  "taskId": "uuid"
}
```

---

### 1.4 Analytics & Events

#### POST `/make-server-8a022548/analytics/track`

Track an analytics event. Does **not** require authentication to support pre-login tracking.

**Auth**: None

**Request Body**:
```json
{
  "event": "screen_view",
  "properties": { "screen": "marketplace", "referrer": "dashboard" },
  "userId": "uuid-or-anonymous"
}
```

#### POST `/make-server-8a022548/events/log`

Log a user event (behavioral data point for a child).

**Auth**: Supabase JWT

**Request Body**:
```json
{
  "childId": "uuid",
  "eventType": "meltdown",
  "severity": 3,
  "context": "After school pickup",
  "notes": "Lasted about 10 minutes"
}
```

#### GET `/make-server-8a022548/events/child/:childId`

Fetch logged events for a specific child.

**Auth**: Supabase JWT

**Query Parameters**: `?from=2025-01-01&to=2025-01-31&type=meltdown`

---

### 1.5 Outcomes & Reports

#### POST `/make-server-8a022548/outcomes/weekly-summary`

Generate a weekly outcome summary. Optionally uses AI to provide narrative insights.

**Auth**: Supabase JWT

**Request Body**:
```json
{
  "childId": "uuid",
  "weekStart": "2025-01-13",
  "includeAI": true
}
```

#### GET `/make-server-8a022548/outcomes/trends/:childId`

Get outcome trends over multiple weeks for a child.

**Auth**: Supabase JWT

**Query Parameters**: `?weeks=8`

#### POST `/make-server-8a022548/reports/generate`

Generate a clinical-style report. Feature-gated to the `basic-reports` feature (Core tier and above).

**Auth**: Supabase JWT
**Feature Gate**: `basic-reports`

**Request Body**:
```json
{
  "childId": "uuid",
  "reportType": "monthly-progress",
  "dateRange": { "from": "2025-01-01", "to": "2025-01-31" }
}
```

**Response** `403` (insufficient tier):
```json
{
  "error": "Feature not available on your current plan",
  "requiredFeature": "basic-reports",
  "minimumTier": "core",
  "currentTier": "starter"
}
```

#### GET `/make-server-8a022548/reports/:reportId`

Retrieve a generated report by ID.

**Auth**: Supabase JWT

#### GET `/make-server-8a022548/reports/list`

List all reports for the authenticated user.

**Auth**: Supabase JWT

---

### 1.6 Stripe Billing Routes (imported)

All Stripe routes are prefixed under the main server path.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/stripe/create-checkout` | JWT | Create a Stripe Checkout session for subscriptions |
| POST | `/stripe/create-portal` | JWT | Create a Stripe Customer Portal session |
| GET | `/stripe/subscription` | JWT | Get current subscription details |
| POST | `/stripe/cancel` | JWT | Cancel subscription (at period end) |
| POST | `/stripe/resume` | JWT | Resume a cancelled subscription |
| POST | `/stripe/one-time-payment` | JWT | Create a one-time payment intent |
| POST | `/stripe/webhook` | Stripe signature | Handle Stripe webhook events |
| POST | `/stripe/validate-promo` | JWT | Validate a promotional code |

**Webhook Events Handled**:
- `customer.subscription.created` -- Sets user tier based on Stripe price metadata
- `customer.subscription.updated` -- Updates tier on plan changes
- `customer.subscription.deleted` -- Resets user to `free` tier
- `checkout.session.completed` -- Fulfills one-time purchases

---

### 1.7 Video Routes (imported)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/video/create-room` | JWT | Create a Daily.co video room |
| POST | `/video/meeting-token` | JWT | Generate a meeting participant token |
| GET | `/video/room/:name` | JWT | Get room details |
| DELETE | `/video/room/:name` | JWT | Delete a video room |
| GET | `/video/room/:name/presence` | JWT | Get current room participants |
| POST | `/video/room/:name/start-recording` | JWT | Start cloud recording |
| POST | `/video/room/:name/stop-recording` | JWT | Stop cloud recording |

---

### 1.8 Provider Routes (imported)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/providers/:id` | JWT | Get provider profile |
| GET | `/providers/search` | JWT | Search providers by specialty, location, insurance |
| POST | `/providers/save` | JWT | Save/update provider profile |
| PUT | `/providers/:id/availability` | JWT | Update provider availability slots |
| GET | `/providers/:id/patients` | JWT | List provider's patients |
| GET | `/providers/:id/sessions` | JWT | List provider's sessions |
| GET | `/providers/:id/stats` | JWT | Get provider dashboard statistics |
| POST | `/providers/schedule-session` | JWT | Schedule a new session |
| PUT | `/providers/sessions/:id/status` | JWT | Update session status |
| POST | `/providers/sessions/:id/notes` | JWT | Submit session notes |
| POST | `/providers/request-access` | JWT | Request access to a patient profile |
| GET | `/providers/:id/available-slots` | JWT | Get available booking slots |
| POST | `/providers/verify` | JWT | Submit provider verification |

---

## 2. Chat

**Function**: `chat`
**Path**: `/chat`

Standalone OpenAI chat completion passthrough. Uses GPT-4o with no user context injection.

### POST `/chat`

**Auth**: None (API key is server-side only)

**Request Body**:
```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello" }
  ],
  "max_tokens": 1000,
  "temperature": 0.7,
  "stream": false
}
```

**Response** `200` (non-streaming):
```json
{
  "id": "chatcmpl-...",
  "choices": [
    {
      "message": { "role": "assistant", "content": "Hello! How can I help you?" },
      "finish_reason": "stop"
    }
  ],
  "usage": { "prompt_tokens": 20, "completion_tokens": 12, "total_tokens": 32 }
}
```

**Response** `200` (streaming): Returns a `text/event-stream` response with Server-Sent Events.

---

## 3. Stripe Checkout

**Function**: `stripe-checkout`
**Path**: `/stripe-checkout`

Creates Stripe Checkout sessions for one-time store purchases (marketplace items, resource packs). For subscription management, use the main server's Stripe routes instead.

### POST `/stripe-checkout`

**Auth**: None (user ID passed in body)

**Request Body**:
```json
{
  "items": [
    {
      "stripePriceId": "price_abc123",
      "quantity": 1
    }
  ],
  "successUrl": "https://app.aminy.co/store/success",
  "cancelUrl": "https://app.aminy.co/store",
  "userId": "uuid"
}
```

Dynamic pricing (no pre-created Stripe Price):
```json
{
  "items": [
    {
      "name": "Custom Sensory Kit",
      "amount": 2999,
      "currency": "usd",
      "quantity": 1
    }
  ],
  "successUrl": "...",
  "cancelUrl": "...",
  "userId": "uuid"
}
```

**Response** `200`:
```json
{
  "sessionId": "cs_live_...",
  "url": "https://checkout.stripe.com/c/pay/cs_live_..."
}
```

---

## 4. Telehealth

**Function**: `telehealth`
**Path**: `/telehealth`

Full telehealth API supporting appointment scheduling, payments, video conferencing (Daily.co), notifications, and provider management.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `DAILY_API_KEY` | Yes | Daily.co API key |
| `TWILIO_ACCOUNT_SID` | For SMS | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | For SMS | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | For SMS | Twilio sender phone number |
| `SENDGRID_API_KEY` | For email | SendGrid API key |

### Auth

All routes require a valid Supabase JWT in the `Authorization: Bearer <token>` header.

### 4.1 Appointments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/telehealth/appointments` | List user's appointments |
| GET | `/telehealth/appointments/:id` | Get appointment details |
| POST | `/telehealth/appointments` | Create an appointment |
| PUT | `/telehealth/appointments/:id` | Update an appointment |
| DELETE | `/telehealth/appointments/:id` | Cancel an appointment |

**Create Appointment Body**:
```json
{
  "providerId": "uuid",
  "patientId": "uuid",
  "scheduledAt": "2025-01-20T14:00:00Z",
  "duration": 60,
  "type": "initial-assessment",
  "notes": "First session for behavioral assessment"
}
```

### 4.2 Payments

| Method | Path | Description |
|--------|------|-------------|
| POST | `/telehealth/payments/create-intent` | Create a Stripe PaymentIntent |
| POST | `/telehealth/payments/confirm` | Confirm a payment |
| GET | `/telehealth/payments/:id` | Get payment details |
| POST | `/telehealth/payments/refund` | Process a refund |

### 4.3 Video

| Method | Path | Description |
|--------|------|-------------|
| POST | `/telehealth/video/create-room` | Create a Daily.co room for an appointment |
| POST | `/telehealth/video/token` | Generate a participant meeting token |
| GET | `/telehealth/video/room/:name` | Get room info |
| DELETE | `/telehealth/video/room/:name` | Delete a room |

### 4.4 Notifications

| Method | Path | Description |
|--------|------|-------------|
| POST | `/telehealth/notifications/email` | Send appointment email (via SendGrid) |
| POST | `/telehealth/notifications/sms` | Send appointment SMS (via Twilio) |

### 4.5 Providers

| Method | Path | Description |
|--------|------|-------------|
| GET | `/telehealth/providers` | List available providers |
| GET | `/telehealth/providers/:id` | Get provider details |
| GET | `/telehealth/providers/:id/availability` | Get available time slots |

---

## 5. Calendar Sync

**Function**: `calendar-sync`
**Path**: `/calendar-sync`

Bidirectional Google Calendar synchronization. Manages OAuth token refresh automatically.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key |

### POST `/calendar-sync`

**Auth**: Supabase JWT

**Request Body** (action-based routing):

```json
{
  "action": "create_event",
  "event": {
    "summary": "ABA Therapy Session",
    "start": "2025-01-20T14:00:00-05:00",
    "end": "2025-01-20T15:00:00-05:00",
    "description": "Weekly session with Dr. Smith"
  }
}
```

**Supported Actions**:

| Action | Description | Additional Fields |
|--------|-------------|-------------------|
| `create_event` | Create a calendar event | `event` object |
| `update_event` | Update an existing event | `eventId`, `event` object |
| `delete_event` | Delete an event | `eventId` |
| `list_events` | List events in a date range | `timeMin`, `timeMax` |
| `sync_all` | Full bidirectional sync | None |

**Database Tables Used**:
- `calendar_integrations` -- Stores OAuth tokens per user
- `calendar_event_mappings` -- Maps Aminy events to Google Calendar event IDs

---

## 6. Push Notifications

**Function**: `push-notifications`
**Path**: `/push-notifications`

Web Push notifications via the VAPID protocol.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VAPID_PUBLIC_KEY` | Yes | VAPID public key |
| `VAPID_PRIVATE_KEY` | Yes | VAPID private key |
| `VAPID_SUBJECT` | Yes | VAPID subject (mailto: or URL) |

### Routes

#### POST `/push-notifications/subscribe`

Register a push subscription for the authenticated user.

**Auth**: Supabase JWT

**Request Body**:
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}
```

#### POST `/push-notifications/unsubscribe`

Remove a push subscription.

**Auth**: Supabase JWT

**Request Body**:
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

#### POST `/push-notifications/send`

Send a push notification to a user.

**Auth**: Supabase JWT

**Request Body**:
```json
{
  "userId": "uuid",
  "title": "Therapy Reminder",
  "body": "Your session with Dr. Smith starts in 30 minutes",
  "url": "/telehealth-room",
  "icon": "/icon-192.png"
}
```

#### POST `/push-notifications/schedule`

Schedule a notification for future delivery.

**Auth**: Supabase JWT

**Request Body**:
```json
{
  "userId": "uuid",
  "title": "Daily Check-in",
  "body": "How was Alex's day today?",
  "scheduledAt": "2025-01-20T18:00:00Z"
}
```

#### POST `/push-notifications/cancel`

Cancel a scheduled notification.

**Auth**: Supabase JWT

**Request Body**:
```json
{
  "scheduleId": "uuid"
}
```

#### GET `/push-notifications/vapid-key`

Get the VAPID public key for client-side subscription setup.

**Auth**: None

**Response** `200`:
```json
{
  "vapidPublicKey": "BN..."
}
```

---

## 7. Content Moderation (`moderate-content`)

**Function**: `moderate-content`
**Path**: `/moderate-content`

Screens user-generated content (community posts, comments) using the OpenAI Moderation API with additional PII regex detection.

### POST `/moderate-content`

**Auth**: None (called server-to-server)

**Request Body**:
```json
{
  "content": "Text to moderate",
  "userId": "uuid"
}
```

**Response** `200` (clean):
```json
{
  "flagged": false,
  "reason": null,
  "message": "Content approved"
}
```

**Response** `200` (flagged -- PII):
```json
{
  "flagged": true,
  "reason": "pii_detected",
  "message": "Content contains personally identifiable information (SSN pattern detected)"
}
```

**Response** `200` (flagged -- moderation):
```json
{
  "flagged": true,
  "reason": "content_policy_violation",
  "message": "Content flagged by moderation: harassment"
}
```

**PII Detection Patterns**:
- Social Security Numbers: `XXX-XX-XXXX`

**Graceful Degradation**: When `OPENAI_API_KEY` is not configured, the function approves all content (skips moderation). This allows development without an OpenAI key.

---

## 8. Document Processing (`process-document`)

**Function**: `process-document`
**Path**: `/process-document`

Processes uploaded clinical documents (IEPs, assessments, therapy notes) into vector embeddings for RAG-based AI retrieval.

### POST `/process-document`

**Auth**: Supabase JWT

**Request Body**:
```json
{
  "documentId": "uuid"
}
```

**Processing Pipeline**:

1. Fetch document metadata from `vault_documents` table
2. Download file from `vault-documents` Supabase Storage bucket
3. Extract text content (text files read directly; PDF extraction is mocked in current build)
4. Chunk text into ~300 character segments at sentence boundaries
5. Generate embeddings via OpenAI `text-embedding-3-small` (512 dimensions)
6. Store embeddings in the `embeddings` table with document metadata
7. Mark document as `usable_by_assistant: true`

**Response** `200`:
```json
{
  "success": true,
  "documentId": "uuid",
  "chunksCreated": 12,
  "embeddingDimensions": 512
}
```

**Response** `404`:
```json
{
  "error": "Document not found"
}
```

---

## 9. Clearinghouse

**Function**: `clearinghouse`
**Path**: `/clearinghouse`

Healthcare clearinghouse integration via the **Availity** API for insurance eligibility verification, claim submission, and claim status inquiries.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AVAILITY_CLIENT_ID` | For production | Availity OAuth client ID |
| `AVAILITY_CLIENT_SECRET` | For production | Availity OAuth client secret |

When these are not configured, the function returns **mock responses** for development (controlled by `isAvailityConfigured()`).

### Auth

All endpoints require a valid Supabase JWT. The user's role is verified from their profile metadata.

### HIPAA Audit Logging

Every clearinghouse interaction is logged to the `audit_log` table:
- User ID
- Action type (`eligibility_check`, `claim_submit`, `claim_status_check`)
- Resource type (`insurance`, `claim`)
- Sanitized details (only last 4 digits of member IDs)

---

### 9.1 Eligibility Check

```
POST /clearinghouse/eligibility
```

Maps to **EDI 270/271** transaction.

**Request Body**:
```json
{
  "memberId": "ABC123456789",
  "dateOfBirth": "2018-05-15",
  "firstName": "Alex",
  "lastName": "Smith",
  "providerNPI": "1234567890",
  "payerId": "BCBS_FL",
  "serviceDate": "2025-01-20",
  "serviceCodes": ["97153", "97155"]
}
```

**Response** `200`:
```json
{
  "eligible": true,
  "planName": "Blue Cross Blue Shield PPO",
  "coverageStatus": "active",
  "deductible": { "individual": 1500, "met": 800, "remaining": 700 },
  "outOfPocketMax": { "individual": 5000, "met": 1200, "remaining": 3800 },
  "copays": {
    "97153": { "amount": 30, "type": "copay" },
    "97155": { "amount": 30, "type": "copay" }
  },
  "priorAuthRequired": true,
  "priorAuthNotes": "Prior authorization required for ABA therapy services"
}
```

---

### 9.2 Claim Submission

```
POST /clearinghouse/claims
```

Maps to **EDI 837P** (Professional) transaction.

**Request Body**:
```json
{
  "billingProvider": {
    "name": "ABA Therapy Associates",
    "npi": "1234567890",
    "taxId": "12-3456789"
  },
  "subscriber": {
    "memberId": "ABC123456789",
    "firstName": "Parent",
    "lastName": "Smith",
    "dateOfBirth": "1985-03-20"
  },
  "patient": {
    "firstName": "Alex",
    "lastName": "Smith",
    "dateOfBirth": "2018-05-15",
    "relationToSubscriber": "child"
  },
  "diagnosisCodes": ["F84.0"],
  "serviceLines": [
    {
      "serviceCode": "97153",
      "modifier": ["HO"],
      "dateOfService": "2025-01-20",
      "units": 4,
      "charges": 240.00
    }
  ],
  "totalCharges": 240.00,
  "priorAuthNumber": "AUTH12345",
  "payerId": "BCBS_FL"
}
```

**Response** `200`:
```json
{
  "claimControlNumber": "CLM-20250120-001",
  "status": "accepted",
  "message": "Claim accepted for processing"
}
```

> **Note**: The current 837P generation is a simplified JSON-to-EDI translation. Production deployment requires a proper X12 library (e.g., `stedi` or `x12-parser`).

---

### 9.3 Claim Status

```
POST /clearinghouse/claim-status
```

Maps to **EDI 276/277** transaction.

**Request Body**:
```json
{
  "claimControlNumber": "CLM-20250120-001",
  "memberId": "ABC123456789",
  "payerId": "BCBS_FL",
  "serviceDateFrom": "2025-01-20",
  "serviceDateTo": "2025-01-20",
  "providerNPI": "1234567890"
}
```

**Response** `200`:
```json
{
  "claimControlNumber": "CLM-20250120-001",
  "status": "approved",
  "amountCharged": 240.00,
  "amountPaid": 210.00,
  "patientResponsibility": 30.00,
  "checkNumber": "CHK-9876543",
  "checkDate": "2025-02-01",
  "eobAvailable": true
}
```

---

## 10. Authentication & Error Patterns

### Authentication Flow

Most endpoints use Supabase JWT authentication:

```
Authorization: Bearer <supabase-jwt-token>
```

The JWT is verified server-side using `supabaseClient.auth.getUser(token)`. The user's tier is fetched from the `profiles` table to enforce feature gating and rate limits.

### Standard Error Responses

| Status | Meaning | Example Body |
|--------|---------|--------------|
| `400` | Bad Request | `{ "error": "Missing required field: memberId" }` |
| `401` | Unauthorized | `{ "error": "Invalid or missing authentication token" }` |
| `403` | Forbidden (tier) | `{ "error": "Feature not available", "minimumTier": "core" }` |
| `404` | Not Found | `{ "error": "Resource not found" }` |
| `429` | Rate Limited | `{ "error": "Daily message limit reached", "minimumTier": "starter" }` |
| `500` | Server Error | `{ "error": "Internal server error" }` |

### CORS

All edge functions return CORS headers for the Aminy PWA origin:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

All `OPTIONS` preflight requests return `204` with CORS headers.
