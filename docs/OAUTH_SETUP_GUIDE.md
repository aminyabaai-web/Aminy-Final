# OAuth Setup Guide: Google & Apple Sign-In

This guide walks through setting up Google and Apple OAuth for Aminy.

---

## Table of Contents
1. [Google OAuth Setup](#google-oauth-setup)
2. [Apple Sign-In Setup](#apple-sign-in-setup)
3. [Supabase Configuration](#supabase-configuration)
4. [Frontend Implementation](#frontend-implementation)
5. [Testing Checklist](#testing-checklist)

---

## Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name it `Aminy` and create
4. Select the new project

### Step 2: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (unless you have Google Workspace)
3. Fill in the required fields:

| Field | Value |
|-------|-------|
| App name | Aminy |
| User support email | your-email@example.com |
| App logo | Upload Aminy logo (optional) |
| App domain | https://aminy.app |
| Authorized domains | aminy.app, supabase.co |
| Developer contact | your-email@example.com |

4. Click **Save and Continue**

### Step 3: Add Scopes

1. Click **Add or Remove Scopes**
2. Select these scopes:
   - `openid`
   - `email`
   - `profile`
3. Click **Update** → **Save and Continue**

### Step 4: Add Test Users (Development)

1. Add your email addresses for testing
2. Click **Save and Continue**

### Step 5: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Configure:

| Field | Value |
|-------|-------|
| Name | Aminy Web Client |
| Authorized JavaScript origins | `http://localhost:5173`, `https://aminy.app` |
| Authorized redirect URIs | `https://YOUR_PROJECT.supabase.co/auth/v1/callback` |

5. Click **Create**
6. **Save your Client ID and Client Secret!**

### Step 6: Publish App (Production)

1. Go back to **OAuth consent screen**
2. Click **Publish App**
3. Complete Google's verification process (may take a few days)

---

## Apple Sign-In Setup

### Prerequisites
- Apple Developer account ($99/year)
- Access to [Apple Developer Portal](https://developer.apple.com/)

### Step 1: Create App ID

1. Go to **Certificates, Identifiers & Profiles** → **Identifiers**
2. Click **+** to create a new identifier
3. Select **App IDs** → **Continue**
4. Select **App** → **Continue**
5. Fill in:

| Field | Value |
|-------|-------|
| Description | Aminy |
| Bundle ID | com.aminy.app (Explicit) |

6. Scroll down and enable **Sign In with Apple**
7. Click **Continue** → **Register**

### Step 2: Create Services ID (for Web)

1. Go to **Identifiers** → Click **+**
2. Select **Services IDs** → **Continue**
3. Fill in:

| Field | Value |
|-------|-------|
| Description | Aminy Web |
| Identifier | com.aminy.web |

4. Click **Continue** → **Register**
5. Click on your new Services ID
6. Enable **Sign In with Apple** → Click **Configure**
7. Configure:

| Field | Value |
|-------|-------|
| Primary App ID | Select your App ID (com.aminy.app) |
| Domains | aminy.app |
| Return URLs | `https://YOUR_PROJECT.supabase.co/auth/v1/callback` |

8. Click **Next** → **Done** → **Continue** → **Save**

### Step 3: Create Private Key

1. Go to **Keys** → Click **+**
2. Fill in:

| Field | Value |
|-------|-------|
| Key Name | Aminy Sign In Key |

3. Enable **Sign In with Apple** → Click **Configure**
4. Select your Primary App ID → Click **Save**
5. Click **Continue** → **Register**
6. **Download the key file** (.p8) - you can only download once!
7. Note your **Key ID** (shown on the keys page)

### Step 4: Note Your Team ID

1. Go to **Membership** in the sidebar
2. Copy your **Team ID**

### Required Apple Credentials Summary

| Credential | Where to Find | Example |
|------------|---------------|---------|
| Services ID | Identifiers → Services IDs | com.aminy.web |
| Team ID | Membership page | ABC123DEF4 |
| Key ID | Keys page | XYZ789KEY |
| Private Key | Downloaded .p8 file | -----BEGIN PRIVATE KEY----- ... |

---

## Supabase Configuration

### Google OAuth in Supabase

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Toggle **Enable Sign in with Google**
4. Enter your credentials:

| Field | Value |
|-------|-------|
| Client ID | From Google Cloud Console |
| Client Secret | From Google Cloud Console |

5. Copy the **Callback URL** and add it to Google Cloud Console
6. Click **Save**

### Apple OAuth in Supabase

1. In **Authentication** → **Providers**, find **Apple**
2. Toggle **Enable Sign in with Apple**
3. Enter your credentials:

| Field | Value |
|-------|-------|
| Services ID | com.aminy.web |
| Secret Key | Paste the entire .p8 file contents |
| Team ID | Your Apple Team ID |
| Key ID | Your Apple Key ID |

4. Copy the **Callback URL** and add it to Apple Developer Portal
5. Click **Save**

---

## Frontend Implementation

The OAuth implementation is already set up in Aminy. Here's how it works:

### Using Supabase Auth

```typescript
// src/utils/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Google Sign-In
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  return { data, error };
}

// Apple Sign-In
export async function signInWithApple() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
}
```

### Auth Callback Handler

```typescript
// Handle the OAuth callback (e.g., in /auth/callback route)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/utils/supabase/client';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/care');
      }
    });
  }, [navigate]);

  return <div>Completing sign in...</div>;
}
```

### Sign-In UI Component

```tsx
import { Button } from '@/components/ui/button';
import { signInWithGoogle, signInWithApple } from '@/utils/supabase/client';

export function SignInButtons() {
  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        className="w-full"
        onClick={() => signInWithGoogle()}
      >
        <GoogleIcon className="mr-2 h-4 w-4" />
        Continue with Google
      </Button>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => signInWithApple()}
      >
        <AppleIcon className="mr-2 h-4 w-4" />
        Continue with Apple
      </Button>
    </div>
  );
}
```

---

## Testing Checklist

### Google OAuth Testing

- [ ] **Development**
  - [ ] Can sign in from localhost:5173
  - [ ] Redirects correctly after auth
  - [ ] User profile is created in Supabase
  - [ ] Can sign out and sign back in

- [ ] **Production**
  - [ ] App is published (not in testing mode)
  - [ ] Production domain is in authorized origins
  - [ ] Callback URL uses production Supabase URL

### Apple OAuth Testing

- [ ] **Development**
  - [ ] Test on Safari (Apple sign-in works best on Safari)
  - [ ] Test the "Hide My Email" feature
  - [ ] Verify user data is received correctly

- [ ] **Production**
  - [ ] Test on iOS Safari (requires HTTPS)
  - [ ] Test on macOS Safari
  - [ ] Test on Chrome/Firefox (via popup)

### Common Issues

| Issue | Solution |
|-------|----------|
| "redirect_uri_mismatch" | Add the exact callback URL to provider console |
| "invalid_client" | Double-check client ID and secret |
| Apple sign-in not appearing | Ensure you're on HTTPS (required by Apple) |
| User created but no profile | Check the `handle_new_user` trigger in Supabase |

---

## Environment Variables

Add these to your `.env` file:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# OAuth redirect (for development)
VITE_SITE_URL=http://localhost:5173
```

For production, update `VITE_SITE_URL` to `https://aminy.app`.

---

## Security Notes

1. **Never expose client secrets** in frontend code
2. **Use HTTPS** in production (required for Apple)
3. **Verify email domains** if restricting sign-ups
4. **Implement PKCE** (Supabase does this automatically)
5. **Set appropriate token expiry** in Supabase Auth settings

---

## Additional Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Testing Apple Sign In](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js/configuring_your_webpage_for_sign_in_with_apple)
