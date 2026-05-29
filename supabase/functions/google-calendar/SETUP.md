# Google Calendar — Setup

## 1. Create Google Cloud OAuth credentials

1. Go to https://console.cloud.google.com → create/select a project
2. APIs & Services → **Enable APIs** → enable Google Calendar API
3. APIs & Services → **OAuth consent screen** → External, fill in app info
4. APIs & Services → **Credentials** → Create Credentials → OAuth client ID
5. App type: **Web application**
6. Authorized redirect URIs:
   - `https://aminy.ai/auth/google-calendar/callback`
   - `http://localhost:3001/auth/google-calendar/callback` (for dev)
7. Save the Client ID + Client Secret

## 2. Set Supabase secrets

```bash
supabase secrets set GOOGLE_OAUTH_CLIENT_ID="<client-id>.apps.googleusercontent.com"
supabase secrets set GOOGLE_OAUTH_CLIENT_SECRET="<client-secret>"
supabase secrets set GOOGLE_OAUTH_REDIRECT_URI="https://aminy.ai/auth/google-calendar/callback"
```

## 3. Apply migrations + deploy

```bash
supabase db push
supabase functions deploy google-calendar
```

## 4. Connection flow (already wired in the UI)

1. User taps **Connect Google Calendar** in Settings
2. Frontend calls `POST /google-calendar/auth-url` → receives consent URL
3. User redirects to Google, approves, comes back to `/auth/google-calendar/callback?code=...&state=...`
4. Frontend posts the code + state to `POST /google-calendar/exchange`
5. Edge function exchanges for refresh_token, stores it, returns the connected email
6. Future appointments auto-push via `POST /google-calendar/push-event`

## 5. Verify

In the Supabase SQL editor:
```sql
SELECT user_id, email, status, connected_at, last_synced_at
FROM public.user_calendar_tokens;
```

## Disconnect flow

`POST /google-calendar/disconnect` revokes the refresh token at Google and deletes the row.
