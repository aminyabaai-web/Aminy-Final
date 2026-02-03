# Telehealth System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         TELEHEALTH SYSTEM                        │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Credits    │  │  Scheduling  │  │   Session Notes      │  │
│  │   System     │→ │   Calendar   │→ │   + Integration      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│         │                  │                      │              │
│         ↓                  ↓                      ↓              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Global State (Zustand Store)                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           AI Brain (aminy-ai-brain.ts)                   │  │
│  │      - Consumes session data                             │  │
│  │      - Integrates into all reports                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          Generated Reports                                │  │
│  │  - Progress Reports  - BCBA Notes                         │  │
│  │  - IEP Documents    - Insurance Letters                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. TelehealthSessionManager (Main Component)
**File:** `/components/TelehealthSessionManager.tsx`

```
TelehealthSessionManager
│
├─ SessionCreditsCard
│  ├─ Credit Display (50min)
│  ├─ Credit Display (25min)
│  ├─ Progress Bars
│  ├─ Reset Timer
│  └─ Schedule Buttons
│
├─ UpcomingSessions
│  ├─ Session Cards
│  │  ├─ Provider Info
│  │  ├─ Date/Time Display
│  │  ├─ Status Badge
│  │  └─ Calendar Export Buttons
│  │     ├─ .ics Download
│  │     └─ Google Calendar Link
│  └─ Empty State
│
├─ SessionHistory
│  ├─ Completed Session Cards
│  │  ├─ Session Details
│  │  ├─ Topics Covered
│  │  ├─ Observations
│  │  ├─ Progress Updates (color-coded)
│  │  ├─ Recommendations
│  │  ├─ Next Steps
│  │  └─ Export Notes Button
│  └─ Auto-Integration Notice
│
└─ SchedulingDialog (Modal)
   ├─ Embedded Calendar (react-day-picker)
   ├─ Time Slot Selector
   ├─ Provider Selector
   ├─ Booking Summary
   └─ Confirm Button
```

### 2. TelehealthScreen (Container)
**File:** `/components/TelehealthScreen.tsx`

```
TelehealthScreen
│
├─ Header
│  ├─ Title & Description
│  └─ Tab Navigation
│     ├─ "Sessions & Credits"
│     └─ "History & Notes"
│
├─ Feature Overview Alert
│
└─ Content Area
   ├─ Tab: Sessions & Credits
   │  └─ <TelehealthSessionManager />
   │
   └─ Tab: History & Notes
      └─ Progress Report Integration Info
```

## Data Flow

### Session Scheduling Flow
```
User Action (Click "Schedule 50min")
    ↓
Credit Check (canScheduleSession)
    ↓
[Has Credit?] ── No ──→ Show Error Toast
    │                    "Credits reset in X days"
   Yes
    ↓
Open Dialog with Calendar
    ↓
User Selects: Date + Time + Provider
    ↓
Show Confirmation Summary
    ↓
User Confirms Booking
    ↓
Deduct Credit (available--, used++)
    ↓
Create ScheduledSession Object
    ↓
Save to Local State (setScheduledSessions)
    ↓
Save to Global Store (addSession)
    ↓
Show Success Toast
    ↓
Close Dialog & Reset Form
```

### Calendar Export Flow
```
User Clicks Export Button
    ↓
[Format?] ─ .ics ──→ Generate ICS File
    │                    ↓
    │                Format dates (RFC 5545)
    │                    ↓
    │                Create VEVENT
    │                    ↓
    │                Add 15min alarm
    │                    ↓
    │                Create Blob
    │                    ↓
    │                Trigger Download
    │                    ↓
    │                Show Toast
    │
    └─ Google ──→ Generate Google Calendar URL
                      ↓
                  Format query params
                      ↓
                  Open in new tab
                      ↓
                  Show Toast
```

### Session Notes → Report Integration Flow
```
Provider Completes Session
    ↓
Session Notes Added (SessionNotes object)
    ↓
Saved to Session.summary (JSON stringified)
    ↓
Session.status = 'completed'
    ↓
Stored in Global Zustand Store
    ↓
User Generates Progress Report
    ↓
buildAIContext() called
    ↓
buildTelehealthContext() pulls completed sessions
    ↓
Filters: type='telehealth' && status='completed'
    ↓
Maps to TelehealthSessionData[]
    ↓
Added to AminyAIContext.telehealthSessions
    ↓
buildReportPrompt() includes session data
    ↓
AI generates report with session insights
    ↓
Report includes:
  - Provider observations
  - Progress updates
  - Clinical recommendations
  - Parent concerns addressed
```

