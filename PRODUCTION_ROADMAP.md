# AMINY PRODUCTION ROADMAP
## From 5.5/10 to 10/10

**Created:** January 20, 2026
**Current Score:** 5.5/10
**Target Score:** 10/10
**Estimated Effort:** 3-4 weeks focused work

---

## PHASE 1: CRITICAL SECURITY (Days 1-3)
**Goal:** Make the app safe to deploy

### 1.1 Credential Security [BLOCKING]
- [ ] **Rotate Supabase Keys**
  - Go to Supabase Dashboard → Settings → API
  - Generate new anon key and service role key
  - Update `.env.local` with new keys
  - Update Vercel environment variables

- [ ] **Rotate Stripe Keys**
  - Go to Stripe Dashboard → Developers → API Keys
  - Roll the publishable key
  - Update `.env.local` and Vercel

- [ ] **Remove .env.local from git history**
  ```bash
  git filter-branch --force --index-filter \
    "git rm --cached --ignore-unmatch .env.local" \
    --prune-empty --tag-name-filter cat -- --all
  ```

- [ ] **Add pre-commit hook to prevent secrets**
  - Install `detect-secrets` or similar
  - Add to `.husky/pre-commit`

### 1.2 Session Security [BLOCKING]
**File:** `src/App.tsx`

- [ ] **Move user data from localStorage to secure storage**
  ```typescript
  // OLD (insecure):
  localStorage.setItem("aminy-user", JSON.stringify(userData));

  // NEW: Only store session reference, fetch data from Supabase
  // Create new hook: src/hooks/useSecureSession.ts
  ```

- [ ] **Create `src/hooks/useSecureSession.ts`**
  ```typescript
  export function useSecureSession() {
    const [user, setUser] = useState(null);

    useEffect(() => {
      // Get session from Supabase (uses httpOnly cookies)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Fetch profile from database, don't store locally
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser({ ...session.user, ...profile });
      }
    }, []);

    return { user, isLoading };
  }
  ```

### 1.3 Admin Access Fix [BLOCKING]
**File:** `src/App.tsx:1101-1106`

- [ ] **Remove localStorage admin check**
  ```typescript
  // DELETE THIS:
  localStorage.getItem('dev-mode') === 'true'

  // REPLACE WITH: Server-side role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';
  ```

- [ ] **Add admin role to profiles table**
  ```sql
  -- Migration: add_admin_role.sql
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
  CREATE INDEX idx_profiles_role ON profiles(role);
  ```

### 1.4 CORS Fix [BLOCKING]
**File:** `supabase/functions/telehealth/index.ts:28-32`

- [ ] **Restrict CORS to specific domain**
  ```typescript
  // OLD:
  "Access-Control-Allow-Origin": "*"

  // NEW:
  const ALLOWED_ORIGINS = [
    'https://aminy.ai',
    'https://www.aminy.ai',
    import.meta.env.DEV ? 'http://localhost:3000' : null,
  ].filter(Boolean);

  const origin = request.headers.get('Origin');
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  "Access-Control-Allow-Origin": corsOrigin
  ```

### 1.5 Input Sanitization [BLOCKING]
- [ ] **Install DOMPurify**
  ```bash
  npm install isomorphic-dompurify
  ```

- [ ] **Create `src/lib/sanitize.ts`**
  ```typescript
  import DOMPurify from 'isomorphic-dompurify';

  export function sanitizeInput(input: string): string {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  }

  export function sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html);
  }
  ```

- [ ] **Apply to all user inputs**
  - `CreateAccountScreen.tsx` - name, email
  - `OnboardingEnhanced.tsx` - child name, parent name
  - AI prompts - all user-provided context

### 1.6 Promo Codes to Backend [BLOCKING]
**File:** `src/lib/stripe-service.ts:381-386`

- [ ] **Delete hardcoded promo codes from frontend**

