# Aminy Phase 2 - Deployment Guide

## 🚀 **Pre-Deployment Checklist**

### **1. Environment Variables**

Ensure all required environment variables are set in Supabase:

```bash
# Already provided by user:
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_DB_URL=postgresql://...

# Additional for Phase 2:
RESEND_API_KEY=re_...  # For email digests
STRIPE_SECRET_KEY=sk_test_...  # For shop checkout
VAPID_PUBLIC_KEY=...  # For push notifications
VAPID_PRIVATE_KEY=...  # For push notifications
```

### **2. Database Setup**

The app uses Supabase's KV store. No additional tables needed for Phase 2.

**Verify KV store is accessible:**
```typescript
import * as kv from './supabase/functions/server/kv_store.tsx';

// Test
await kv.set('test_key', 'test_value');
const value = await kv.get('test_key');
console.log(value); // Should print: test_value
```

---

## 📦 **Deployment Steps**

### **Step 1: Deploy Supabase Functions**

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions
supabase functions deploy
```

**Functions to deploy:**
- `/supabase/functions/server/index.tsx` - Main API server
- `/supabase/functions/emailDigest.ts` - Weekly email cron job

### **Step 2: Set Up Cron Jobs**

**In Supabase Dashboard:**

1. Go to **Database → Cron Jobs**
2. Create new job:

**Weekly Email Digest:**
```sql
SELECT cron.schedule(
  'weekly-email-digest',
  '0 20 * * 0',  -- Sundays at 8pm
  $$
  SELECT net.http_post(
    'https://YOUR_PROJECT_ID.supabase.co/functions/v1/emailDigest',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

**Memory Expiration (daily at 2am):**
```sql
SELECT cron.schedule(
  'expire-old-memory',
  '0 2 * * *',
  $$
  DELETE FROM kv_store_8a022548
  WHERE key LIKE 'conversation_context:%'
  AND created_at < NOW() - INTERVAL '30 days';
  $$
);
```

**Coverage Report Auto-Delete (daily at 3am):**
```sql
SELECT cron.schedule(
  'delete-expired-reports',
  '0 3 * * *',
  $$
  DELETE FROM kv_store_8a022548
  WHERE key LIKE 'coverage_report:%'
  AND (data->>'expiresAt')::timestamp < NOW();
  $$
);
```

### **Step 3: Build Frontend**

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Preview build locally
npm run preview
```

### **Step 4: Deploy Frontend**

**Option A: Vercel (Recommended)**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Option B: Netlify**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

### **Step 5: Configure Service Worker**

**Update VAPID keys in service worker:**

1. Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

2. Add to environment variables in Vercel/Netlify

3. Update service worker registration:
```javascript
// In App.tsx
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('SW registered:', registration);
      });
  }
}, []);
```

---

## 🧪 **Testing Checklist**

### **Production Environment Tests**

✅ **1. Aminy Jr Data Loop**
```bash
# Test flow:
1. Start Speech Buddy session
2. Verify STT works
3. Check Calm Coins sync to Supabase
4. Confirm parent summary appears on Dashboard
5. Test success chime plays
```

✅ **2. Shop Checkout**
```bash
# Test flow:
1. Browse shop items
2. Click "Buy Now"
3. Verify parent approval modal
4. Test Stripe checkout (test mode)
5. Confirm Calm Coins deduction
6. Check receipt in /user/purchases
```

✅ **3. Hub Moderation**
```bash
# Test flow:
1. Try posting with profanity → Should filter
2. Try posting with email → Should redact
3. Like a post → Counter increments
4. Save for later → Appears in saved tab
```

✅ **4. Coverage Coach**
```bash
# Test flow:
1. Complete chat flow
2. Generate report
3. Download PDF on iPhone Safari
4. Email report → Check inbox
5. Edit details → Regenerate report
6. Wait 7 days → Auto-delete (test with mock date)
```

✅ **5. Push Notifications**
```bash
# Test flow:
1. Grant permission → Opt-in modal
2. Trigger morning cue (8am)
3. Check notification appears
4. Go offline → Notifications cached
5. Come back online → Syncs from cache
```

✅ **6. Email Digest**
```bash
# Test flow:
1. Enable weekly digest in preferences
2. Wait for Sunday 8pm (or trigger manually)
3. Check email inbox
4. Verify all 3 sections present
5. Click unsubscribe → Preference updated
```

---

## 📊 **Analytics Setup**

### **Enable Event Tracking**

**In App.tsx, add:**
```typescript
import { trackEvent } from './lib/analytics-engine';

// Track Aminy Jr session
trackEvent('aminyjr_session_start', {
  activity: 'speech-buddy',
  childId: userData.childId
});

// Track shop purchase
trackEvent('shop_purchase_complete', {
  itemId: 'morning-calm-kit',
  amount: 45,
  paymentMethod: 'coins'
});

// Track hub post
trackEvent('hub_post_created', {
  userId: userData.parentId,
  postLength: 150
});

// Track coverage report
trackEvent('coverage_report_sent', {
  provider: 'Blue Cross',
  state: 'CA'
});

// Track notification opened
trackEvent('notification_opened', {
  type: 'morning-cue',
  timestamp: new Date().toISOString()
});
```

### **View Analytics Dashboard**

Navigate to: `/admin/analytics` (requires admin role)

---

## 🔒 **Security Hardening**

### **1. API Rate Limiting**

Add to server endpoints:
```typescript
import { RateLimiter } from 'npm:limiter';

