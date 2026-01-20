

# Aminy AI Brain - Unified Intelligence Architecture

## Executive Summary

**Aminy IS the AI.** This document outlines the comprehensive AI architecture that powers the entire Aminy experience - not just chatbots, but a unified intelligence system that:

- **Knows everything** about the child (age, concerns, strengths, goals, diagnoses)
- **Remembers everything** (all conversations, successful strategies, challenging scenarios)
- **Sees everything** (vault documents, daily plans, Junior mode activity, progress data)
- **Integrates everything** (parent mode + child mode → better outcomes)
- **Generates everything** (IEPs, progress reports, BCBA notes, coverage letters, daily plans)

**Purpose:** Be the best developmental pediatrician + BCBA + best friend in parents' pockets, making clinical-quality care accessible and outcomes measurable.

---

## The Vision

### What Aminy AI Brain IS:
✅ A **mental offload** for exhausted parents  
✅ A **clinical partner** that knows their child better than anyone  
✅ An **outcome engine** that generates meaningful progress for payers/providers  
✅ A **connected ecosystem** where all data flows into better advice  
✅ **Good enough for clinics to recommend** to their client families  
✅ **Good enough for payers to trust** with meaningful progress metrics  

### What It's NOT:
❌ Just another chatbot with generic advice  
❌ Disconnected features that don't talk to each other  
❌ Template-based responses that ignore context  
❌ A gimmick - this is real clinical-grade AI  

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AMINY AI BRAIN (Central)                 │
│                  /lib/aminy-ai-brain.ts                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Unified Context (AminyAIContext):                          │
│  ├── Child Profile (age, concerns, goals, strengths)        │
│  ├── Vault (IEPs, evaluations, reports, insurance)          │
│  ├── Daily Plans (routines, activities, completion)         │
│  ├── Conversation Memory (all past interactions)            │
│  ├── Junior Mode Data (games, skills, emotions)             │
│  ├── Parent Profile (concerns, strategies, support needs)   │
│  └── Clinical Data (diagnoses, therapy, medications)        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     AI-POWERED FEATURES                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Ask Aminy (Contextual Chat)                             │
│     └─> Knows child's age, vault docs, daily plan, history  │
│                                                              │
│  2. Daily Plan Generation                                   │
│     └─> Uses goals, Junior data, past success/failures      │
│                                                              │
│  3. Progress Reports                                        │
│     └─> Real data: completion rates, skill gains, outcomes  │
│                                                              │
│  4. IEP Generator                                           │
│     └─> SMART goals based on actual progress tracking       │
│                                                              │
│  5. BCBA Session Notes                                      │
│     └─> Documents interventions and child responses         │
│                                                              │
│  6. Insurance Letters                                       │
│     └─> Medical necessity with real progress data           │
│                                                              │
│  7. Shopping Recommendations                                │
│     └─> Suggests tools based on sensory profile & goals     │
│                                                              │
│  8. Soft Diagnosis Guidance                                 │
│     └─> Pattern recognition from behaviors/challenges       │
│                                                              │
│  9. Coverage Review                                         │
│     └─> Analyzes insurance docs, suggests optimization      │
│                                                              │
│ 10. Junior Mode Personalization                             │
│     └─> Adapts games/activities based on performance        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## How It Works: The Data Flow

### 1. **Data Collection** (All Roads Lead to the Brain)

Every interaction feeds the AI:

```typescript
// Onboarding → AI learns about child
OnboardingFlow → stores child profile, concerns, goals

// Vault uploads → AI knows medical history
DocumentVault → AI extracts insights from IEPs, evaluations

// Daily activities → AI tracks progress
PlanTab → Completion data, parent notes, engagement scores

// Ask Aminy → AI remembers conversations
AskAminyWithBrain → Stores successful strategies, challenges

// Junior mode → AI sees child's actual behavior
JrMode → Game performance, emotion regulation, communication

// Reports → AI generates clinical documents
AIReportGenerator → Uses ALL data to create professional reports
```

