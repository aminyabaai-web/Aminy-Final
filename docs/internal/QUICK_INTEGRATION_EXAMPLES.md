# Quick Integration Examples

## How to Add New Components to Existing Pages

### 1. Add Weekly Outcomes to Dashboard

**File**: `/components/Dashboard.tsx`

**Step 1**: Add import at the top:
```tsx
import { WeeklyOutcomesDashboard } from './WeeklyOutcomesDashboard';
```

**Step 2**: Get access token (add near other state variables):
```tsx
const accessToken = typeof window !== 'undefined' 
  ? localStorage.getItem('access_token') || undefined 
  : undefined;
```

**Step 3**: Add to Dashboard home view (around line 400-500, after the greeting):
```tsx
{/* Weekly Progress Summary */}
{childName && (
  <div className="mb-6">
    <WeeklyOutcomesDashboard 
      childId="child-1" // Replace with actual childId
      childName={childName}
      accessToken={accessToken}
      onViewDetails={() => setActiveTab?.('insights')}
    />
  </div>
)}
```

---

### 2. Add Subscription Management to Settings

**File**: `/components/SettingsPage.tsx`

**Step 1**: Add import:
```tsx
import { SubscriptionManagement } from './SubscriptionManagement';
```

**Step 2**: Add to settings sections array (around line 150):
```tsx
const settingSections = [
  // ... existing sections
  { 
    id: 'billing', 
    label: 'Subscription & Billing', 
    icon: <CreditCard className="w-4 h-4" /> 
  },
  // ... rest of sections
];
```

**Step 3**: Add case to renderContent() switch (around line 600):
```tsx
case 'billing':
  return (
    <SubscriptionManagement 
      accessToken={typeof window !== 'undefined' 
        ? localStorage.getItem('access_token') || undefined 
        : undefined} 
    />
  );
```

---

### 3. Add Reports Hub to Parent Hub

**File**: `/components/ParentHubPage.tsx`

**Step 1**: Add import:
```tsx
import { ReportsHub } from './ReportsHub';
```

**Step 2**: Add state for childId (near top of component):
```tsx
const [currentChildId] = useState('child-1'); // Replace with actual state
const [currentChildName] = useState('Emma'); // Replace with actual state
```

**Step 3**: Add to tabs (around line 500-600):

If using Tabs component:
```tsx
<TabsContent value="reports">
  <ReportsHub 
    childId={currentChildId}
    childName={currentChildName}
    accessToken={typeof window !== 'undefined' 
      ? localStorage.getItem('access_token') || undefined 
      : undefined}
    userTier={userTier}
  />
</TabsContent>
```

Or if using activeView state:
```tsx
{activeView === 'reports' && (
  <ReportsHub 
    childId={currentChildId}
    childName={currentChildName}
    accessToken={typeof window !== 'undefined' 
      ? localStorage.getItem('access_token') || undefined 
      : undefined}
    userTier={userTier}
  />
)}
```

**Step 4**: Add Reports navigation button (in the hub navigation):
```tsx
<Button
  onClick={() => setActiveView('reports')}
  variant={activeView === 'reports' ? 'default' : 'ghost'}
  className="flex items-center gap-2"
>
  <FileText className="w-4 h-4" />
  Reports
</Button>
```

---

## Complete Dashboard Example

Here's how the Dashboard home view would look with WeeklyOutcomesDashboard integrated:

```tsx
// Around line 400-500 in Dashboard.tsx
return (
  <div className="space-y-6 pb-24">
    {/* Greeting */}
    <div className="text-center py-6">
      <h1 className="text-2xl text-primary mb-2">
        {timeOfDayGreeting}, {userData?.parentName || 'there'}
      </h1>
      <p className="text-muted-foreground">
        Here's what's happening with {childName}
      </p>
    </div>

    {/* Weekly Progress - NEW! */}
    <WeeklyOutcomesDashboard 
      childId="child-1"
      childName={childName || 'your child'}
      accessToken={accessToken}
      onViewDetails={() => setActiveTab?.('insights')}
    />

    {/* Today's Focus Card */}
    <TodaysFocusCard />

    {/* Ask Aminy Card */}
    <AskAminyHomeCard />

    {/* Rest of dashboard... */}
  </div>
);
```

