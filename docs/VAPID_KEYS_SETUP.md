# VAPID Keys Setup Guide

VAPID (Voluntary Application Server Identification) keys are required for Web Push notifications. This guide explains how to generate them and where to place them.

## Quick Start

### 1. Generate VAPID Keys

You can generate VAPID keys using any of these methods:

#### Option A: Online Generator (Easiest)
Visit https://vapidkeys.com and copy your keys.

#### Option B: Using Node.js
```bash
npx web-push generate-vapid-keys
```

#### Option C: Using OpenSSL
```bash
# Generate private key
openssl ecparam -name prime256v1 -genkey -noout -out vapid_private.pem

# Convert to base64
openssl ec -in vapid_private.pem -pubout -outform DER 2>/dev/null | tail -c 65 | base64 | tr '/+' '_-' | tr -d '='

# Get public key
openssl ec -in vapid_private.pem -pubout -outform DER 2>/dev/null | tail -c 65 | base64 | tr '/+' '_-' | tr -d '='
```

### 2. Example Keys (Replace with your own!)

```
Public Key:  BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
Private Key: UUxI4O8-FbRouADVXBXYD_4b5Zq1F42W7I5_A_3HjEA
```

⚠️ **NEVER commit your private key to source control!**

---

## Where to Place Your Keys

### Frontend (Public Key Only)

**File: `.env` or `.env.local`**
```bash
VITE_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
```

This key is already referenced in `src/lib/push-notifications.ts`:
```typescript
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
```

### Backend (Supabase Edge Functions)

Set these as secrets in the Supabase Dashboard:

1. Go to **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Add these secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `VAPID_PUBLIC_KEY` | Your public key | Same as frontend |
| `VAPID_PRIVATE_KEY` | Your private key | **Keep secret!** |
| `VAPID_SUBJECT` | `mailto:hello@aminy.ai` or `https://aminy.ai` | Contact info |

#### Using Supabase CLI
```bash
# Set secrets via CLI
supabase secrets set VAPID_PUBLIC_KEY="BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U"
supabase secrets set VAPID_PRIVATE_KEY="your-private-key-here"
supabase secrets set VAPID_SUBJECT="mailto:hello@aminy.ai"
```

---

## File Locations Summary

```
Aminy-Onboarding/
├── .env                                    # VITE_VAPID_PUBLIC_KEY (frontend)
├── .env.local                              # Alternative for local dev
├── src/
│   └── lib/
│       └── push-notifications.ts           # Uses VAPID_PUBLIC_KEY
├── supabase/
│   ├── functions/
│   │   └── push-notifications/
│   │       └── index.ts                    # Uses all VAPID secrets
│   └── migrations/
│       └── 006_push_notifications.sql      # Database schema
└── docs/
    └── VAPID_KEYS_SETUP.md                 # This file
```

---

## Verification Checklist

### ✅ Frontend Setup
- [ ] `VITE_VAPID_PUBLIC_KEY` is in `.env`
- [ ] Running `npm run dev` shows no VAPID errors in console
- [ ] Browser can subscribe to push notifications

### ✅ Backend Setup
- [ ] `VAPID_PUBLIC_KEY` secret is set in Supabase
- [ ] `VAPID_PRIVATE_KEY` secret is set in Supabase
- [ ] `VAPID_SUBJECT` secret is set in Supabase
- [ ] Edge function deploys without errors

### ✅ Testing
```bash
# Test the edge function locally
supabase functions serve push-notifications

# In another terminal, test the VAPID key endpoint
curl http://localhost:54321/functions/v1/push-notifications/vapid-key
```

---

## Troubleshooting

### "InvalidStateError: Failed to execute 'subscribe' on 'PushManager'"
- Public key is malformed or incorrect
- Check that the key is URL-safe base64 encoded

### "UnauthorizedRegistration" or "401 Unauthorized"
- VAPID keys don't match between frontend and backend
- Regenerate keys and update both places

### "410 Gone" when sending notifications
- The push subscription has expired
- User needs to resubscribe (happens automatically on page load)

### Push works locally but not in production
- Ensure VAPID secrets are set in Supabase Dashboard
- Check Edge Function logs for errors

---

## Security Best Practices

1. **Never commit the private key** to version control
2. **Use different keys** for development and production
3. **Rotate keys periodically** (requires users to resubscribe)
4. **Store private key only** in environment secrets, never in code
5. **Public key can be in code** - it's meant to be public

---

## Additional Resources

- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [VAPID Spec](https://datatracker.ietf.org/doc/html/rfc8292)
- [web-push npm package](https://www.npmjs.com/package/web-push)
- [Push API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