### 2. **Context Building** (The AI's "Memory")

When parent asks ANY question, AI instantly knows:

```typescript
const context = await buildAIContext();

// Context includes:
{
  child: {
    name: "Emma",
    age: 5,
    concerns: ["bedtime struggles", "morning transitions"],
    strengths: ["loves music", "visual learner"],
    goals: [
      { area: "behavioral", description: "Complete bedtime routine independently", progress: 45% },
      { area: "social", description: "Initiate play with peers", progress: 30% }
    ]
  },
  
  vault: {
    evaluations: [/* AI has read summaries */],
    iepDocuments: [/* AI knows current IEP goals */]
  },
  
  dailyPlan: {
    todaysFocus: [/* AI knows what's planned */],
    completedToday: [/* AI knows what's done */]
  },
  
  memory: {
    conversations: [/* All past Ask Aminy chats */],
    successfulStrategies: [/* What worked before */],
    challengingScenarios: [/* Recurring struggles */]
  },
  
  juniorMode: {
    gamesPlayed: [/* Recent Jr activity */],
    emotionalRegulation: [/* How child self-regulates */]
  }
}
```

### 3. **Intelligent Response** (Not Templates - Real AI)

When parent asks: *"Emma won't go to bed. Help!"*

**Old way (template-based):**
```
"Bedtime can be challenging! Try creating a routine with visual schedules."
```
❌ Generic, doesn't use context, same advice every time

**NEW way (AI Brain with context):**
```
I see bedtime has been a struggle for Emma (5). Looking at your vault, 
I notice her IEP mentions sensory seeking behaviors, and in Junior mode 
she's shown strong visual learning. 

Based on her current goal (45% progress on independent bedtime routine), 
here's what I recommend:

1. Visual Countdown Timer - Emma's a visual learner, so try the "5-4-3-2-1" 
   countdown chart we have in the activity library

2. Sensory Input - Since she's a sensory seeker, 10 minutes of heavy work 
   (pillow squishes, wall pushes) before the routine might help regulate

3. Consistent Sequence - I see your daily plan already includes bath → 
   pajamas → books. Let's add a "job chart" where Emma checks off each step

This worked for another parent with a 5-year-old sensory seeker last week. 
Want me to add this to tomorrow's plan?
```
✅ Specific to Emma, references actual data, actionable, remembers what works

---

## Key Features of the AI Brain

### 1. **Cross-Feature Intelligence**

AI doesn't exist in silos - it flows across the entire app:

| Feature | What AI Knows | What AI Does |
|---------|--------------|--------------|
| **Ask Aminy** | Full context | Personalized advice |
| **Daily Plan** | Goals, past performance | Adapts difficulty |
| **Vault** | Documents uploaded | Extracts insights |
| **Progress Reports** | All completion data | Generates quantitative outcomes |
| **Shopping** | Sensory profile, goals | Recommends specific products |
| **IEP Generator** | Current progress | Creates SMART goals |
| **Junior Mode** | Child's performance | Personalizes game difficulty |

### 2. **Memory & Learning**

The AI gets smarter over time:

```typescript
// Tracks what works
storeConversation(messages, topic, outcome: 'positive')

// Remembers successful strategies
memory.successfulStrategies.push({
  description: "5-4-3-2-1 countdown chart",
  context: "bedtime-routine",
  effectiveness: 5,
  usedCount: 3
})

// Identifies patterns
memory.challengingScenarios.push({
  description: "Morning transitions",
  frequency: 12,
  lastOccurred: "2025-01-15",
  aiRecommendations: [/* Based on what worked before */]
})
```

### 3. **Outcome Generation**

AI creates **real clinical documents** that providers/payers trust:

