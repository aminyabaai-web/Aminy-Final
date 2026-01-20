# Aminy AI Brain - Integration Checklist

## Overview
This checklist outlines the steps to connect ALL existing Aminy features to the unified AI Brain, transforming Aminy from disconnected features into a truly intelligent, context-aware system.

---

## ✅ Phase 1: Foundation (COMPLETE)

- [x] Created `/lib/aminy-ai-brain.ts` - Unified AI context system
- [x] Created `/components/AskAminyWithBrain.tsx` - Context-aware chat
- [x] Created `/components/AIReportGenerator.tsx` - Clinical document generation
- [x] Documented architecture in `/AMINY_AI_BRAIN_ARCHITECTURE.md`

---

## 🔲 Phase 2: State Integration (HIGH PRIORITY)

### Update Store to Track AI Data

**File:** `/lib/store.ts`

```typescript
// Add to AppState interface:
interface AppState {
  // ... existing state
  
  // AI Brain State
  conversationHistory: Conversation[];
  successfulStrategies: Strategy[];
  challengingScenarios: Scenario[];
  juniorModeData: {
    sessions: GameSession[];
    skillsPracticed: string[];
    emotionalRegulation: EmotionData[];
    communicationAttempts: number;
    successfulInteractions: number;
  };
  documentInsights: Map<string, DocumentInsight>; // Vault AI summaries
  generatedReports: Map<string, GeneratedReport>;
}
```

**Actions:**
- [ ] Add AI state fields to store
- [ ] Create actions for storing conversations
- [ ] Create actions for tracking strategies
- [ ] Add persistence to localStorage/Supabase

---

## 🔲 Phase 3: Vault Integration

### Make Vault AI-Aware

**File:** `/components/RecordsVaultComplete.tsx`

**Add AI insight extraction on upload:**

```typescript
const handleDocumentUpload = async (file, type) => {
  // 1. Store document
  const docId = await storeDocument(file, type);
  
  // 2. AI extracts insights
  const insights = await extractDocumentInsights(file, type);
  
  // 3. Store for AI context
  store.setState({
    documentInsights: new Map(store.getState().documentInsights).set(docId, insights)
  });
  
  // 4. Show parent what AI learned
  toast.success(`Document uploaded! AI extracted ${insights.length} key insights.`);
};

// NEW: AI document insight extractor
async function extractDocumentInsights(file, type) {
  const text = await extractTextFromFile(file);
  
  // Use AI to summarize
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    // ... extract key goals, diagnoses, recommendations
  });
  
  return insights;
}
```

**Actions:**
- [ ] Add OCR/text extraction for PDFs
- [ ] Create AI insight extraction function
- [ ] Display "AI Insights" badge on vault documents
- [ ] Show insights in document preview

---

## 🔲 Phase 4: Daily Plan Integration

### Make Plans AI-Generated

**File:** `/components/PlanTabEnhanced.tsx`

**Replace static plans with AI-generated:**

```typescript
const generateDailyPlan = async () => {
  const context = await buildAIContext();
  
  const systemPrompt = `Generate a personalized daily activity plan for ${context.child.name} (age ${context.child.age}).

CURRENT GOALS:
${context.child.currentGoals.map(g => `- ${g.description} (${g.progress}% complete)`).join('\n')}

RECENT PERFORMANCE:
- Completed today: ${context.dailyPlan.completedToday.length} activities
- Junior mode: ${context.juniorMode.gamesPlayed.length} sessions
- Parent challenges: ${context.memory.parentConcerns.slice(0, 3).join('; ')}

Generate 4-6 activities for tomorrow that:
1. Target current goals
2. Build on successful strategies
3. Address parent concerns
4. Match child's developmental level

Return as JSON: { activities: [{ title, goalArea, duration, steps[] }] }`;

  const plan = await generateAIResponse(systemPrompt);
  return plan;
};
```

**Actions:**
- [ ] Create AI plan generation function
- [ ] Add "Generate with AI" button to plan view
- [ ] Show which goals each activity targets
- [ ] Track completion → feeds back to AI

---

## 🔲 Phase 5: Junior Mode Integration

### Connect Jr Mode to AI Brain

**File:** `/components/JuniorPageEnhancedPro.tsx`

**Track Jr activity for AI context:**