- [ ] **Create promo_codes table**
  ```sql
  CREATE TABLE promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
    discount_value INTEGER NOT NULL,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- RLS: Only service role can read
  ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Service role only" ON promo_codes
    FOR ALL USING (auth.role() = 'service_role');
  ```

- [ ] **Create Edge Function to validate promo codes**
  ```typescript
  // supabase/functions/validate-promo/index.ts
  export async function validatePromoCode(code: string) {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error || !data) return { valid: false };
    if (data.expires_at && new Date(data.expires_at) < new Date()) return { valid: false };
    if (data.max_uses && data.current_uses >= data.max_uses) return { valid: false };

    return { valid: true, discount: data };
  }
  ```

---

## PHASE 2: PRODUCTION CONFIG (Days 4-5)
**Goal:** Enable monitoring and payments

### 2.1 Error Tracking [BLOCKING]
- [ ] **Create Sentry account** at https://sentry.io
- [ ] **Create new project** (React)
- [ ] **Get DSN** and add to `.env.local`:
  ```
  VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
  ```
- [ ] **Add to Vercel environment variables**
- [ ] **Test error capture**
  ```typescript
  // Temporary test in App.tsx
  useEffect(() => {
    throw new Error('Sentry test error');
  }, []);
  ```

### 2.2 Analytics [BLOCKING]
- [ ] **Create Google Analytics 4 property**
  - Go to analytics.google.com
  - Create new property
  - Get Measurement ID (G-XXXXXXXX)

- [ ] **Add to `.env.local`**:
  ```
  VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
  ```

- [ ] **Fix analytics-engine.ts to send to backend**
  ```typescript
  // Line 459-472: Replace localStorage with API call
  const response = await fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(analyticsData),
  });
  ```

### 2.3 Stripe Live Keys [BLOCKING]
- [ ] **Get live Stripe keys** from Stripe Dashboard
- [ ] **Create live price IDs** for each tier
- [ ] **Update `.env.local`** with live keys:
  ```
  VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
  VITE_STRIPE_STARTER_MONTHLY=price_xxx
  VITE_STRIPE_STARTER_YEARLY=price_xxx
  VITE_STRIPE_CORE_MONTHLY=price_xxx
  VITE_STRIPE_CORE_YEARLY=price_xxx
  VITE_STRIPE_PRO_MONTHLY=price_xxx
  VITE_STRIPE_PRO_YEARLY=price_xxx
  ```

### 2.4 Video Calls [BLOCKING]
- [ ] **Create Daily.co account** at https://daily.co
- [ ] **Create a room**
- [ ] **Get domain** and add to `.env.local`:
  ```
  VITE_DAILY_DOMAIN=aminy.daily.co
  ```

---

## PHASE 3: AI SECURITY & COST CONTROL (Days 6-8)
**Goal:** Prevent prompt injection and cost explosion

### 3.1 Prompt Injection Protection
**Files:** `src/lib/ai-conversation.ts`, `src/lib/aminy-ai-brain.ts`

- [ ] **Create prompt sanitizer**
  ```typescript
  // src/lib/ai/prompt-sanitizer.ts
  export function sanitizeForPrompt(input: string): string {
    // Remove potential injection patterns
    const dangerous = [
      /ignore (all )?(previous|above|prior) instructions/gi,
      /disregard (all )?(previous|above|prior)/gi,
      /new instructions:/gi,
      /system prompt:/gi,
      /\{\{.*\}\}/g,  // Template injection
      /<\|.*\|>/g,    // Special tokens
    ];

    let sanitized = input;
    for (const pattern of dangerous) {
      sanitized = sanitized.replace(pattern, '[REMOVED]');
    }

    // Escape special characters
    sanitized = sanitized
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');

    return sanitized.slice(0, 2000); // Max length
  }
  ```

