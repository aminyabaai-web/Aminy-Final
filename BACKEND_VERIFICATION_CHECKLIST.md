# Backend Integration Verification Checklist

Use this checklist to verify all backend integrations are working correctly before launch.

## 1. Authentication (Supabase Auth)

### Email/Password Auth
- [ ] **Sign up with email**
  ```
  - Navigate to /signup
  - Enter email, password, parent name
  - Click "Create Account"
  - Expected: Success message, verification email sent
  ```
- [ ] **Email verification**
  ```
  - Check inbox for verification email
  - Click verification link
  - Expected: Redirects to app, user marked as verified
  ```
- [ ] **Login with email**
  ```
  - Navigate to /login
  - Enter email, password
  - Click "Login"
  - Expected: Redirects to dashboard, JWT in localStorage
  ```
- [ ] **Password reset**
  ```
  - Click "Forgot Password"
  - Enter email
  - Check inbox for reset link
  - Click link, enter new password
  - Expected: Password updated, can login with new password
  ```

### OAuth Auth
- [ ] **Google OAuth**
  ```
  - Click "Continue with Google"
  - Complete Google sign-in flow
  - Expected: Redirects to /auth/callback, then to dashboard
  - Check: Profile created in profiles table
  ```
- [ ] **Apple OAuth**
  ```
  - Click "Continue with Apple"
  - Complete Apple sign-in flow
  - Expected: Redirects to /auth/callback, then to dashboard
  - Check: Profile created in profiles table
  ```

### Session Management
- [ ] **Session persistence**
  ```
  - Login, refresh page
  - Expected: Still logged in, no re-auth required
  ```
- [ ] **Logout**
  ```
  - Click logout button
  - Expected: Session cleared, redirected to login
  ```

---

## 2. Payments (Stripe)

### Subscription Checkout
- [ ] **Create checkout session**
  ```
  - Click "Upgrade" on any tier
  - Expected: Stripe Checkout opens with correct price
  ```
- [ ] **Complete test payment**
  ```
  - Use test card: 4242 4242 4242 4242
  - Any future expiry, any CVC
  - Expected: Success page, redirect to app
  ```
- [ ] **Webhook fires correctly**
  ```
  - Check Supabase Edge Function logs
  - Expected: checkout.session.completed event received
  - Check: User tier updated in profiles table
  ```

### Subscription Management
- [ ] **Customer portal access**
  ```
  - Click "Manage Subscription" in settings
  - Expected: Stripe Billing Portal opens
  ```
- [ ] **Cancel subscription**
  ```
  - In Billing Portal, click "Cancel"
  - Expected: cancel_at_period_end set to true
  - User keeps access until period ends
  ```
- [ ] **Resume subscription**
  ```
  - In Billing Portal, click "Resume"
  - Expected: cancel_at_period_end set to false
  ```

### Webhook Events
- [ ] **Test webhook endpoint**
  ```bash
  curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/make-server-8a022548/payments/webhook" \
    -H "Content-Type: application/json" \
    -H "Stripe-Signature: test" \
    -d '{"type":"test"}'
  # Expected: 400 (invalid signature) - confirms endpoint is reachable
  ```

---

## 3. AI Chat (Claude via Anthropic)

### Basic Chat
- [ ] **Send message, receive response**
  ```
  - Open chat from dashboard
  - Type "Hello, I need help with my child's bedtime routine"
  - Expected: Streaming response from Claude
  ```
- [ ] **Context awareness**
  ```
  - Complete onboarding with child name "Alex"
  - Send chat message "How can I help Alex today?"
  - Expected: AI references Alex by name
  ```

### Rate Limiting
- [ ] **Free tier rate limit**
  ```
  - As free user, send 10 messages
  - On 11th message:
  - Expected: Paywall shown, message not sent
  ```
- [ ] **Paid tier rate limit**
  ```
  - As Core subscriber, send 300 messages
  - Expected: All messages go through
  - On 301st: Rate limit message (but higher than free)
  ```

### Conversation Persistence
- [ ] **History loads on refresh**
  ```
  - Send 3 messages
  - Refresh page
  - Expected: Previous messages visible
  ```

---

## 4. Database (Supabase)

### Profiles Table
- [ ] **Profile auto-created on signup**
  ```sql
  SELECT * FROM profiles WHERE id = 'USER_ID';
  -- Expected: Row exists with default values
  ```
- [ ] **Profile updates correctly**
  ```
  - Update profile in app settings
  - Check database
  - Expected: Changes reflected
  ```

### Conversations Table
- [ ] **Conversations saved**
  ```sql
  SELECT * FROM conversations WHERE user_id = 'USER_ID';
  -- Expected: Rows for each conversation
  ```

### RLS Policies
- [ ] **User can only see own data**
  ```
  - Try to access another user's profile via API
  - Expected: Access denied / empty result
  ```

---

## 5. Edge Functions Health

### Health Check
- [ ] **Server is running**
  ```bash
  curl "https://YOUR_PROJECT.supabase.co/functions/v1/make-server-8a022548/health"
  # Expected: {"status":"ok","timestamp":"..."}
  ```

### Secrets Configured
- [ ] **ANTHROPIC_API_KEY** - for Claude AI
- [ ] **STRIPE_SECRET_KEY** - for Stripe payments
- [ ] **STRIPE_WEBHOOK_SECRET** - for webhook verification
- [ ] **RESEND_API_KEY** - for transactional emails (if used)

Check in Supabase Dashboard > Edge Functions > Secrets

---

## 6. Environment Variables

### Required for Production
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_VAPID_PUBLIC_KEY=BEl62... (for push notifications)
VITE_GA_MEASUREMENT_ID=G-... (optional, for analytics)
VITE_SENTRY_DSN=https://... (optional, for error tracking)
```

---

## 7. Quick Verification Commands

### Test Supabase Connection
```javascript
// In browser console on your app
const { data, error } = await supabase.auth.getSession();
console.log('Session:', data.session ? 'Active' : 'None');
```

### Test Stripe Publishable Key
```javascript
// In browser console
console.log('Stripe key:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.substring(0, 15));
// Expected: "pk_test_" or "pk_live_" prefix
```

### Test AI Endpoint
```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/make-server-8a022548/ai/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

---

## Sign-Off

| Area | Tester | Date | Pass/Fail | Notes |
|------|--------|------|-----------|-------|
| Authentication | | | | |
| Payments | | | | |
| AI Chat | | | | |
| Database | | | | |
| Edge Functions | | | | |

**Ready for Production:** [ ] Yes [ ] No

**Blockers:**
-

**Notes:**
-