## State Management

### Local State (TelehealthSessionManager)
```typescript
// Credit tracking
sessionCredits: SessionCredit[]

// Scheduled sessions
scheduledSessions: ScheduledSession[]

// UI state
showScheduling: boolean
selectedSessionType: '50min' | '25min' | null
selectedDate: Date | undefined
selectedTime: string
selectedProvider: string
```

### Global State (Zustand Store)
```typescript
// In store.ts
sessions: Session[] = [
  {
    id: 's1',
    type: 'telehealth',
    scheduledAt: '2025-10-28T14:00:00Z',
    duration: 50,
    status: 'completed',
    notes: 'Session with Dr. Chen',
    summary: JSON.stringify(sessionNotesObject)
  }
]

// Actions
addSession: (session: Omit<Session, 'id'>) => void
updateSession: (id: string, updates: Partial<Session>) => void
```

### AI Context (AI Brain)
```typescript
// In aminy-ai-brain.ts
interface AminyAIContext {
  // ... other context
  telehealthSessions: TelehealthSessionData[]
}

// Built automatically when generating reports
async function buildTelehealthContext(childId: string): Promise<TelehealthSessionData[]>
```

## Type Definitions

### Core Types
```typescript
// Session Credits
interface SessionCredit {
  type: '50min' | '25min';
  available: number;  // 0 or 1
  used: number;       // 0 or 1
  total: number;      // Always 1
  resetDate: Date;    // 30 days from allocation
}

// Scheduled Session
interface ScheduledSession {
  id: string;
  type: '50min' | '25min';
  provider: string;
  date: Date;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  sessionSummary?: SessionNotes;
}

// Session Notes (Clinical)
interface SessionNotes {
  sessionId: string;
  date: Date;
  provider: string;
  duration: string;
  topics: string[];
  observations: string;
  recommendations: string[];
  nextSteps: string[];
  parentQuestions: string[];
  progress: {
    area: string;
    status: 'improved' | 'maintained' | 'needs_attention';
    notes: string;
  }[];
}

// Global Store Session
interface Session {
  id: string;
  type: 'telehealth' | 'jr' | 'live-vision';
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  summary?: string; // JSON.stringify(SessionNotes)
}

// AI Context Session
interface TelehealthSessionData {
  sessionId: string;
  date: string;
  provider: string;
  duration: number;
  type: '50min' | '25min';
  topics: string[];
  observations: string;
  recommendations: string[];
  progressUpdates: {
    area: string;
    status: 'improved' | 'maintained' | 'needs_attention';
    notes: string;
  }[];
}
```

## Integration Points

### 1. Calendar Libraries
```typescript
// Shadcn UI Calendar (wraps react-day-picker)
import { Calendar } from './ui/calendar';

// Usage
<Calendar
  mode="single"
  selected={selectedDate}
  onSelect={setSelectedDate}
  disabled={(date) => date < new Date()}
/>
```

### 2. File Generation

#### iCal (.ics)
```typescript
// RFC 5545 compliant
const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Aminy//Telehealth//EN
BEGIN:VEVENT
UID:${sessionId}@aminy.ai
DTSTART:${formatDateICS(startDate)}
DTEND:${formatDateICS(endDate)}
SUMMARY:Telehealth Session with ${provider}
DESCRIPTION:${description}
LOCATION:Aminy Video Call
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;

// Download
const blob = new Blob([icsContent], { type: 'text/calendar' });
const url = URL.createObjectURL(blob);
// ... trigger download
```