#### Progress Report Example:
```
PROGRESS REPORT: Emma Johnson (5 years old)
Reporting Period: January 1-15, 2025

EXECUTIVE SUMMARY:
Emma has made measurable progress across behavioral and social domains, 
with 45% completion of bedtime independence goal and emerging peer 
interaction skills.

QUANTITATIVE DATA:
- Daily Activity Completion: 78% (up from 62%)
- Junior Mode Engagement: 12 sessions, avg 18 min duration
- Parent-Reported Meltdowns: Decreased from 5/week to 2/week
- Successful Social Initiations: 8 documented instances

GOAL PROGRESS:
1. Bedtime Routine Independence: 45% complete
   - Independently completes 3/7 steps without prompting
   - Visual schedule improved compliance by 35%
   - Recommendation: Continue current visual supports

2. Peer Play Initiation: 30% complete
   - Initiated play with peers 8 times (baseline: 2 times)
   - Used "asking to join" script 5 times successfully
   - Recommendation: Increase structured peer opportunities

CLINICAL OBSERVATIONS:
Emma demonstrates strong visual learning preference (confirmed via 
Junior mode game performance). Sensory-seeking behaviors effectively 
regulated through heavy work activities before transitions.

PARENT INPUT:
Parent reports reduced morning stress and improved family dynamics. 
Successful implementation of visual schedules and sensory strategies.

NEXT STEPS:
1. Introduce social scripts for playground scenarios
2. Expand bedtime routine visual supports
3. Continue tracking progress via Aminy Jr engagement data
```

**This is clinic-quality documentation generated FROM REAL DATA.**

### 4. **Parent-Child Mode Integration**

The AI bridges what happens in Junior mode (child) with parent strategies:

```typescript
// Junior Mode: Child plays emotion regulation game
juniorMode.emotionalRegulation.push({
  emotion: "frustrated",
  regulationStrategy: "deep-breathing-bubbles",
  successful: true
})

// AI tells parent about this:
"I noticed Emma used the deep breathing strategy in Junior mode today 
when she got frustrated during the matching game. This is the same 
technique we discussed for bedtime resistance. She's generalizing the 
skill! Keep reinforcing it."
```

**Outcome:** Parent sees child is ACTUALLY learning skills, not just playing games.

---

## Implementation Guide

### Step 1: Core AI Brain Setup

```bash
# Already created:
/lib/aminy-ai-brain.ts        # Unified AI context & intelligence
/components/AskAminyWithBrain.tsx  # Context-aware chat
/components/AIReportGenerator.tsx  # Clinical document generation
```

### Step 2: Integrate Across Features

**Every feature should feed/use the AI Brain:**

```typescript
// Example: Daily Plan uses AI
import { buildAIContext, generateContextualAIResponse } from '../lib/aminy-ai-brain';

// When generating daily plan:
const context = await buildAIContext();
const plan = await generateDailyPlan(context);

// When user completes activity:
await storeActivityCompletion(activityId, {
  completed: true,
  engagement: 4,
  parentNotes: "Went really well!"
});
```

### Step 3: Add to State Management

```typescript
// /lib/store.ts - Add AI-related state
interface AppState {
  // Existing...
  
  // NEW: AI Brain data
  conversationHistory: Conversation[];
  successfulStrategies: Strategy[];
  challengingScenarios: Scenario[];
  juniorModeData: {
    sessions: GameSession[];
    skillsPracticed: string[];
    emotionalRegulation: EmotionData[];
  };
}
```

### Step 4: Connect Vault to AI

```typescript
// When user uploads document:
const uploadDocument = async (file, type) => {
  // Store in vault
  const docId = await storeInVault(file, type);
  
  // AI extracts insights
  const insights = await extractDocumentInsights(file, type);
  
  // Store insights for AI context
  await storeDocumentSummary(docId, insights);
};
```

### Step 5: Junior Mode Integration

```typescript
// After each Junior mode session:
const endJuniorSession = async (sessionData) => {
  // Store session data
  await storeJuniorSession({
    gameId: sessionData.gameId,
    duration: sessionData.duration,
    skillsTargeted: sessionData.skills,
    performanceScore: sessionData.score,
    emotionalState: sessionData.emotion
  });
  
  // AI analyzes and gives parent feedback
  const feedback = await generateParentFeedback(sessionData);
  showNotification(feedback);
};
```

