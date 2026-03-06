# 🎨 Bevel-Style AI Chat Integration Guide

## ✨ **What Was Built**

Aminy now has Bevel-level fluidity with:
- **Bottom-sheet chat overlay** (80vh height)
- **Blurred background** for focus
- **ChatGPT-style scrolling** with fixed input
- **Gradient send button** with glow effect
- **Soft pulse** when AI has insights
- **Proactive smart cues** that appear above FAB
- **Quiet luxury polish** (soft shadows, warm white, spring animations)

---

## 📦 **New Components**

### **1. BevelChatFAB.tsx**
Fixed bottom-right floating action button with soft pulse.

```tsx
import { BevelChatFAB } from './components/BevelChatFAB';

<BevelChatFAB
  userId="user-123"
  currentPath={window.location.pathname}
  hasInsight={true} // Shows soft pulse
/>
```

**Features:**
- Soft pulse ring when `hasInsight={true}`
- Quiet luxury shadow (0 4px 12px rgba(120,120,120,0.15))
- Spring animation (damping: 25)
- Gradient: cyan-600 → blue-700
- Tooltip on hover

---

### **2. BevelChatOverlay.tsx**
Bottom-sheet chat with 80vh height and blurred backdrop.

```tsx
import { BevelChatOverlay } from './components/BevelChatOverlay';

<BevelChatOverlay
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  userId="user-123"
  currentPath="/jr"
/>
```

**Features:**
- **80vh height** bottom sheet
- **Blurred backdrop** (backdrop-blur-md)
- **Module-aware placeholder**: Changes based on current screen
  - Jr: "Ask about Jr routines, activities, or progress..."
  - Shop: "Ask about tools, resources, or recommendations..."
  - Hub: "Ask about community, stories, or support..."
  - Coverage: "Ask about insurance, benefits, or coverage..."
  - Plan: "Ask about your plan, routines, or goals..."
- **ChatGPT-style UI**:
  - User messages: Blue gradient bubble
  - AI messages: Slate-50 bubble with soft shadow
  - Typing indicator: 3 pulsing dots
- **Fixed input** at bottom with gradient send button
- **Plus button** on left (placeholder for attachments)
- **Soft shadows** throughout (0 4px 12px rgba(120,120,120,0.1))

---

### **3. SmartCue.tsx**
Proactive AI suggestions that appear above FAB.

```tsx
import { SmartCue } from './components/SmartCue';

<SmartCue
  userContext={userContext}
  currentPath="/dashboard"
  onAction={(action) => console.log(action)}
/>
```

**Features:**
- **Appears after 3s** on page
- **Auto-dismisses** after 6s
- **Context-aware suggestions**:
  - "Want to review your Calm Coins progress? 🌿"
  - "Ready for another Jr session? Kids love consistency 💙"
  - "I have some calm cues for [struggle]. Want to chat?"
  - "Morning! Want to build today's calm routine together?"
- **Sparkles animation** in icon
- **Pointer arrow** pointing to FAB
- **Soft shadow** (0 4px 12px rgba(120,120,120,0.12))

---

### **4. Enhanced contextLayer.tsx**
New `getCurrentContext()` function for module awareness.

```tsx
import { getCurrentContext } from '../ai/contextLayer';

const currentContext = getCurrentContext('/jr', userContext);
// Returns:
{
  module: 'jr',
  moduleName: 'Junior Mode',
  userState: {
    isActive: true,
    hasRecentActivity: true,
    needsAttention: false
  },
  recentAction: {
    type: 'jr_session',
    timestamp: Date,
    details: 'Big Feelings Booster'
  },
  placeholder: 'Ask about Jr routines, activities, or progress...',
  contextHint: 'Last Jr session: Big Feelings Booster'
}
```

---

## 🎨 **Visual Design System**

### **Colors (Warm White + Gradients)**

```css
/* Backgrounds */
--warm-white: #fafafa;
--background: #ffffff;

/* Gradients */
FAB: from-cyan-600 to-blue-700
User Bubble: from-blue-500 to-blue-600
Send Button: from-cyan-500 to-blue-600
Pulse: from-cyan-50 to-violet-50

/* Soft Shadows */
--bevel-shadow-sm: 0 1px 3px rgba(120, 120, 120, 0.08)
--bevel-shadow: 0 4px 12px rgba(120, 120, 120, 0.1)
--bevel-shadow-lg: 0 8px 24px rgba(120, 120, 120, 0.12)
--bevel-glow: 0 2px 8px rgba(6, 182, 212, 0.3)
```

