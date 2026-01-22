# Apple Sign In with Apple - Setup Progress

## Overview
Setting up Sign in with Apple for Aminy Onboarding app.

## Apple Developer Portal Setup

### 1. Enable App ID (Completed Previously)
- App ID configured for Sign in with Apple

### 2. Create Service ID for Web Authentication
- **Service ID**: `app.aminy.web.auth` (or similar)
- **Description**: Aminy Web Authentication
- **Domain**: `aminy-onboarding.vercel.app`
- **Return URL**: `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`

### 3. Create Key (IN PROGRESS)
- **Key Name**: Aminy Sign In Key
- **Status**: Creating new key (revoking duplicate)
- **Key ID**: (will be generated after registration)
- **Download**: .p8 file (DOWNLOAD IMMEDIATELY - only available once!)

### 4. Register Email Sources for Communication
- For Private Email Relay service
- Email domain verification

---

## Required Information for Supabase

After completing Apple Developer Portal setup, you'll need:

1. **Service ID** (Client ID): `app.aminy.web.auth`
2. **Team ID**: `84Y4KWZ59X` (from Apple Developer account)
3. **Key ID**: (from the key you create)
4. **Private Key**: Contents of the .p8 file

---

## Supabase Dashboard Configuration

Go to: Supabase Dashboard > Authentication > Providers > Apple

Enter:
- **Client ID**: Your Service ID (e.g., `app.aminy.web.auth`)
- **Secret Key**: Contents of .p8 file (the private key)
- **Team ID**: `84Y4KWZ59X`
- **Key ID**: The Key ID from Apple Developer Portal

---

## Code Implementation (Already Done)

The code is already implemented in:
- `src/components/LoginScreen.tsx` - `handleAppleSignIn()` function
- `src/components/CreateAccountScreen.tsx` - `handleSocialAuth('apple')` function

Both use Supabase's `signInWithOAuth` with:
```typescript
await supabase.auth.signInWithOAuth({
  provider: 'apple',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

---

## Testing Checklist

- [ ] Key created and .p8 file downloaded
- [ ] Service ID configured with correct domains
- [ ] Supabase Apple provider configured
- [ ] Test Sign in with Apple on web
- [ ] Test Sign in with Apple on iOS (if applicable)

---

## Important Notes

1. **Private Key Security**: The .p8 file can only be downloaded ONCE. Store it securely!
2. **Key ID**: Note the Key ID when creating the key - you'll need it for Supabase
3. **Service ID**: This acts as your "Client ID" for web authentication
4. **Team ID**: Found in Apple Developer account (top right or membership details)

---

## Current Status

**Date**: January 21, 2026
**Step**: Creating new Sign in with Apple key (revoking old duplicate)
**Next**:
1. Revoke old "Aminy Sign In Key"
2. Create new key with unique name
3. Download .p8 file immediately
4. Configure Supabase with key details