#### Google Calendar URL
```typescript
const params = new URLSearchParams({
  action: 'TEMPLATE',
  text: `Telehealth Session with ${provider}`,
  dates: `${formatGoogleDate(start)}/${formatGoogleDate(end)}`,
  details: description,
  location: 'Aminy Video Call'
});

const url = `https://calendar.google.com/calendar/render?${params}`;
window.open(url, '_blank');
```

### 3. AI Report Integration
```typescript
// In buildReportPrompt()
const telehealthSessionSummary = context.telehealthSessions.length > 0
  ? `\nTELEHEALTH SESSIONS (${context.telehealthSessions.length} completed):\n` +
    context.telehealthSessions.map(s => `
      Date: ${new Date(s.date).toLocaleDateString()}
      Provider: ${s.provider}
      Duration: ${s.duration} minutes
      Topics: ${s.topics.join(', ')}
      Observations: ${s.observations}
      Progress Updates: ${s.progressUpdates.map(p => 
        `${p.area} (${p.status}): ${p.notes}`
      ).join('; ')}
      Recommendations: ${s.recommendations.join('; ')}
    `).join('\n')
  : '';

const baseInfo = `
  CHILD INFORMATION: ...
  PROGRESS DATA: ...
  ${telehealthSessionSummary}
`;
```

## User Permissions by Tier

### Free Tier
- ❌ No telehealth access
- Upgrade prompt shown

### Core Tier
- ✅ Monthly telehealth sessions
- ✅ Basic session notes
- ❌ Limited report integration

### Pro/Premium Tier
- ✅ Full telehealth access
- ✅ 1x 50min + 1x 25min monthly
- ✅ Complete session notes
- ✅ Full report integration
- ✅ Calendar export
- ✅ Priority scheduling

## Security & Privacy

### Data Protection
- Session notes encrypted at rest
- HIPAA-compliant storage
- Secure transmission (HTTPS)
- Access controls by user

### Provider Authentication
- Licensed BCBAs only
- Credential verification
- Background checks
- Malpractice insurance

### Parent Controls
- Session consent required
- Notes review before finalization
- Opt-out available
- Data export on request

## Performance Optimizations

### Lazy Loading
```typescript
// Load calendar only when needed
const [showScheduling, setShowScheduling] = useState(false);

// Dialog with Calendar only renders when open
<Dialog open={showScheduling}>
  <CalendarUI /> {/* Only in DOM when needed */}
</Dialog>
```

### Memoization
```typescript
// Expensive calculations cached
const daysUntilReset = useMemo(() => 
  calculateDaysUntilReset(resetDate),
  [resetDate]
);
```

### Optimistic UI Updates
```typescript
// Update UI immediately, sync later
const confirmSchedule = () => {
  // 1. Update local state (instant feedback)
  setScheduledSessions(prev => [...prev, newSession]);
  
  // 2. Show success toast (instant)
  toast.success('Session scheduled!');
  
  // 3. Sync to global store (background)
  addSession(newSession);
  
  // 4. Could sync to backend (async)
  // syncToBackend(newSession);
};
```

## Error Handling

### Credit Validation
```typescript
if (!canScheduleSession(type)) {
  toast.error('No credits available', {
    description: `Credits reset in ${getDaysUntilReset()} days.`
  });
  return;
}
```

### Form Validation
```typescript
if (!selectedDate || !selectedTime || !selectedProvider) {
  toast.error('Please complete all fields');
  return;
}
```

### Graceful Degradation
```typescript
// If calendar fails to load, fallback to date input
<Suspense fallback={<Input type="date" />}>
  <Calendar />
</Suspense>
```

## Testing Strategy

### Unit Tests
- Credit calculation logic
- Date formatting functions
- ICS file generation
- Session validation

### Integration Tests
- Scheduling flow end-to-end
- Calendar export functionality
- Store integration
- AI context building

### E2E Tests
- User schedules session
- Credit deducted correctly
- Export to calendar works
- Notes integrate into reports

## Deployment Checklist

- [ ] All TypeScript types defined
- [ ] Error boundaries in place
- [ ] Loading states implemented
- [ ] Toast notifications working
- [ ] Calendar exports tested
- [ ] Mobile responsive
- [ ] Accessibility compliant
- [ ] Performance optimized
- [ ] Documentation complete
- [ ] User testing passed

---

## Quick Reference

**Entry Point:** `/components/TelehealthScreen.tsx`

**Core Logic:** `/components/TelehealthSessionManager.tsx`

**AI Integration:** `/lib/aminy-ai-brain.ts`

**State Management:** `/lib/store.ts`

**Documentation:**
- `/TELEHEALTH_INTEGRATION_COMPLETE.md`
- `/TELEHEALTH_CREDIT_SYSTEM.md`
- `/TELEHEALTH_ARCHITECTURE.md` (this file)
