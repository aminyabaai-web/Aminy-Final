# AMINY 10/10 MASTER IMPLEMENTATION PLAN

## Executive Summary

**Current State:** 6.2/10 average across all areas
**Target State:** 10/10 across all areas
**Timeline:** 6-8 weeks to production-ready
**Investment:** ~$2,000-5,000/month in API costs + development time

---

## FORTA COMPETITIVE ANALYSIS

### What Forta Offers at $99/month:
- **Real AI-powered behavior analysis** - Uses GPT-4/Claude to analyze session data
- **Licensed BCBAs** on staff providing telehealth ABA
- **Insurance billing** - They handle the paperwork
- **Parent coaching** with AI follow-ups
- **Session recordings** with AI-generated summaries
- **Progress tracking** with real data visualization

### Why Forta is Vulnerable:
1. **$99/month is expensive** for families who just need guidance
2. **Waitlists still exist** even with their scale
3. **No Medicaid waiver support** - they focus on commercial insurance
4. **No self-directed caregiver tools** - they ARE the provider
5. **No community** - isolated experience

### Aminy's Winning Position:
> **"We're the 24/7 support your BCBA can't provide, the documentation help they don't have time for, and the parent coaching that happens between sessions - at 1/7th the cost."**

---

## PHASE 1: FOUNDATION (Week 1-2)
### Priority: Replace All Fake/Mock Implementations

### 1.1 REAL AI INTEGRATION
**Current:** Template responses with fake delays
**Target:** Real Claude API with memory

```
Implementation:
├── src/lib/ai-engine/
│   ├── claude-client.ts      # Anthropic SDK integration
│   ├── conversation-memory.ts # Supabase-backed memory
│   ├── context-builder.ts    # Child profile + history context
│   ├── safety-filters.ts     # Content moderation
│   └── response-formatter.ts  # Streaming + formatting
```

**Technical Approach:**
```typescript
// claude-client.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateResponse(
  userMessage: string,
  conversationHistory: Message[],
  childContext: ChildProfile,
  parentContext: ParentProfile
): Promise<AsyncGenerator<string>> {
  const systemPrompt = buildSystemPrompt(childContext, parentContext);

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: conversationHistory.map(m => ({
      role: m.role,
      content: m.content
    })),
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta') {
      yield chunk.delta.text;
    }
  }
}
```

**System Prompt Engineering:**
```typescript
function buildSystemPrompt(child: ChildProfile, parent: ParentProfile): string {
  return `You are Aminy, an AI companion that combines the expertise of:
- A developmental pediatrician who's seen 10,000 cases
- A BCBA with 20 years of experience
- A parent who's been through this journey
- A trusted friend who never judges

CHILD CONTEXT:
- Name: ${child.name}
- Age: ${child.age} years old
- Diagnoses: ${child.diagnoses.join(', ') || 'None specified'}
- Current goals: ${child.goals.map(g => g.name).join(', ')}
- Recent progress: ${child.recentProgress}

PARENT CONTEXT:
- Current stress level: ${parent.stressLevel}/10
- Available support: ${parent.supportLevel}
- Preferred communication style: ${parent.communicationStyle}

CONVERSATION RULES:
1. Always validate feelings first, then offer practical guidance
2. Use the child's name naturally
3. Reference their specific goals when relevant
4. Provide ABA-informed strategies without jargon
5. If parent seems overwhelmed, offer one small win instead of a plan
6. Never diagnose or prescribe - suggest consulting their BCBA/pediatrician
7. Track what strategies have been tried and their outcomes
8. Celebrate small wins enthusiastically

MEMORY INSTRUCTIONS:
- Remember everything discussed in previous conversations
- Reference past successes ("Remember when X worked for Y?")
- Track patterns ("I've noticed you often ask about mornings...")
- Build on what's working, pivot from what isn't`;
}
```

**Estimated Cost:** $0.003/message × 50 messages/user/month × 1000 users = $150/month
**With Haiku for simple queries:** ~$50/month

---

### 1.2 REAL MEMORY SYSTEM
**Current:** LocalStorage only, no persistence
**Target:** Supabase-backed with semantic search