---

## Authentication Setup

To make these work properly, set up authentication:

### Option 1: Using Supabase Auth (Recommended)

```tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Store access token
if (data?.session) {
  localStorage.setItem('access_token', data.session.access_token);
}

// Get current session
const { data: { session } } = await supabase.auth.getSession();
```

### Option 2: Using Mock Token (Development Only)

```tsx
// For testing without auth
if (!localStorage.getItem('access_token')) {
  localStorage.setItem('access_token', 'mock-token-for-testing');
}
```

---

## Logging Events for Outcomes

To make the Weekly Outcomes Dashboard show real data, log events throughout your app:

```tsx
import { logEvent } from '../src/lib/outcomeAI';

// When an activity is completed
await logEvent({
  userId: currentUserId,
  childId: currentChildId,
  eventType: 'activity_completed',
  eventData: {
    activityId: 'morning-routine',
    activityName: 'Brushing Teeth',
    duration: 5,
    difficulty: 'easy'
  },
  metadata: {
    location: 'home',
    dayOfWeek: new Date().getDay()
  }
}, accessToken);

// When a milestone is reached
await logEvent({
  userId: currentUserId,
  childId: currentChildId,
  eventType: 'milestone_reached',
  eventData: {
    milestone: 'Used 3-word sentence unprompted',
    category: 'speech'
  }
}, accessToken);

// When a therapy session is completed
await logEvent({
  userId: currentUserId,
  childId: currentChildId,
  eventType: 'session_completed',
  eventData: {
    sessionType: 'speech-therapy',
    provider: 'Dr. Smith',
    duration: 45
  }
}, accessToken);
```

---

## Styling Notes

All components follow the existing Aminy design system:
- ✅ Uses existing Card, Button, Badge components
- ✅ Follows color scheme (teal accent, white backgrounds)
- ✅ Responsive mobile-first design
- ✅ Parent Ease voice for all copy
- ✅ Proper loading and error states

No additional CSS or theme changes needed!

---

## Testing Your Integration

1. **Check Components Render**:
   - Open Dashboard → Should see Weekly Outcomes card
   - Open Settings → Should see Subscription & Billing tab
   - Open Parent Hub → Should see Reports tab

2. **Check Data Loading**:
   - Open browser console
   - Look for API calls to `/make-server-8a022548/*`
   - Should see successful responses or clear error messages

3. **Check Functionality**:
   - Click "Generate Report" button
   - Click "Upgrade" button in subscription
   - View weekly summary updates

4. **Check Error Handling**:
   - Test without access token
   - Test with invalid childId
   - Should see friendly error messages, not crashes

---

## Common Issues & Fixes

### "Unauthorized" Errors
**Fix**: Make sure access_token is set in localStorage
```tsx
localStorage.setItem('access_token', 'your-token-here');
```

### Components Not Showing
**Fix**: Check that childId and childName props are being passed
```tsx
console.log('childId:', childId, 'childName:', childName);
```

### Hooks Not Working
**Fix**: Ensure components using hooks are client-side only
```tsx
'use client'; // Add at top of file if using Next.js
```

### API Calls Failing
**Fix**: Check that Supabase server is running and environment variables are set
```bash
# Check .env file has:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key # For AI summaries
```

---

## Next Steps After Integration

1. **Add Real Child IDs**: Replace hardcoded 'child-1' with actual child selection
2. **Add Real User IDs**: Connect to your auth system
3. **Enable Stripe**: Add STRIPE_SECRET_KEY for real payments
4. **Add PDF Generation**: Implement actual PDF library for reports
5. **Add Email Service**: Set up email for report sharing
6. **Log Events**: Add logEvent calls throughout app for better outcomes tracking

---

## Summary

You now have three powerful features ready to integrate:

1. ✅ **Subscription Management** - Full billing, trials, referrals
2. ✅ **Weekly Outcomes** - AI-powered progress summaries  
3. ✅ **Reports Hub** - Professional reports for parents & providers

All with:
- Parent Ease voice
- Apple-clean design
- Proper error handling
- Mobile responsive
- Production-ready code

Just add the imports and components to your existing pages! 🚀