```typescript
// When game starts
const startGame = (gameId) => {
  sessionStart = Date.now();
  // ... existing code
};

// When game ends
const endGame = (gameId, performance) => {
  const session: GameSession = {
    gameId,
    date: new Date().toISOString(),
    duration: (Date.now() - sessionStart) / 1000,
    skillsTargeted: getSkillsForGame(gameId),
    performanceScore: performance,
    emotionalState: currentEmotion
  };
  
  // Store in AI context
  store.setState({
    juniorModeData: {
      ...store.getState().juniorModeData,
      sessions: [...store.getState().juniorModeData.sessions, session]
    }
  });
  
  // Generate parent feedback
  const feedback = await generateParentFeedback(session);
  showParentNotification(feedback);
};

async function generateParentFeedback(session) {
  const context = await buildAIContext();
  
  return await generateContextualAIResponse(
    `Summarize ${context.child.name}'s Junior mode session in 1 sentence for their parent. Session: ${JSON.stringify(session)}`,
    []
  );
}
```

**Actions:**
- [ ] Add session tracking to all Jr games
- [ ] Store emotional regulation attempts
- [ ] Track communication practice
- [ ] Generate parent summaries after sessions
- [ ] Show "Jr Activity" insights in Ask Aminy

---

## 🔲 Phase 6: Ask Aminy Deep Integration

### Replace EnhancedAskAminy with AskAminyWithBrain

**File:** `/App.tsx`

**Find and replace:**

```typescript
// OLD
import { EnhancedAskAminy } from './components/EnhancedAskAminy';

// NEW
import { AskAminyWithBrain } from './components/AskAminyWithBrain';

// Usage
<AskAminyWithBrain
  isOpen={isAskAminyOpen}
  onToggle={() => setIsAskAminyOpen(!isAskAminyOpen)}
  onClose={() => setIsAskAminyOpen(false)}
  userTier={state.selectedTier}
  userData={{ parentName: state.parentName, childName: state.children[0]?.name }}
  onPaywallTrigger={() => setShowPaywall(true)}
/>
```

**Actions:**
- [ ] Replace all Ask Aminy instances
- [ ] Test context loading
- [ ] Verify tier limits work
- [ ] Add "View Context" debug mode

---

## 🔲 Phase 7: Report Generation Integration

### Add to More/Settings Page

**File:** `/components/MorePage.tsx`

**Add Reports section:**

```typescript
import { AIReportGenerator } from './components/AIReportGenerator';

// In MorePage render:
<section>
  <h2>Clinical Reports</h2>
  <AIReportGenerator 
    childName={state.children[0]?.name}
    userTier={state.selectedTier}
  />
</section>
```

**Actions:**
- [ ] Add reports section to More page
- [ ] Test report generation
- [ ] Add download functionality
- [ ] Create email sharing option

---

## 🔲 Phase 8: Shopping Intelligence

### Make Shop AI-Powered

**File:** `/components/ShopPageComplete.tsx`

**Add AI recommendations:**

```typescript
const getAIRecommendations = async () => {
  const context = await buildAIContext();
  
  const prompt = `Based on ${context.child.name}'s profile:
- Age: ${context.child.age}
- Sensory profile: Seekers: ${context.child.sensoryProfile.seekers.join(', ')}
- Current goals: ${context.child.currentGoals.map(g => g.area).join(', ')}

Recommend 5 specific products that would help. Return as JSON.`;

  const recommendations = await generateAIResponse(prompt);
  return recommendations;
};
```

**Actions:**
- [ ] Add "AI Recommended" badge to products
- [ ] Sort shop by AI relevance
- [ ] Explain WHY each product is recommended
- [ ] Track purchases → improve recommendations

---

## 🔲 Phase 9: Progress Tracking

### Real Outcome Metrics

**Create:** `/lib/progress-tracker.ts`

```typescript
export const trackProgress = async (childId: string) => {
  const context = await buildAIContext();
  
  // Calculate meaningful metrics
  const metrics = {
    goalProgress: context.child.currentGoals.map(g => ({
      goal: g.description,
      progress: g.progress,
      trend: calculateTrend(g.id)
    })),
    
    activityCompletion: {
      thisWeek: calculateCompletionRate('week'),
      lastWeek: calculateCompletionRate('last-week'),
      change: calculateChange()
    },
    
    parentReportedChallenges: {
      current: context.memory.parentConcerns.length,
      resolved: countResolved(),
      trend: 'improving' | 'stable' | 'declining'
    },
    
    juniorEngagement: {
      sessionsPerWeek: countSessions('week'),
      avgDuration: calculateAvgDuration(),
      skillsPracticed: context.juniorMode.skillsPracticed.length
    }
  };
  
  return metrics;
};
```

**Actions:**
- [ ] Create progress tracking system
- [ ] Add weekly summary generation
- [ ] Show progress graphs in Care tab
- [ ] Email weekly summaries to parents

---

## 🔲 Phase 10: Backend Persistence

### Save AI Data to Supabase

**File:** `/supabase/functions/server/index.tsx`

**Add AI data endpoints:**

```typescript
// Store conversation
app.post('/make-server-8a022548/conversations', async (c) => {
  const { childId, conversation } = await c.req.json();
  await kv.set(`conversations:${childId}`, conversation);
  return c.json({ success: true });
});

// Get conversation history
app.get('/make-server-8a022548/conversations/:childId', async (c) => {
  const { childId } = c.req.param();
  const history = await kv.get(`conversations:${childId}`);
  return c.json(history || []);
});