```sql
-- Supabase schema for conversation memory
CREATE TABLE conversation_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  child_id UUID REFERENCES children(id),

  -- Core memory
  memory_type TEXT CHECK (memory_type IN ('fact', 'strategy', 'outcome', 'preference', 'concern')),
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- For semantic search

  -- Context
  source_conversation_id UUID,
  source_message_id UUID,
  confidence FLOAT DEFAULT 1.0,

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_referenced_at TIMESTAMPTZ,
  reference_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  tags TEXT[],
  related_goals UUID[]
);

-- Index for fast semantic search
CREATE INDEX memories_embedding_idx ON conversation_memories
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function to find relevant memories
CREATE OR REPLACE FUNCTION find_relevant_memories(
  p_user_id UUID,
  p_child_id UUID,
  p_query_embedding VECTOR(1536),
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  memory_type TEXT,
  content TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id,
    cm.memory_type,
    cm.content,
    1 - (cm.embedding <=> p_query_embedding) as similarity
  FROM conversation_memories cm
  WHERE cm.user_id = p_user_id
    AND cm.child_id = p_child_id
    AND cm.is_active = TRUE
  ORDER BY cm.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

**Memory Extraction Pipeline:**
```typescript
// After each conversation turn, extract memories
async function extractMemories(
  conversation: Message[],
  childId: string
): Promise<Memory[]> {
  const extractionPrompt = `Analyze this conversation and extract key memories:

CONVERSATION:
${conversation.map(m => `${m.role}: ${m.content}`).join('\n')}

Extract any of these memory types:
- FACT: Information about the child (likes, dislikes, triggers, etc.)
- STRATEGY: Techniques discussed or recommended
- OUTCOME: Results of trying a strategy (worked/didn't work)
- PREFERENCE: Parent's communication preferences
- CONCERN: Ongoing worries or challenges

Return as JSON array:
[{ "type": "...", "content": "...", "confidence": 0-1 }]`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307', // Fast & cheap for extraction
    max_tokens: 500,
    messages: [{ role: 'user', content: extractionPrompt }]
  });

  return JSON.parse(response.content[0].text);
}
```

---

### 1.3 REAL RETENTION SYSTEM
**Current:** Toast notifications that don't persist
**Target:** Multi-channel engagement engine

```
Implementation:
├── src/lib/retention/
│   ├── push-notifications.ts  # Web Push API
│   ├── email-sequences.ts     # Resend/SendGrid
│   ├── streak-engine.ts       # Gamification
│   ├── nudge-scheduler.ts     # Smart timing
│   └── engagement-scorer.ts   # Churn prediction
```

**Push Notification Setup:**
```typescript
// push-notifications.ts
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:support@aminyapp.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface SmartNudge {
  type: 'morning_routine' | 'check_in' | 'win_celebration' | 'strategy_reminder';
  title: string;
  body: string;
  data: Record<string, any>;
  scheduledFor: Date;
}

async function scheduleSmartNudge(
  userId: string,
  childId: string
): Promise<SmartNudge> {
  // Get user's activity patterns
  const patterns = await getUserActivityPatterns(userId);

  // Get current goals and progress
  const goals = await getActiveGoals(childId);

  // Determine best nudge type and timing
  const nudge = await determineOptimalNudge(patterns, goals);

  // Schedule via Supabase edge function
  await supabase.from('scheduled_nudges').insert({
    user_id: userId,
    nudge_type: nudge.type,
    payload: nudge,
    scheduled_for: nudge.scheduledFor,
    status: 'pending'
  });

  return nudge;
}

// Nudge content examples
const NUDGE_TEMPLATES = {
  morning_routine: {
    title: "Good morning! 🌅",
    body: "Ready to tackle {childName}'s morning routine? Aminy has a tip.",
  },
  check_in: {
    title: "How did it go?",
    body: "You tried the visual timer yesterday. Quick check-in?",
  },
  win_celebration: {
    title: "🎉 Milestone reached!",
    body: "{childName} hit 5 days in a row on morning routines!",
  },
  strategy_reminder: {
    title: "Strategy reminder",
    body: "Remember: First-then boards work best when {childName} chooses the 'then'",
  }
};
```

**Email Nurture Sequences:**
```typescript
// email-sequences.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_SEQUENCES = {
  onboarding: [
    { day: 0, template: 'welcome', subject: "Welcome to Aminy, {parentName}" },
    { day: 1, template: 'first_strategy', subject: "Your first ABA strategy for {childName}" },
    { day: 3, template: 'how_is_it_going', subject: "How's {childName} doing?" },
    { day: 7, template: 'week_one_wins', subject: "Your Week 1 Progress Report 📊" },
    { day: 14, template: 'upgrade_prompt', subject: "Ready to unlock more for {childName}?" },
  ],

  re_engagement: [
    { day: 3, template: 'miss_you', subject: "We miss {childName}! 💙" },
    { day: 7, template: 'new_features', subject: "New strategies added for {concern}" },
    { day: 14, template: 'success_story', subject: "How a family like yours saw progress" },
  ],

  weekly_digest: {
    template: 'weekly_progress',
    subject: "{childName}'s Weekly Progress Report",
    sendDay: 'sunday',
    sendHour: 9,
  }
};

