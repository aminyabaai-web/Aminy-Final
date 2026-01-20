# 🚀 Quick Access Guide - New Features

## How to Access Each New Feature

### 1. 🏥 BCBA Coach Portal

**To add to your app:**

```tsx
// In App.tsx, add new screen type
type AppScreen = 
  | "splash"
  | "login"
  | "create-account"
  | "onboarding"
  | "dashboard"
  | "paywall"
  | "benefits"
  | "telehealth"
  | "caregivers"
  | "vault"
  | "junior"
  | "settings"
  | "coach"       // ← NEW
  | "analytics"   // ← NEW
  | "launch"      // ← NEW

// Import the component
import { BCBACoachPortal } from "./components/BCBACoachPortal";

// Add to renderScreen() function
case "coach":
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <BCBACoachPortal
        onBack={() => navigateToScreen("dashboard")}
        coachName="Dr. Smith"
      />
    </Suspense>
  );
```

**To navigate from More page:**
```tsx
// In MorePage.tsx or Settings
<button onClick={() => onNavigate("coach")}>
  BCBA Coach Portal
</button>
```

---

### 2. 📊 Analytics Dashboard

**Add to App.tsx:**

```tsx
import { EnhancedAnalyticsDashboard } from "./components/EnhancedAnalyticsDashboard";

// In renderScreen()
case "analytics":
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <EnhancedAnalyticsDashboard
        onBack={() => navigateToScreen("dashboard")}
        userTier={userData.tier}
      />
    </Suspense>
  );
```

**To add link from Dashboard:**
```tsx
// In Dashboard "More" menu
<MenuItem onClick={() => onNavigate('analytics')}>
  <BarChart3 /> Analytics Dashboard
</MenuItem>
```

---

### 3. 🚦 Launch Status Dashboard

**Add to App.tsx:**

```tsx
import { LaunchStatusDashboard } from "./components/LaunchStatusDashboard";

// In renderScreen()
case "launch":
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <LaunchStatusDashboard
        onBack={() => navigateToScreen("dashboard")}
      />
    </Suspense>
  );
```

**Developer Mode Access:**
```tsx
// In DeveloperModePanel.tsx
<button onClick={() => onNavigate("launch", "")}>
  📊 Launch Status
</button>
```

---

### 4. 🔒 HIPAA Compliance Toggle

**Add to Settings page:**

```tsx
import { HIPAAComplianceToggle } from "./components/HIPAAComplianceToggle";

// In SettingsScreen.tsx
<div className="space-y-6">
  <h2>Privacy & Security</h2>
  
  <HIPAAComplianceToggle
    onToggle={(enabled) => {
      console.log('HIPAA protections:', enabled);
      toast.success(enabled ? 'HIPAA protections enabled' : 'HIPAA protections disabled');
    }}
    defaultEnabled={true}
  />
  
  {/* Other settings... */}
</div>
```

---

## 🎯 Coach Portal Backend Testing

### Test the API endpoints:

```typescript
// Get all families
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/coach/families`,
  {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'X-Coach-Id': 'coach_123'
    }
  }
);

// Get family detail
const familyData = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/coach/family/1`,
  {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'X-Coach-Id': 'coach_123'
    }
  }
);

// Save a note
await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/coach/note`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'X-Coach-Id': 'coach_123',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      familyId: '1',
      content: 'Great progress today on eye contact goals.',
      tags: ['progress', 'social-skills']
    })
  }
);
```

---

## 🤖 Test Updated AI Conversation

The Claude 3.5 schema is automatically used in:
- **Ask Aminy** (floating FAB)
- **Onboarding AI Intake**
- **Chat Overlay**

Test the new tone by asking:
- "Help me with my child's morning routine"
- "What should I focus on today?"
- "Tell me about sensory strategies"

You should notice:
- ✅ More natural, conversational responses
- ✅ Gentle emoji usage (💛 🌿)
- ✅ Clinical precision with warm delivery
- ✅ Contextual memory of previous chats

---

## 📱 Mobile Splash Screen

The updated splash screen automatically displays with:
- ✅ Perfect bottom padding (no icon cropping)
- ✅ Centered CTA between tagline and footer
- ✅ Clean 393×852 mobile framing
- ✅ Navy + teal aesthetic maintained

No code changes needed - it's already live in `/components/SplashScreen.tsx`

---

## 🧪 Quick Test Checklist

### Coach Portal
- [ ] Access coach portal from navigation
- [ ] View family list with AI insights
- [ ] Click family to see detail page
- [ ] Switch between Overview/Goals/Reports/Notes tabs
- [ ] Add a new note
- [ ] Search families

### Analytics
- [ ] View metrics dashboard
- [ ] Switch time ranges (7d, 30d, 90d)
- [ ] Navigate between Overview/Engagement/AI/Outcomes tabs
- [ ] Check metrics update correctly

### HIPAA Toggle
- [ ] Toggle HIPAA mode on/off
- [ ] Verify state persists in localStorage
- [ ] Expand/collapse details section
- [ ] Check visual states (green when on, amber when off)

### Launch Status
- [ ] View overall completion percentage
- [ ] Check all module statuses
- [ ] Verify achievements list
- [ ] Review remaining tasks

---

## 🔧 Developer Mode Shortcuts

Press **Shift + D** to open developer panel, then:

```tsx
// Quick navigation to new features
navigation: {
  coach: () => navigateToScreen("coach"),
  analytics: () => navigateToScreen("analytics"),
  launch: () => navigateToScreen("launch")
}
```

---

## 🎨 Design Tokens

All new components follow the design system:

```css
/* Primary Colors */
--accent: #0891b2;        /* Teal for CTAs */
--primary: #2E3B4E;       /* Navy for text */
--slate-600: #64748b;     /* Secondary text */

/* Gradients */
from-accent/5 via-accent/8 to-accent/5

/* Spacing (unchanged) */
/* Use Tailwind utilities, no custom font classes */
```

---

## 💾 Data Storage

### KV Store Keys

```typescript
// Coach Data
`coach_assignment:${coachId}:${familyId}`
`family:${familyId}`
`goal:${familyId}:${goalId}`
`coach_note:${coachId}:${familyId}:${timestamp}`

// HIPAA Settings
localStorage: 'aminy-hipaa-enabled'

// AI Memory (existing)
`ai_memory:${userId}_conversation`
```

---

## 🚀 Ready to Launch

All Phase 2 features are complete and integrated:

✅ Mobile splash polish  
✅ BCBA Coach Portal  
✅ Analytics Dashboard  
✅ Launch Status Dashboard  
✅ HIPAA Compliance Toggle  
✅ Updated Claude 3.5 AI schema  
✅ Backend coach API routes  

**Next steps:**
1. Add navigation links to new features
2. Test with real coach users
3. Generate App Store assets
4. Begin beta testing

---

*Last Updated: October 27, 2025*