const limiter = new RateLimiter({ tokensPerInterval: 10, interval: 'minute' });

app.post('/api/sensitive-endpoint', async (c) => {
  if (!await limiter.removeTokens(1)) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }
  // Process request
});
```

### **2. Content Security Policy**

Add to `index.html`:
```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; 
           script-src 'self' 'unsafe-inline' https://js.stripe.com; 
           style-src 'self' 'unsafe-inline'; 
           img-src 'self' data: https://images.unsplash.com; 
           connect-src 'self' https://*.supabase.co;">
```

### **3. CORS Configuration**

Already configured in server/index.tsx:
```typescript
app.use('/*', cors({
  origin: 'https://app.aminy.ai',  // Update to production domain
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
```

---

## 📱 **App Store Submission**

### **TestFlight Beta**

1. **Create App in App Store Connect**
   - Name: Aminy
   - Subtitle: Behavioral Wellness Powered by AI
   - Category: Health & Fitness
   - Content Rights: 4+

2. **Upload Build**
```bash
# Using Xcode (if native wrapper)
xcode-select --install
fastlane beta

# OR using Capacitor
npm install @capacitor/cli
npx cap add ios
npx cap copy
npx cap open ios
# Then archive and upload via Xcode
```

3. **Add Screenshots**
   - Use 5 screenshots from `/PHASE_2_COMPLETE_FINAL.md`
   - Upload to App Store Connect
   - Add localized descriptions

4. **Submit for Review**
   - Beta App Description: "Early access to Aminy's behavioral wellness platform"
   - What to Test: "All core features including Aminy Jr, Shop, Hub, and Coverage Coach"
   - Feedback Email: beta@aminy.ai

### **Production Release**

After successful beta (2-4 weeks):

1. Update version number
2. Add production analytics
3. Enable production Stripe keys
4. Submit for App Review
5. Prepare launch marketing

---

## 🐛 **Monitoring & Error Tracking**

### **Set Up Sentry**

```bash
npm install @sentry/react @sentry/tracing
```

```typescript
// In main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: 'production',
  tracesSampleRate: 0.1
});
```

### **Set Up LogRocket**

```bash
npm install logrocket
```

```typescript
// In main.tsx
import LogRocket from 'logrocket';

LogRocket.init('YOUR_LOGROCKET_ID');
```

---

## 📞 **Support & Feedback**

### **Beta Feedback Collection**

1. **In-App Feedback Button**
   - Located in Settings → Help & Feedback
   - Sends to: beta@aminy.ai
   - Includes: User ID, Screen, Device info

2. **Weekly Survey**
   - Email sent to all beta users Friday 6pm
   - 3 questions: What worked? What didn't? What's missing?
   - Responses tracked in Supabase

3. **Analytics Review**
   - Weekly review of Dashboard metrics
   - Look for: Drop-off points, popular features, error rates
   - Iterate based on data

---

## 🎯 **Success Metrics**

### **Week 1 Targets**

- ✅ 50 beta sign-ups
- ✅ 80% onboarding completion
- ✅ 30% Aminy Jr engagement
- ✅ 10 shop purchases
- ✅ 20 hub posts

### **Month 1 Targets**

- ✅ 500 total users
- ✅ 75% 7-day retention
- ✅ 100 Calm Coins avg per user
- ✅ 50 coverage reports generated
- ✅ 4.5+ App Store rating

---

## 🚨 **Rollback Plan**

If critical issues are found:

1. **Revert to Previous Version**
```bash
git revert HEAD
vercel --prod
```

2. **Disable New Features**
```typescript
// In feature-flags.ts
export const FEATURE_FLAGS = {
  aminyJr: false,
  shop: false,
  hub: false,
  coverageCoach: false
};
```

3. **Notify Users**
   - Email: "We're experiencing technical difficulties"
   - In-app banner: "Some features temporarily unavailable"
   - ETA for fix

---

## ✅ **Post-Deployment Checklist**

- [ ] All Supabase functions deployed
- [ ] Cron jobs scheduled
- [ ] Frontend deployed to Vercel/Netlify
- [ ] Service Worker registered
- [ ] VAPID keys configured
- [ ] Stripe webhook configured
- [ ] Email service (Resend) active
- [ ] Analytics tracking enabled
- [ ] Error monitoring (Sentry) active
- [ ] Beta users invited (10 families)
- [ ] TestFlight build submitted
- [ ] Support email monitored
- [ ] Weekly feedback survey scheduled
- [ ] Marketing assets uploaded to App Store Connect

---

## 🎉 **Launch Day**

**Morning (9am):**
- [ ] Final smoke test all features
- [ ] Verify all endpoints responding
- [ ] Check analytics dashboard loading

**Midday (12pm):**
- [ ] Send beta invite emails
- [ ] Post announcement on social media
- [ ] Monitor error logs

**Evening (6pm):**
- [ ] Review first analytics
- [ ] Respond to early feedback
- [ ] Plan iteration sprint

**Week 1:**
- [ ] Daily check-ins with beta users
- [ ] Fix critical bugs within 24h
- [ ] Weekly feature iteration

---

## 📚 **Documentation Links**

- [Supabase Docs](https://supabase.com/docs)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web Push Protocol](https://web.dev/push-notifications/)
- [Stripe Checkout](https://stripe.com/docs/checkout)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)

---

**Version:** 1.0.0  
**Last Updated:** 2024-10-27  
**Status:** Ready for Production Deployment  
**Next Review:** 2024-11-03 (Week 1 post-launch)

**Built with ❤️ by the Aminy Team**