async function sendWeeklyDigest(userId: string, childId: string) {
  const progress = await getWeeklyProgress(childId);
  const insights = await generateProgressInsights(progress);

  await resend.emails.send({
    from: 'Aminy <progress@aminyapp.com>',
    to: [await getUserEmail(userId)],
    subject: `${progress.childName}'s Weekly Progress Report`,
    react: WeeklyDigestEmail({ progress, insights }),
  });
}
```

**Streak & Gamification:**
```typescript
// streak-engine.ts
interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  milestones: Milestone[];
}

const STREAK_MILESTONES = [
  { days: 3, badge: 'starter', reward: 'Unlock: Sensory tools pack' },
  { days: 7, badge: 'committed', reward: '1 free BCBA Q&A session' },
  { days: 14, badge: 'consistent', reward: 'Unlock: Advanced strategies' },
  { days: 30, badge: 'champion', reward: '1 month Pro free' },
  { days: 60, badge: 'master', reward: 'Free family coaching session' },
];

async function updateStreak(userId: string, childId: string): Promise<StreakUpdate> {
  const streak = await getCurrentStreak(userId, childId);
  const today = new Date().toISOString().split('T')[0];

  if (streak.lastActivityDate === today) {
    return { changed: false, streak };
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const newStreak = streak.lastActivityDate === yesterday
    ? streak.currentStreak + 1
    : 1;

  // Check for milestone
  const milestone = STREAK_MILESTONES.find(m => m.days === newStreak);

  if (milestone) {
    await grantMilestoneReward(userId, milestone);
    await sendMilestoneNotification(userId, milestone);
  }

  return {
    changed: true,
    streak: {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, streak.longestStreak),
      lastActivityDate: today,
      newMilestone: milestone,
    }
  };
}
```

---

## PHASE 2: PROVIDER & CLINICAL (Week 3-4)

### 2.1 PROVIDER CREDENTIAL VERIFICATION
**Current:** Anyone can claim to be a BCBA
**Target:** BACB credential lookup + background check

```typescript
// credential-verification.ts
interface CredentialVerification {
  bacbNumber: string;
  fullName: string;
  credentialType: 'BCBA' | 'BCaBA' | 'RBT';
  status: 'active' | 'inactive' | 'revoked';
  expirationDate: string;
  state: string;
  verifiedAt: string;
}

// BACB doesn't have a public API, but we can:
// 1. Use their public registry search
// 2. Require providers to upload their certificate
// 3. Manual verification for initial batch

async function verifyBACBCredential(
  bacbNumber: string,
  fullName: string
): Promise<CredentialVerification | null> {
  // Option 1: Scrape BACB registry (with their permission)
  // Option 2: Use third-party verification service like Certemy
  // Option 3: Manual verification with certificate upload

  const verification = await certemy.verifyCredential({
    credentialType: 'BACB',
    credentialNumber: bacbNumber,
    fullName: fullName,
  });

  if (verification.status === 'verified') {
    await supabase.from('provider_credentials').insert({
      provider_id: providerId,
      credential_type: verification.type,
      credential_number: bacbNumber,
      verified_at: new Date().toISOString(),
      expires_at: verification.expirationDate,
      verification_source: 'certemy',
    });
  }

  return verification;
}
```

### 2.2 REAL VIDEO INTEGRATION
**Current:** Mock Twilio tokens
**Target:** Working Daily.co integration

```typescript
// daily-video.ts - Already have this, need to complete
import Daily from '@daily-co/daily-js';

export async function createVideoRoom(
  sessionId: string,
  providerId: string,
  parentId: string
): Promise<VideoRoom> {
  // Create room via Daily.co API
  const response = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `aminy-session-${sessionId}`,
      privacy: 'private',
      properties: {
        max_participants: 4,
        enable_chat: true,
        enable_screenshare: true,
        enable_recording: 'cloud', // For session notes
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      }
    })
  });

  const room = await response.json();

  // Create meeting tokens for each participant
  const providerToken = await createMeetingToken(room.name, providerId, 'provider');
  const parentToken = await createMeetingToken(room.name, parentId, 'parent');

  return {
    roomUrl: room.url,
    providerToken,
    parentToken,
    sessionId,
  };
}