### **Animations**

```tsx
// Spring (all motion transitions)
transition={{
  type: 'spring',
  damping: 25,
  stiffness: 300
}}

// Pulse (FAB when hasInsight)
animate={{
  scale: [1, 1.3, 1],
  opacity: [0.4, 0, 0.4]
}}
transition={{
  duration: 2.5,
  repeat: Infinity,
  ease: 'easeInOut'
}}

// Typing Indicator
animate={{
  scale: [1, 1.2, 1],
  opacity: [0.5, 1, 0.5]
}}
transition={{
  duration: 1.2,
  repeat: Infinity,
  delay: [0, 0.2, 0.4]
}}
```

### **Typography**

- Headings: Slate-900 (Navy)
- Body: Slate-700
- Muted: Slate-500
- Placeholder: Slate-400
- Font: System fonts (Manrope fallback to SF Pro)

---

## 🚀 **Complete Integration Example**

### **App.tsx**

```tsx
import React, { useState, useEffect } from 'react';
import { BevelChatFAB } from './components/BevelChatFAB';
import { SmartCue } from './components/SmartCue';
import { MicroFeedbackGlow, useMicroFeedback } from './components/MicroFeedbackGlow';
import { fetchUserContext, updateUserContext } from './ai/contextLayer';

export default function App() {
  const [userId] = useState('user-123'); // From auth
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [userContext, setUserContext] = useState(null);
  const [hasInsight, setHasInsight] = useState(false);
  
  const { currentTrigger, showFeedback, clearFeedback } = useMicroFeedback();

  // Load user context
  useEffect(() => {
    async function loadContext() {
      const context = await fetchUserContext(userId);
      setUserContext(context);
      
      // Check if we should show insight pulse
      if (context.progressThisWeek?.sessionsCompleted >= 3) {
        setHasInsight(true);
      }
    }
    loadContext();
  }, [userId]);

  // Listen to route changes
  useEffect(() => {
    const handleRouteChange = () => {
      setCurrentPath(window.location.pathname);
    };
    
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  // Example: Trigger feedback after Jr session
  const handleJrSessionComplete = async () => {
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
    
    showFeedback('jr_session');
    setHasInsight(true); // Show pulse on FAB
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Your app content */}
      <YourAppContent onJrComplete={handleJrSessionComplete} />
      
      {/* Bevel-Style AI Chat */}
      <BevelChatFAB
        userId={userId}
        currentPath={currentPath}
        hasInsight={hasInsight}
      />
      
      {/* Smart Cue */}
      <SmartCue
        userContext={userContext}
        currentPath={currentPath}
      />
      
      {/* Micro-Feedback */}
      <MicroFeedbackGlow
        trigger={currentTrigger}
        onDismiss={clearFeedback}
      />
    </div>
  );
}
```

---

## 📱 **Module-Specific Placeholders**

The chat automatically adapts its placeholder based on the current screen:

| **Module** | **Placeholder** | **Context Hint** |
|------------|----------------|------------------|
| Dashboard | "Ask Aminy anything..." | "I'm here to help with anything on your mind." |
| Jr | "Ask about Jr routines, activities, or progress..." | "Last Jr session: [activity]" |
| Shop | "Ask about tools, resources, or recommendations..." | "I can help you find the perfect tools." |
| Hub | "Ask about community, stories, or support..." | "I can help you connect with other parents." |
| Coverage | "Ask about insurance, benefits, or coverage..." | "I can help you understand your coverage." |
| Plan | "Ask about your plan, routines, or goals..." | "I can help you build calm routines." |
| Care | "Ask about your care team or appointments..." | "I can help you manage your care team." |
| Vault | "Ask about documents, reports, or records..." | "I can help you organize documents." |
| Settings | "Ask about settings, preferences, or account..." | "I can help you customize Aminy." |

---

## 🧪 **Smart Cue Logic**

Smart cues are generated based on:

### **Progress-Based**
- 3+ sessions completed → "Want to review your Calm Coins progress? 🌿"
- 10+ calm moments → "You've had 10+ calm moments this week!"

