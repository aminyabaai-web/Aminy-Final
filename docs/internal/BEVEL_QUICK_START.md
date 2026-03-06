# ⚡ Bevel-Style Chat - Quick Start

## 30-Second Setup

### **1. Add to App.tsx:**

```tsx
import { BevelChatFAB } from './components/BevelChatFAB';
import { SmartCue } from './components/SmartCue';

export default function App() {
  return (
    <>
      {/* Your content */}
      
      <BevelChatFAB
        userId="user-123"
        currentPath={window.location.pathname}
        hasInsight={false}
      />
      
      <SmartCue
        userContext={userContext}
        currentPath={window.location.pathname}
      />
    </>
  );
}
```

---

## ✨ Features

✅ **Bottom-sheet chat** (80vh, blurred backdrop)  
✅ **ChatGPT-style UI** (scrolling messages, fixed input)  
✅ **Gradient send button** (glows when active)  
✅ **Soft pulse** on FAB when AI has insights  
✅ **Module-aware placeholders** (changes by screen)  
✅ **Proactive smart cues** (appear above FAB)  
✅ **Quiet luxury polish** (soft shadows, spring animations)  

---

## 🎨 Visual Design

**Shadows:**
```css
sm: 0 1px 3px rgba(120, 120, 120, 0.08)
md: 0 4px 12px rgba(120, 120, 120, 0.1)
lg: 0 8px 24px rgba(120, 120, 120, 0.12)
glow: 0 2px 8px rgba(6, 182, 212, 0.3)
```

**Animations:**
```tsx
Spring: damping: 25, stiffness: 300
Pulse: duration: 2.5s, ease: easeInOut
```

---

## 📱 Module Placeholders

- **Jr:** "Ask about Jr routines, activities, or progress..."
- **Shop:** "Ask about tools, resources, or recommendations..."
- **Hub:** "Ask about community, stories, or support..."
- **Coverage:** "Ask about insurance, benefits, or coverage..."
- **Plan:** "Ask about your plan, routines, or goals..."

---

## 🧠 Smart Cue Examples

- "Want to review your Calm Coins progress? 🌿"
- "Ready for another Jr session? Kids love consistency 💙"
- "Morning! Want to build today's calm routine together?"
- "I have some calm cues for [struggle]. Want to chat?"

---

## ⚙️ Show Insight Pulse

```tsx
const [hasInsight, setHasInsight] = useState(false);

// Show pulse when user has achievement
if (progressThisWeek.sessionsCompleted >= 3) {
  setHasInsight(true);
}

<BevelChatFAB hasInsight={hasInsight} />
```

---

**That's it! Bevel-level fluidity in 3 components. 🎨**
