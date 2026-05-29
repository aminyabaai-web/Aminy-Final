# Outlook Calendar — Setup

## 1. Register an Azure app

1. Go to https://entra.microsoft.com → App registrations → New registration
2. Name: "Aminy"
3. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts** (`common`)
4. Redirect URI:
   - Platform: **Web**
   - URI: `https://aminy.ai/auth/outlook-calendar/callback`
   - (Also add `http://localhost:3001/auth/outlook-calendar/callback` for dev)
5. Save → note the **Application (client) ID**
6. Certificates & secrets → New client secret → save the secret value (shown once)
7. API permissions → Add → Microsoft Graph → Delegated:
   - `offline_access` (refresh tokens)
   - `User.Read`
   - `Calendars.ReadWrite`

## 2. Supabase secrets

```bash
supabase secrets set MS_OAUTH_CLIENT_ID="<application-id>"
supabase secrets set MS_OAUTH_CLIENT_SECRET="<client-secret-value>"
supabase secrets set MS_OAUTH_REDIRECT_URI="https://aminy.ai/auth/outlook-calendar/callback"
# Optional — defaults to 'common' (supports personal + work)
# supabase secrets set MS_TENANT="common"
```

## 3. Deploy

```bash
supabase functions deploy outlook-calendar
```

## 4. Verify

In Settings, the Calendar card shows "Outlook" as a connection option after the user disconnects/connects.

## Single-provider limitation

The `user_calendar_tokens` table has UNIQUE(user_id) — only one provider connected at a time. A user adding Outlook will see the existing Google connection replaced. Future enhancement: drop the unique constraint and let users push to multiple calendars.