// Post-session: Generate AI summary from recording
async function generateSessionSummary(recordingUrl: string): Promise<SessionSummary> {
  // 1. Transcribe recording (Deepgram/AssemblyAI)
  const transcript = await transcribeRecording(recordingUrl);

  // 2. Generate summary with Claude
  const summary = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Summarize this ABA session transcript for the parent:

${transcript}

Include:
1. Key topics discussed
2. Strategies recommended
3. Homework/action items
4. Progress noted
5. Next steps

Format as a friendly, easy-to-read summary.`
    }]
  });

  return {
    transcript,
    summary: summary.content[0].text,
    actionItems: extractActionItems(summary.content[0].text),
  };
}
```

### 2.3 REAL OUTCOME TRACKING
**Current:** Demo data in AdminPortal
**Target:** Evidence-based clinical outcomes

```sql
-- Outcome tracking schema
CREATE TABLE outcome_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id),
  goal_id UUID REFERENCES goals(id),

  -- Measurement
  measurement_date DATE NOT NULL,
  measurement_type TEXT CHECK (measurement_type IN (
    'frequency', 'duration', 'latency', 'intensity', 'percentage'
  )),
  baseline_value FLOAT,
  current_value FLOAT,
  target_value FLOAT,

  -- Context
  measured_by TEXT CHECK (measured_by IN ('parent', 'provider', 'ai_detected')),
  setting TEXT, -- home, school, community
  notes TEXT,

  -- Calculated
  percent_to_goal FLOAT GENERATED ALWAYS AS (
    CASE WHEN target_value = baseline_value THEN 100
    ELSE ((current_value - baseline_value) / (target_value - baseline_value)) * 100
    END
  ) STORED,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregate view for reporting
CREATE VIEW outcome_progress AS
SELECT
  c.id as child_id,
  c.name as child_name,
  g.name as goal_name,
  g.domain as goal_domain,

  -- Latest measurement
  om.current_value,
  om.percent_to_goal,

  -- Trend (last 4 weeks)
  (SELECT array_agg(percent_to_goal ORDER BY measurement_date)
   FROM outcome_measurements
   WHERE goal_id = g.id
   AND measurement_date >= NOW() - INTERVAL '4 weeks') as trend,

  -- Comparison to similar children (anonymized)
  (SELECT AVG(percent_to_goal)
   FROM outcome_measurements om2
   JOIN goals g2 ON om2.goal_id = g2.id
   WHERE g2.domain = g.domain
   AND g2.id != g.id) as peer_average

FROM children c
JOIN goals g ON g.child_id = c.id
JOIN LATERAL (
  SELECT * FROM outcome_measurements
  WHERE goal_id = g.id
  ORDER BY measurement_date DESC
  LIMIT 1
) om ON true;
```

---

## PHASE 3: WAIVER & BILLING (Week 5-6)

### 3.1 COMPLETE CLEARINGHOUSE INTEGRATION
**Current:** Structure only, mock responses
**Target:** Live Availity API connection

```typescript
// Production Availity integration
const AVAILITY_CONFIG = {
  apiUrl: 'https://api.availity.com',
  authUrl: 'https://api.availity.com/oauth2/authorize',
  // Get these from Availity partner portal
  clientId: process.env.AVAILITY_CLIENT_ID,
  clientSecret: process.env.AVAILITY_CLIENT_SECRET,
  // Aminy's identifiers
  organizationId: process.env.AVAILITY_ORG_ID,
  submitterId: process.env.AVAILITY_SUBMITTER_ID,
};

// Required setup:
// 1. Apply for Availity Partner status
// 2. Complete HIPAA BAA with Availity
// 3. Get NPI for Aminy Care Services
// 4. Register as clearinghouse submitter
```

### 3.2 ACUMEN/DCI/SPOKCHOICE PARTNERSHIP
**Realistic Approach:**

```
PARTNERSHIP TIERS:

Tier 1: PDF Excellence (NOW)
├── Generate perfect timesheets their staff love
├── EVV-compliant GPS timestamps
├── Service notes in their exact format
├── QR code linking to Aminy for verification
└── "Powered by Aminy" footer

Tier 2: Referral Partnership (3 months)
├── Become approved vendor
├── "Recommended app" in their new enrollee packets
├── Revenue share on caregiver subscriptions
└── Training materials for their staff

Tier 3: Integration Partner (6 months)
├── Direct data feed (if they build API)
├── Auto-populate their portal fields
├── Real-time EVV verification
└── Joint product development
```

**Revenue Model from Waivers:**
```
Per-Family Revenue:
├── $29.99/month Pro tier (caregiver features)
├── $10-15/family referral fee from fiscal agent
├── $5/timesheet processed via clearinghouse
└── Total potential: $50-60/family/month

Market Size:
├── ~1.5M families on self-directed waivers
├── 5% penetration = 75,000 families
├── At $50/family/month = $3.75M ARR
```

---

## PHASE 4: MOBILE & UX POLISH (Week 7)

### 4.1 COMPLETE MOBILE OPTIMIZATION

```css
/* Safe area handling for ALL screens */
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
}

/* Apply to every page container */
.page-container {
  padding-top: calc(var(--safe-area-top) + 16px);
  padding-bottom: calc(var(--safe-area-bottom) + 80px); /* Account for bottom nav */
  padding-left: calc(var(--safe-area-left) + 16px);
  padding-right: calc(var(--safe-area-right) + 16px);
  min-height: 100dvh;
}

/* Tablet optimization */
@media (min-width: 768px) and (max-width: 1024px) {
  .page-container {
    max-width: 600px;
    margin: 0 auto;
  }

  .grid-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .bottom-nav {
    max-width: 600px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 20px 20px 0 0;
  }
}
```

### 4.2 VISUAL POLISH CHECKLIST

```
Every Screen Must Have:
✓ Safe area insets
✓ 44px minimum touch targets
✓ Loading skeleton (not spinner)
✓ Error state with retry
✓ Empty state with CTA
✓ Pull-to-refresh where applicable
✓ Smooth page transitions
✓ Consistent header height
✓ Bottom nav visibility
✓ Keyboard avoiding on inputs
✓ Dark mode support
```

---

## PHASE 5: COMMUNITY & CONTENT (Week 8)

### 5.1 COMMUNITY IMPLEMENTATION

```typescript
// Community with privacy-first design
interface CommunityPost {
  id: string;
  authorId: string;
  authorDisplayName: string; // "Parent of 5yo" not real name

  // Content
  postType: 'win' | 'question' | 'strategy' | 'resource';
  title: string;
  body: string;

  // Privacy
  childAgeRange: '0-2' | '3-5' | '6-8' | '9-12' | '13+';
  concernTags: string[]; // No diagnosis sharing

  // Engagement
  likes: number;
  comments: Comment[];
  isHelpful: boolean; // Community verified

  // Moderation
  aiModeratedAt: string;
  moderationScore: number;
  flags: Flag[];
}

// AI moderation before posting
async function moderatePost(post: CommunityPost): Promise<ModerationResult> {
  const result = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Moderate this community post for a parenting support app:

Title: ${post.title}
Body: ${post.body}

Check for:
1. PHI/PII exposure (names, locations, photos)
2. Medical advice that should come from professionals
3. Harmful recommendations
4. Spam/promotion
5. Negative/judgmental language

Return JSON: { "approved": boolean, "concerns": [], "suggestion": "" }`
    }]
  });

  return JSON.parse(result.content[0].text);
}
```

---

## IMPLEMENTATION PRIORITY MATRIX

### MUST DO (Blocks Launch)
| Item | Effort | Impact | Week |
|------|--------|--------|------|
| Real AI with Claude | 5 days | Critical | 1 |
| Memory system in Supabase | 3 days | Critical | 1 |
| Push notification service | 2 days | High | 2 |
| Email sequences | 2 days | High | 2 |
| Provider credential check | 3 days | Critical | 3 |
| Working video calls | 2 days | High | 3 |
| Outcome tracking DB | 2 days | High | 4 |
| Mobile safe areas | 1 day | Medium | 4 |

### SHOULD DO (Before Scale)
| Item | Effort | Impact | Week |
|------|--------|--------|------|
| Streak/gamification | 3 days | High | 5 |
| Weekly email digest | 2 days | Medium | 5 |
| Community moderation | 3 days | Medium | 6 |
| Tablet layouts | 2 days | Medium | 6 |
| Admin real data | 3 days | Medium | 7 |

### NICE TO HAVE (Post-Launch)
| Item | Effort | Impact | Week |
|------|--------|--------|------|
| Sound design | 2 days | Low | 8+ |
| A/B testing | 3 days | Medium | 8+ |
| Video tutorials | 5 days | Medium | 8+ |
| Cohort analysis | 3 days | Medium | 8+ |

---

## COST PROJECTIONS

### Monthly API Costs (1000 users)
```
Anthropic Claude:
├── Sonnet for chat: ~$150/month
├── Haiku for extraction: ~$20/month
└── Subtotal: $170/month