---

## Benefits for Key Stakeholders

### For Parents:
✅ Mental offload - AI remembers everything  
✅ Personalized advice using their child's actual data  
✅ Professional reports for schools/providers  
✅ See meaningful progress happening  
✅ 24/7 support that knows their story  

### For Clinics:
✅ Can recommend to client families with confidence  
✅ Families arrive more prepared to sessions  
✅ Progress data flows from app to clinic  
✅ Reduces clinic admin burden (auto-generated notes)  
✅ Improves treatment outcomes with daily practice  

### For Payers (Insurance):
✅ Measurable outcomes (completion rates, skill gains)  
✅ Reduced need for high-cost interventions  
✅ Data-driven medical necessity documentation  
✅ Clear ROI on coverage decisions  
✅ Prevention of escalation/hospitalization  

### For Schools:
✅ Ready-to-use IEP documents  
✅ Progress monitoring data  
✅ Consistent home-school strategies  
✅ Parent-school communication improved  
✅ Evidence-based interventions  

---

## Technical Requirements

### 1. OpenAI API Integration
```bash
VITE_OPENAI_API_KEY=sk-...
```

**Model:** GPT-4o-mini (cost-effective, high quality)  
**Cost:** ~$0.02-0.05 per conversation  
**Monthly:** ~$200-500 for 10K active users  

### 2. Data Storage
```typescript
// Store conversation history
Supabase KV Store: conversationHistory

// Store successful strategies
Supabase KV Store: strategies

// Store Junior mode data
Supabase KV Store: juniorModeData
```

### 3. Document Processing
```typescript
// Extract text from PDFs, images
Use OCR for uploaded IEPs/evaluations
AI summarizes key insights
Store summaries for quick context loading
```

---

## Roadmap

### Phase 1: Foundation (Current)
- ✅ Unified AI Brain architecture
- ✅ Context-aware Ask Aminy
- ✅ Clinical report generation
- ⏳ Integrate with existing features

### Phase 2: Intelligence (Next 2 weeks)
- 🔲 Daily plan AI generation
- 🔲 Vault document insight extraction
- 🔲 Junior mode → parent feedback loop
- 🔲 Shopping recommendations engine

### Phase 3: Outcomes (Next 4 weeks)
- 🔲 Real-time progress tracking
- 🔲 Automated BCBA note generation
- 🔲 Insurance letter automation
- 🔲 Provider dashboard integration

### Phase 4: Advanced (Future)
- 🔲 Predictive analytics (anticipate challenges)
- 🔲 Multimodal AI (video analysis of child)
- 🔲 Voice-based interactions
- 🔲 Clinic portal integration

---

## Success Metrics

### User Engagement
- Daily active usage of Ask Aminy
- Conversation depth (messages per session)
- Feature cross-utilization rate

### Clinical Outcomes
- Goal completion rates
- Parent-reported stress reduction
- School/provider satisfaction scores

### Business Metrics
- Clinic partnerships secured
- Payer contracts signed
- Conversion rate (free → paid)
- Retention rate by tier

---

## Conclusion

**Aminy is not an app with AI features. Aminy IS the AI.**

The unified AI Brain architecture ensures:
1. Every feature knows about the child
2. Every interaction makes the AI smarter
3. Every outcome is measurable and meaningful
4. Parents get clinical-quality care at home
5. Providers trust the progress data
6. Payers see clear ROI

**This is the mental offload parents desperately need, powered by AI that actually knows their child.**

---

## Next Steps

1. **Review this architecture** - Does it align with vision?
2. **Integrate existing features** - Connect vault, plans, Jr mode to AI Brain
3. **Test with real families** - Validate advice quality
4. **Measure outcomes** - Track meaningful progress
5. **Build clinic partnerships** - Demo to providers
6. **Secure payer contracts** - Show ROI with data

**The foundation is built. Now we connect everything to make Aminy the most intelligent developmental support system ever created.**
