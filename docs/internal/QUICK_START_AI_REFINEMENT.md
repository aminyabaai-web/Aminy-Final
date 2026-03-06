# 🚀 Quick Start: AI Experience Refinement

## ⚡ **30-Second Setup**

### **1. Add to App.tsx:**

```tsx
import { PersistentAIChatFAB } from './components/PersistentAIChatFAB';
import { MicroFeedbackGlow, useMicroFeedback } from './components/MicroFeedbackGlow';

export default function App() {
  const { currentTrigger, showFeedback, clearFeedback } = useMicroFeedback();
  
  return (
    <>
      {/* Your content */}
      
      <PersistentAIChatFAB
        userId="user-123"
        currentPath={window.location.pathname}
      />
      
      <MicroFeedbackGlow
        trigger={currentTrigger}
        onDismiss={clearFeedback}
      />
    </>
  );
}
```

### **2. Trigger Feedback:**

```tsx
// After Jr session:
showFeedback('jr_session');

// After shop purchase:
showFeedback('shop_purchase');

// After hub post:
showFeedback('hub_post');

// After plan complete:
showFeedback('plan_complete');

// After calm moment:
showFeedback('calm_moment');
```

### **3. Collect Pilot Feedback:**

```tsx
import { FeedbackCollector, useFeedbackCollector } from './components/FeedbackCollector';

function SettingsPage() {
  const { isOpen, openFeedback, closeFeedback } = useFeedbackCollector();
  
  return (
    <>
      <button onClick={() => openFeedback('settings')}>
        Share Feedback
      </button>
      
      <FeedbackCollector
        isOpen={isOpen}
        onClose={closeFeedback}
        userId="user-123"
      />
    </>
  );
}
```

---

## 📊 **What You Get:**

✅ Persistent "Ask Aminy 💬" button (bottom-right, all screens)  
✅ Gentle mint-amber-lavender pulse when AI has insights  
✅ Context-aware chat (knows child, recent activity, progress)  
✅ Memory drawer ("Last calm cue", "Progress this week")  
✅ Warm micro-feedback after completions  
✅ Pilot feedback collector modal  
✅ Enhanced analytics dashboard  

---

## 🎨 **Visual Features:**

**Chat Overlay:**
- Warm-white background + ai-gradient border
- Context chips (e.g., "Morning Routine", "Junior Mode")
- calmPulse typing indicator (3 colored dots)
- Starter prompts for quick engagement

**Micro-Feedback:**
- Top glow line (mint→amber→lavender)
- Floating message card
- Sparkles + heart animation
- Auto-dismisses in 4s

**FAB Pulse:**
- Smooth gradient pulse
- New insight badge
- Hover tooltip

---

## 🔧 **Update Context:**

```tsx
import { updateUserContext } from '../ai/contextLayer';

// After Jr session:
await updateUserContext(userId, {
  lastJrSession: {
    timestamp: new Date(),
    activity: 'Big Feelings Booster',
    duration: 5
  },
  progressThisWeek: {
    sessionsCompleted: 3,
    calmMoments: 12,
    newStrategies: 2
  }
});
```

---

## 📈 **Check Analytics:**

Open `/components/AnalyticsDashboard.tsx` to see:
- **New Metric:** Avg calm cue responses per user/week
- Target: 10+ cues/week for optimal engagement

---

## ✅ **Testing:**

1. Click FAB → Chat opens
2. Send message → AI responds with context
3. Check memory drawer → Shows recent history
4. Complete Jr session → See glow + warm message
5. Open feedback → Rate mood + share thoughts

---

## 🎯 **Success Metrics:**

- Chat open rate: **40%+ of sessions**
- Avg cues/week: **10+**
- Feedback response: **25%+ of users**

---

**That's it! Aminy's AI is now persistent, warm, and intelligent everywhere. 🌿**