Supabase:
├── Database (Pro): $25/month
├── Edge Functions: $10/month
├── Storage: $5/month
└── Subtotal: $40/month

Other Services:
├── Daily.co video: $99/month (starter)
├── Resend email: $20/month
├── Web push: $15/month
├── Availity: $200/month (estimated)
└── Subtotal: $334/month

TOTAL: ~$544/month for 1000 users
Cost per user: $0.54/month
```

### Revenue vs Cost
```
At 1000 users, 50% paid conversion:
├── 500 × $14.99 (Core) = $7,495
├── Cost: $544
├── Gross margin: 92.7%
└── Net: $6,951/month

At 10,000 users:
├── 5000 × $14.99 = $74,950
├── Cost: ~$3,000 (scales sub-linearly)
├── Gross margin: 96%
└── Net: $71,950/month
```

---

## PILOT DESIGN FOR CLINICAL OUTCOMES

### Pilot Structure
```
PILOT: "Aminy + BCBA" Study
Duration: 12 weeks
Participants: 50 families
Control: 25 families with BCBA only
Treatment: 25 families with BCBA + Aminy

Measurements:
Week 0: Baseline assessment
├── Parent stress (PSI-SF)
├── Child behavior (CBCL)
├── Goal attainment scaling
└── Time spent on documentation