### **Activity-Based**
- 24+ hours since last Jr session → "Ready for another Jr session?"

### **Struggle-Based**
- Has struggle items → "I have some calm cues for [struggle]. Want to chat?"

### **Celebration-Based**
- Has recent wins → "Want to share your recent win with the community?"

### **Time-Based**
- 6-10am → "Morning! Want to build today's calm routine?"
- 7-10pm → "Evening wind-down time. Need a calm transition cue?"

---

## 🎯 **Best Practices**

### **1. Update Context After Actions**

```tsx
// After Jr session
await updateUserContext(userId, {
  lastJrSession: {
    timestamp: new Date(),
    activity: 'Big Feelings Booster',
    duration: 5
  },
  progressThisWeek: {
    sessionsCompleted: currentSessions + 1,
    calmMoments: currentCalm + 3,
    newStrategies: currentStrategies + 1
  }
});
```

### **2. Show Insight Pulse Strategically**

```tsx
// Show pulse when:
// - User completes 3+ sessions this week
// - User has new achievement
// - AI has generated new recommendations
setHasInsight(true);

// Clear pulse when user opens chat
<BevelChatFAB hasInsight={hasInsight} />
// (Automatically cleared on chat open)
```

### **3. Smart Cue Timing**

```tsx
// Smart cues appear:
// - 3 seconds after page load
// - Auto-dismiss after 6 seconds
// - User can manually dismiss
// - Only one cue at a time
```

---

## ✅ **Testing Checklist**

### **Chat Overlay**
- [ ] Opens with spring animation from bottom
- [ ] Backdrop is blurred
- [ ] Height is 80vh
- [ ] Messages scroll correctly
- [ ] Input stays fixed at bottom
- [ ] Gradient send button glows when text entered
- [ ] Plus button visible (placeholder)
- [ ] Placeholder changes by module
- [ ] Typing indicator shows 3 pulsing dots
- [ ] Messages have soft shadows

### **FAB**
- [ ] Fixed bottom-right (above bottom nav on mobile)
- [ ] Soft pulse shows when hasInsight={true}
- [ ] Spring animation on mount
- [ ] Gradient: cyan → blue
- [ ] Tooltip shows on hover
- [ ] Insight badge appears top-right
- [ ] Soft shadow: 0 4px 12px rgba(120,120,120,0.15)

### **Smart Cue**
- [ ] Appears 3s after page load
- [ ] Auto-dismisses after 6s
- [ ] Sparkles icon animates
- [ ] Pointer arrow points to FAB
- [ ] Close button works
- [ ] Message adapts to context
- [ ] Soft shadow: 0 4px 12px rgba(120,120,120,0.12)

### **Visual Polish**
- [ ] All shadows soft (no hard edges)
- [ ] Warm white backgrounds (#fafafa)
- [ ] Spring animations (damping: 25)
- [ ] Gradients smooth
- [ ] Typography clean (slate colors)

---

## 🎊 **What's Different from Before**

| **Before** | **After (Bevel-Style)** |
|------------|------------------------|
| Full-screen overlay | 80vh bottom sheet |
| No backdrop blur | Blurred backdrop |
| Top-anchored input | Bottom-fixed input (ChatGPT style) |
| No module awareness | Dynamic placeholder per module |
| Hard shadows | Soft shadows (rgba(120,120,120,0.1)) |
| Basic pulse | Soft gradient pulse |
| No smart cues | Proactive AI suggestions |
| Standard animations | Spring animations (damping: 25) |
| Teal accent only | Gradients throughout |

---

## 📊 **Performance**

- Chat overlay: Lazy loaded (only renders when open)
- Context fetch: Once on mount, cached
- Smart cue: Debounced (3s delay)
- Animations: Hardware-accelerated (GPU)
- Shadows: Optimized (no filters)

---

## 🚀 **Next Steps**

1. Add to `App.tsx` main layout
2. Test on all modules (Jr, Shop, Hub, Coverage, Plan, Care, Vault)
3. Monitor smart cue engagement
4. A/B test insight pulse effectiveness
5. Collect feedback on bottom-sheet UX

---

**🌿 Aminy now feels like Bevel — fluid, intelligent, and emotionally warm.**