- [ ] **Apply to all prompt interpolations**
  ```typescript
  // BEFORE:
  const prompt = `The child's name is ${context.childName}`;

  // AFTER:
  const prompt = `The child's name is ${sanitizeForPrompt(context.childName)}`;
  ```

### 3.2 Token Usage Tracking
- [ ] **Install tiktoken**
  ```bash
  npm install js-tiktoken
  ```

- [ ] **Create usage tracker**
  ```typescript
  // src/lib/ai/usage-tracker.ts
  import { encodingForModel } from 'js-tiktoken';

  const enc = encodingForModel('gpt-4');

  export function countTokens(text: string): number {
    return enc.encode(text).length;
  }

  export async function trackUsage(userId: string, tokens: number) {
    await supabase.from('ai_usage').insert({
      user_id: userId,
      tokens_used: tokens,
      timestamp: new Date().toISOString(),
    });
  }

  export async function checkQuota(userId: string, tier: string): Promise<boolean> {
    const limits = { free: 1000, starter: 10000, core: 50000, pro: 500000 };
    const limit = limits[tier] || limits.free;

    const { data } = await supabase
      .from('ai_usage')
      .select('tokens_used')
      .eq('user_id', userId)
      .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const used = data?.reduce((sum, row) => sum + row.tokens_used, 0) || 0;
    return used < limit;
  }
  ```

- [ ] **Create ai_usage table**
  ```sql
  CREATE TABLE ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    tokens_used INTEGER NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_ai_usage_user_timestamp ON ai_usage(user_id, timestamp);
  ```

### 3.3 Rate Limiting (Server-Side)
- [ ] **Create rate limiter Edge Function**
  ```typescript
  // supabase/functions/rate-limit/index.ts
  const LIMITS = {
    ai: { requests: 10, window: 60000 },      // 10 req/min
    payment: { requests: 5, window: 60000 },   // 5 req/min
    auth: { requests: 5, window: 900000 },     // 5 req/15min
  };

  export async function checkRateLimit(
    userId: string,
    type: keyof typeof LIMITS
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const key = `rate:${type}:${userId}`;
    const limit = LIMITS[type];

    // Use Redis or Supabase for distributed rate limiting
    const { data } = await supabase
      .from('rate_limits')
      .select('count, window_start')
      .eq('key', key)
      .single();

    const now = Date.now();
    if (!data || now - data.window_start > limit.window) {
      // Reset window
      await supabase.from('rate_limits').upsert({
        key,
        count: 1,
        window_start: now,
      });
      return { allowed: true };
    }

    if (data.count >= limit.requests) {
      return {
        allowed: false,
        retryAfter: Math.ceil((data.window_start + limit.window - now) / 1000)
      };
    }

    await supabase.from('rate_limits')
      .update({ count: data.count + 1 })
      .eq('key', key);

    return { allowed: true };
  }
  ```

### 3.4 AI Response Validation
- [ ] **Create response validator**
  ```typescript
  // src/lib/ai/response-validator.ts
  import { moderateContent } from '../content-moderation';

  export async function validateAIResponse(response: string): Promise<{
    valid: boolean;
    sanitized: string;
    flags: string[];
  }> {
    const flags: string[] = [];

    // Check length
    if (response.length > 10000) {
      flags.push('excessive_length');
      response = response.slice(0, 10000) + '...';
    }

    // Check for inappropriate content
    const moderation = await moderateContent(response);
    if (moderation.flagged) {
      flags.push(...moderation.categories);
      return { valid: false, sanitized: '', flags };
    }

    // Sanitize HTML if any
    const sanitized = DOMPurify.sanitize(response);

    return { valid: true, sanitized, flags };
  }
  ```

---

## PHASE 4: RLS & DATABASE SECURITY (Days 9-11)
**Goal:** Lock down data access

### 4.1 Fix stripe_customers RLS
**File:** `supabase/migrations/002_profiles_and_stripe.sql:84-88`

- [ ] **Create new migration**
  ```sql
  -- migrations/007_fix_stripe_rls.sql

  -- Drop overly permissive policies
  DROP POLICY IF EXISTS "Service role can insert stripe customers" ON stripe_customers;
  DROP POLICY IF EXISTS "Service role can update stripe customers" ON stripe_customers;

  -- Create proper policies
  CREATE POLICY "Users can view own stripe customer" ON stripe_customers
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "Service role can manage stripe customers" ON stripe_customers
    FOR ALL USING (
      current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );
  ```

### 4.2 Fix waitlist RLS
**File:** `supabase/migrations/005_waitlist.sql:40-49`

- [ ] **Create new migration**
  ```sql
  -- migrations/008_fix_waitlist_rls.sql

  DROP POLICY IF EXISTS "Allow authenticated read of waitlist" ON waitlist;
  DROP POLICY IF EXISTS "Allow authenticated update of waitlist" ON waitlist;

  -- Users can only see their own entry
  CREATE POLICY "Users can view own waitlist entry" ON waitlist
    FOR SELECT USING (auth.uid() = user_id);

  -- Only service role can modify
  CREATE POLICY "Service role can manage waitlist" ON waitlist
    FOR ALL USING (
      current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );
  ```

### 4.3 Fix messages RLS
- [ ] **Create new migration**
  ```sql
  -- migrations/009_fix_messages_rls.sql

  DROP POLICY IF EXISTS "Service role can manage messages" ON messages;

  -- Users can only see their own messages
  CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert own messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  -- Service role for AI responses
  CREATE POLICY "Service role can insert AI messages" ON messages
    FOR INSERT WITH CHECK (
      current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );
  ```

### 4.4 Add Missing DELETE Policies
- [ ] **Create new migration**
  ```sql
  -- migrations/010_add_delete_policies.sql

  -- Allow users to delete their own conversations
  CREATE POLICY "Users can delete own conversations" ON conversations
    FOR DELETE USING (auth.uid() = user_id);

  -- Allow users to delete their own messages
  CREATE POLICY "Users can delete own messages" ON messages
    FOR DELETE USING (auth.uid() = user_id);

  -- Allow users to delete their own appointments
  CREATE POLICY "Users can delete own appointments" ON appointments
    FOR DELETE USING (auth.uid() = user_id);
  ```

### 4.5 Add User ID Verification to Edge Functions
**File:** `supabase/functions/telehealth/index.ts`

- [ ] **Add user verification to all queries**
  ```typescript
  // BEFORE (dangerous):
  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .single();

  // AFTER (safe):
  const userId = await getUserIdFromToken(req);
  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .eq("user_id", userId)  // Add this check!
    .single();
  ```

---

## PHASE 5: FRONTEND QUALITY (Days 12-16)
**Goal:** Fix TypeScript, accessibility, and UX issues

### 5.1 Type Safety (198 `any` types)
- [ ] **Run audit to find all `any` types**
  ```bash
  grep -rn ": any" src/ --include="*.ts" --include="*.tsx" | wc -l
  ```

- [ ] **Create proper types for common patterns**
  ```typescript
  // src/types/index.ts

  export interface UserData {
    id: string;
    email: string;
    parentName: string;
    childName: string;
    childId?: string;
    relationship: string;
    state: string;
    tier: TierType;
    role: 'user' | 'provider' | 'admin';
    hasCompletedOnboarding: boolean;
  }

  export interface OnboardingData {
    parentName: string;
    childName: string;
    childAge: number;
    diagnosis?: string;
    communicationLevel?: string;
    focusAreas: string[];
    goals: string[];
    tone: 'supportive' | 'direct' | 'playful';
  }

  export interface AIContext {
    childName: string;
    childAge: number;
    diagnosis?: string;
    recentMessages: Message[];
    parentCapacity?: number;
  }

  // ... more types
  ```

- [ ] **Fix high-priority files first**
  - `src/lib/provider-service.ts` (16 any)
  - `src/components/MissingFunctionalityEnhancer.tsx` (15 any)
  - `src/components/AnalyticsDashboard.tsx` (12 any)

### 5.2 Form Validation
**Files:** `CreateAccountScreen.tsx`, `LoginScreen.tsx`

- [ ] **Add real-time validation**
  ```typescript
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = useCallback((email: string) => {
    if (!email) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }));
    } else if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email' }));
    } else {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  }, []);

  return (
    <input
      type="email"
      value={email}
      onChange={(e) => {
        setEmail(e.target.value);
        validateEmail(e.target.value);
      }}
      onBlur={() => validateEmail(email)}
    />
  );
  ```

- [ ] **Add password strength indicator**
  ```typescript
  function getPasswordStrength(password: string): {
    score: number;
    feedback: string;
  } {
    let score = 0;
    const feedback: string[] = [];

    if (password.length >= 8) score++;
    else feedback.push('At least 8 characters');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('One uppercase letter');

    if (/[a-z]/.test(password)) score++;
    else feedback.push('One lowercase letter');

    if (/[0-9]/.test(password)) score++;
    else feedback.push('One number');

    if (/[^A-Za-z0-9]/.test(password)) score++;
    else feedback.push('One special character');

    return { score, feedback: feedback.join(', ') };
  }
  ```

### 5.3 Accessibility (ARIA Labels)
- [ ] **Audit all interactive elements**
  ```bash
  grep -rn "onClick=" src/components/ --include="*.tsx" | head -50
  ```

- [ ] **Add ARIA labels to buttons without text**
  ```typescript
  // BEFORE:
  <button onClick={handleClose}>
    <X className="w-5 h-5" />
  </button>

  // AFTER:
  <button
    onClick={handleClose}
    aria-label="Close dialog"
  >
    <X className="w-5 h-5" />
  </button>
  ```

- [ ] **Add focus management for modals**
  ```typescript
  useEffect(() => {
    if (isOpen) {
      // Store current focus
      previousFocus.current = document.activeElement;
      // Focus first focusable element in modal
      modalRef.current?.querySelector('button, [href], input')?.focus();
    } else {
      // Restore focus when closed
      previousFocus.current?.focus();
    }
  }, [isOpen]);
  ```

### 5.4 Fix Payment Race Condition
**File:** `src/App.tsx:409-427`

- [ ] **Rewrite payment confirmation effect**
  ```typescript
  // BEFORE (race condition):
  useEffect(() => {
    const paymentStatus = getPaymentStatusFromUrl();
    if (paymentStatus.isPaymentReturn && paymentStatus.success) {
      setShowPaymentConfirmation(true);
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.id) {
          setPaymentUserId(user.id);
        }
      });
    }
  }, []);

  // AFTER (fixed):
  useEffect(() => {
    const checkPaymentStatus = async () => {
      const paymentStatus = getPaymentStatusFromUrl();
      if (!paymentStatus.isPaymentReturn) return;

      if (paymentStatus.cancelled) {
        toast.info('Payment cancelled. You can try again anytime.');
        clearPaymentParamsFromUrl();
        return;
      }

      if (paymentStatus.success) {
        // Get user first
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
          toast.error('Please sign in to complete payment verification');
          return;
        }

        // Set both states together
        setPaymentUserId(user.id);
        setShowPaymentConfirmation(true);
      }
    };

    checkPaymentStatus();
  }, []);
  ```

### 5.5 Fix Video Room Memory Leak
**File:** `src/components/telehealth/VideoRoom.tsx`

- [ ] **Add proper cleanup**
  ```typescript
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (callObjectRef.current) {
        callObjectRef.current.leave().catch(console.error);
        callObjectRef.current.destroy().catch(console.error);
        callObjectRef.current = null;
      }
    };
  }, []);
  ```

### 5.6 Remove Console Logs
- [ ] **Find all console statements**
  ```bash
  grep -rn "console\." src/ --include="*.ts" --include="*.tsx" | wc -l
  ```

- [ ] **Replace with proper logging**
  ```typescript
  // src/lib/logger.ts
  const isDev = import.meta.env.DEV;

  export const logger = {
    debug: (...args: any[]) => isDev && console.debug(...args),
    info: (...args: any[]) => isDev && console.info(...args),
    warn: (...args: any[]) => console.warn(...args),
    error: (...args: any[]) => {
      console.error(...args);
      // Also send to Sentry in production
      if (!isDev) {
        Sentry.captureException(args[0]);
      }
    },
  };
  ```

- [ ] **Replace all console.log with logger.debug**

---

## PHASE 6: COMPONENT CLEANUP (Days 17-20)
**Goal:** Reduce technical debt

### 6.1 Break Down Large Components
**Target:** Components over 500 lines

| Component | Lines | Action |
|-----------|-------|--------|
| OnboardingFlowNormalized.tsx | 4159 | Split into 8-10 step components |
| PlanTabEnhanced.tsx | 3034 | Split into PlanHeader, PlanList, PlanItem |
| JuniorPageEnhanced.tsx | 2240 | Split into JuniorNav, JuniorContent, JuniorGame |
| JuniorPage.tsx | 1946 | Merge with JuniorPageEnhanced |
| JuniorPageEnhancedPro.tsx | 1886 | Consolidate Junior variants |

- [ ] **Create shared Junior component**
  ```typescript
  // src/components/Junior/index.tsx
  export function JuniorPage({ variant = 'standard' }) {
    return (
      <JuniorProvider>
        <JuniorNav />
        <JuniorContent variant={variant} />
        <JuniorFooter />
      </JuniorProvider>
    );
  }
  ```

### 6.2 Consolidate Duplicate Components
- [ ] **Merge RecordsVault variants**
  - Keep: `RecordsVault.tsx`
  - Delete: `RecordsVaultComplete.tsx`, `RecordsVaultEnhanced.tsx`, `RecordsVaultClean.tsx`

- [ ] **Merge Onboarding variants**
  - Keep: `OnboardingEnhanced.tsx`
  - Delete: `OnboardingFlow.tsx`, `OnboardingFlow5Steps.tsx`, `OnboardingFlowUpdated.tsx`, `OnboardingFlowNormalized.tsx`

### 6.3 Complete TODO Items
- [ ] **Fix member check**
  ```typescript
  // File: src/components/telehealth/AppointmentConfirmation.tsx:84
  // BEFORE:
  const isMember = true; // TODO: Get from user context

  // AFTER:
  const { user } = useSecureSession();
  const isMember = user?.tier !== 'free';
  ```

- [ ] **Implement referral system**
  ```typescript
  // File: src/components/OnboardingEnhanced.tsx:356
  // Create: src/components/ReferralModal.tsx
  export function ReferralModal({ isOpen, onClose }) {
    const { user } = useSecureSession();
    const referralCode = `AMINY-${user?.id?.slice(0, 8).toUpperCase()}`;

    const handleShare = async () => {
      await navigator.share({
        title: 'Join Aminy',
        text: `Get support for your neurodivergent child with Aminy! Use my code: ${referralCode}`,
        url: `https://aminy.ai/signup?ref=${referralCode}`,
      });
    };

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        {/* ... */}
      </Dialog>
    );
  }
  ```

---

## PHASE 7: FINAL POLISH (Days 21-24)
**Goal:** Production-ready quality

### 7.1 Pin Dependencies
**File:** `package.json`

- [ ] **Replace wildcards with specific versions**
  ```json
  {
    "dependencies": {
      "clsx": "2.1.0",
      "hono": "4.1.0",
      "motion": "11.0.0",
      "zustand": "4.5.0"
    }
  }
  ```

### 7.2 Clean Up Vite Config
**File:** `vite.config.ts:73-117`

- [ ] **Remove redundant aliases**
  ```typescript
  // Keep only essential aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@lib': path.resolve(__dirname, './src/lib'),
    },
  },
  ```

### 7.3 Add Open Graph Tags
**File:** `index.html`

- [ ] **Add social sharing meta tags**
  ```html
  <!-- Open Graph -->
  <meta property="og:title" content="Aminy - ABA Support for Your Family" />
  <meta property="og:description" content="Your AI companion for supporting your neurodivergent child" />
  <meta property="og:image" content="https://aminy.ai/og-image.png" />
  <meta property="og:url" content="https://aminy.ai" />
  <meta property="og:type" content="website" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Aminy - ABA Support for Your Family" />
  <meta name="twitter:description" content="Your AI companion for supporting your neurodivergent child" />
  <meta name="twitter:image" content="https://aminy.ai/og-image.png" />
  ```

### 7.4 Enable Strict TypeScript
**File:** `tsconfig.json`

- [ ] **Enable unused code warnings**
  ```json
  {
    "compilerOptions": {
      "noUnusedLocals": true,
      "noUnusedParameters": true
    }
  }
  ```

- [ ] **Fix all resulting errors**

### 7.5 Implement IndexedDB for Offline
**File:** `src/service-worker.js:389-407`

- [ ] **Complete IndexedDB implementation**
  ```javascript
  const DB_NAME = 'aminy-offline';
  const DB_VERSION = 1;

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('queued-messages')) {
          db.createObjectStore('queued-messages', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('queued-reports')) {
          db.createObjectStore('queued-reports', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  async function getQueuedMessages() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('queued-messages', 'readonly');
      const store = tx.objectStore('queued-messages');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  ```

---

## PHASE 8: TESTING & LAUNCH (Days 25-28)
**Goal:** Validate everything works

### 8.1 Security Testing
- [ ] **Run OWASP ZAP scan**
- [ ] **Test all RLS policies manually**
- [ ] **Verify rate limiting works**
- [ ] **Test promo code validation**
- [ ] **Verify admin access is restricted**

### 8.2 Performance Testing
- [ ] **Run Lighthouse audit** (target: 90+ all categories)
- [ ] **Test on slow 3G network**
- [ ] **Verify service worker caching**
- [ ] **Check bundle size hasn't regressed**

### 8.3 Functional Testing
- [ ] **Full onboarding flow**
- [ ] **Payment flow (test mode)**
- [ ] **AI conversation**
- [ ] **Video call connection**
- [ ] **Offline functionality**

### 8.4 Cross-Browser Testing
- [ ] **Chrome (latest)**
- [ ] **Safari (latest)**
- [ ] **Firefox (latest)**
- [ ] **Mobile Safari (iOS)**
- [ ] **Chrome Android**

### 8.5 Launch Checklist
- [ ] All environment variables set in Vercel
- [ ] DNS configured for aminy.ai
- [ ] SSL certificate active
- [ ] Sentry receiving errors
- [ ] Google Analytics receiving events
- [ ] Stripe webhooks configured
- [ ] Daily.co rooms created
- [ ] Support email configured
- [ ] Privacy policy published
- [ ] Terms of service published

---

## TRACKING PROGRESS

### Daily Standup Template
```
Date: ____
Phase: ____
Completed:
-
-
Blocked:
-
Next:
-
```

### Weekly Review Template
```
Week: ____
Score Progress: __/10 → __/10
Phases Completed:
-
Remaining Blockers:
-
Revised Timeline:
-
```

---

## SUCCESS CRITERIA

| Metric | Current | Target |
|--------|---------|--------|
| Security Score | 3/10 | 10/10 |
| Frontend Score | 6/10 | 10/10 |
| Backend Score | 5/10 | 10/10 |
| AI Score | 4/10 | 10/10 |
| Production Score | 4/10 | 10/10 |
| Performance Score | 8/10 | 10/10 |
| **Overall** | **5.5/10** | **10/10** |

---

**Document Owner:** Development Team
**Last Updated:** January 20, 2026
**Next Review:** After Phase 1 completion