Week 6: Mid-point
├── Same measures
├── NPS
├── Feature usage data
└── AI conversation quality audit

Week 12: Final
├── Same measures
├── Outcome achievement rate
├── Parent satisfaction
├── Cost analysis
└── BCBA time savings
```

### Success Metrics
```
Primary Outcomes:
├── 30% reduction in parent stress score
├── 50% of goals showing measurable progress
├── 80% retention through week 12
└── NPS > 60

Secondary Outcomes:
├── 3+ logins per week average
├── 10+ AI conversations per month
├── 2+ community interactions per month
└── BCBA reports time savings
```

---

## COMPETITIVE MOATS

### What Forta Can't Easily Copy:
1. **Medicaid waiver integration** - They focus on commercial
2. **Self-directed caregiver tools** - They ARE the provider
3. **Price point** - They're at $99, we're at $15-30
4. **Community** - They're isolated 1:1 model
5. **Between-session support** - They only do scheduled calls

### What We Build That's Defensible:
1. **Memory system** - Every family's data compounds
2. **Strategy outcome data** - "Strategy X works for children like yours"
3. **Waiver expertise** - No one else has this
4. **Parent community** - Network effects
5. **Provider referral network** - Two-sided marketplace

---

## EXECUTION TIMELINE

```
Week 1-2: Foundation
├── Day 1-5: Claude integration + memory system
├── Day 6-8: Push notifications + email
├── Day 9-10: Testing + bug fixes
└── Milestone: AI that remembers and follows up

Week 3-4: Clinical
├── Day 1-3: Provider credential verification
├── Day 4-5: Video integration complete
├── Day 6-8: Outcome tracking database
├── Day 9-10: Provider portal improvements
└── Milestone: Verified providers, working video

Week 5-6: Billing & Waiver
├── Day 1-3: Availity production setup
├── Day 4-5: PDF generation polish
├── Day 6-8: EVV GPS capture complete
├── Day 9-10: Testing with Acumen format
└── Milestone: Submittable timesheets

Week 7: Mobile Polish
├── Day 1-2: Safe area audit all screens
├── Day 3-4: Touch target audit
├── Day 5: Tablet layouts
└── Milestone: Pixel-perfect mobile

Week 8: Community & Launch Prep
├── Day 1-3: Community moderation
├── Day 4-5: Admin real data
├── Day 6-7: Final testing
├── Day 8: Pilot recruitment
└── Milestone: Ready for 50-family pilot
```

---

## DECISION: PROCEED?

To execute this plan, you need:

1. **Anthropic API Key** - ~$170/month
2. **Supabase Pro** - $25/month
3. **Daily.co Account** - $99/month
4. **Resend Account** - $20/month
5. **Development time** - 6-8 weeks focused

**Total investment to launch:** ~$500/month + dev time

**Expected outcome:**
- Real AI that feels like talking to an expert
- Real retention that keeps families coming back
- Real clinical outcomes that prove value
- Real pilot data for fundraising/partnerships

---

Ready to execute? I can start implementing Phase 1 (AI + Memory + Retention) immediately.