// Store strategies
app.post('/make-server-8a022548/strategies', async (c) => {
  const { childId, strategy } = await c.req.json();
  const existing = await kv.get(`strategies:${childId}`) || [];
  await kv.set(`strategies:${childId}`, [...existing, strategy]);
  return c.json({ success: true });
});
```

**Actions:**
- [ ] Create backend endpoints for AI data
- [ ] Add sync on app load
- [ ] Enable cross-device sync
- [ ] Add data export option

---

## 🔲 Phase 11: Quality Assurance

### Test End-to-End Flow

**Scenario 1: New User Onboarding**
1. User completes onboarding → Child profile created
2. User uploads IEP to vault → AI extracts insights
3. User asks "What should I work on today?" → AI references goals + IEP
4. Child plays Jr game → AI notes skill practice
5. User checks progress → AI generates summary

**Scenario 2: Daily Usage**
1. Morning: AI suggests today's activities based on goals
2. Child completes activity → Progress tracked
3. Parent asks "How's bedtime routine going?" → AI shows trend + suggestions
4. Evening: Child plays Jr game → AI gives parent feedback
5. Week end: AI generates progress report

**Actions:**
- [ ] Test with 3-5 real parent volunteers
- [ ] Track AI accuracy (good advice vs not helpful)
- [ ] Measure engagement (questions per day)
- [ ] Collect qualitative feedback

---

## 🔲 Phase 12: Performance Optimization

### Ensure AI is Fast & Affordable

**Optimizations:**

```typescript
// 1. Cache common context
const cachedContext = useRef<AminyAIContext | null>(null);
const getCachedContext = async () => {
  if (!cachedContext.current || isStale()) {
    cachedContext.current = await buildAIContext();
  }
  return cachedContext.current;
};

// 2. Batch AI requests
const batchedRequests = [];
const processBatch = async () => {
  // Send multiple questions in one API call
};

// 3. Use smaller models for simple queries
const selectModel = (complexity: 'simple' | 'complex') => {
  return complexity === 'simple' ? 'gpt-3.5-turbo' : 'gpt-4o-mini';
};
```

**Actions:**
- [ ] Add context caching (5min TTL)
- [ ] Implement request batching
- [ ] Monitor API costs daily
- [ ] Set up cost alerts

---

## 🔲 Phase 13: Documentation

### Help Parents Understand AI

**Create:** `/components/AIExplainerModal.tsx`

```typescript
export function AIExplainerModal() {
  return (
    <div>
      <h2>How Aminy's AI Works</h2>
      
      <section>
        <h3>Aminy Knows Your Child</h3>
        <p>The AI has access to:</p>
        <ul>
          <li>Child's age, strengths, challenges</li>
          <li>Vault documents (IEPs, evaluations)</li>
          <li>Daily activity completion</li>
          <li>Junior mode game activity</li>
          <li>All past conversations</li>
        </ul>
      </section>
      
      <section>
        <h3>Privacy & Security</h3>
        <p>Your data is encrypted and never shared. The AI uses it only to give you better advice.</p>
      </section>
    </div>
  );
}
```

**Actions:**
- [ ] Create AI explainer in Help Center
- [ ] Add "How this works" to Ask Aminy
- [ ] Create video demo
- [ ] Add privacy FAQ

---

## Success Criteria

### Technical
- [ ] All features use unified AI Brain
- [ ] Context loads in <1 second
- [ ] AI responses in <3 seconds
- [ ] 99% API uptime
- [ ] <$0.10 per user per day AI cost

### User Experience
- [ ] Parents feel AI "knows" their child
- [ ] Advice is specific and actionable
- [ ] Progress is visible and measurable
- [ ] Reports are professional-quality
- [ ] No feeling of "generic chatbot"

### Business
- [ ] 3+ clinic partnerships secured
- [ ] 1+ payer interested in outcomes data
- [ ] >70% DAU use Ask Aminy
- [ ] >40% parents generate reports
- [ ] <5% AI-related complaints

---

## Timeline

### Week 1: Foundation
- Days 1-2: Store integration
- Days 3-4: Vault AI extraction
- Day 5: Testing

### Week 2: Intelligence
- Days 1-2: Daily plan AI generation
- Days 3-4: Junior mode integration
- Day 5: Ask Aminy replacement

### Week 3: Outcomes
- Days 1-2: Progress tracking
- Days 3-4: Report generation
- Day 5: Shopping recommendations

### Week 4: Polish
- Days 1-2: Backend persistence
- Days 3-4: QA testing
- Day 5: Documentation & launch

---

## Next Immediate Steps

1. **Review this checklist** with team
2. **Prioritize Phase 2** (State Integration) - foundational
3. **Set up AI cost monitoring** - track OpenAI usage
4. **Start with Vault integration** - high value, visible impact
5. **Test with 1 real family** - validate before scaling

**The AI Brain architecture is ready. Now we connect the dots to make Aminy truly intelligent.** 🧠✨
