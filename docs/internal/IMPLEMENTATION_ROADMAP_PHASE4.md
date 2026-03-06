# Aminy Implementation Roadmap - Phase 4
## Comprehensive Feature Updates

---

## ✅ COMPLETED: Splash Screen Updates

### Changes Made:
1. **Logo Position**: Moved down 16px with `style={{ marginTop: '16px' }}`
2. **Headline Updated**: Changed to "I'll walk with you—every step."
3. **Micro Safety Note Added**: Added under CTA button (both mobile and desktop):
   - Text: "Friendly, expert guidance. Not a diagnosis."
   - Styling: `text-xs text-muted-foreground`

---

## 🔄 PRIORITY IMPLEMENTATIONS NEEDED

### 1. DASHBOARD - Companion Chat Primary Pane

#### Current State:
- Dashboard has multiple tabs (Home, Plan, Reports, Care)
- Ask Aminy card exists but is not the primary interface

#### Required Changes:

**A. Home Tab Restructuring**
```tsx
// New Layout Structure:
<div className="dashboard-home">
  {/* Compact "Today" Strip at Top */}
  <TodayStrip items={[
    { icon: Calendar, title: "Morning routine", time: "8:00 AM" },
    { icon: Target, title: "Speech practice", time: "2:00 PM" }
  ]} 
  onItemClick={openContextualScriptInChat} />
  
  {/* Primary Companion Chat Pane (Center, Full Height) */}
  <CompanionChatPane 
    fullHeight={true}
    contextual Hints={[
      "Try gentler step?",
      "Bank the win?",
      "Schedule telehealth"
    ]}
  />
  
  {/* Quick Actions Row Under Chat Input */}
  <QuickActionsRow buttons={[
    { label: "Start routine", icon: PlayCircle },
    { label: "Log win", icon: Heart },
    { label: "Message coach", icon: MessageCircle },
    { label: "Export report", icon: FileText }
  ]} />
</div>
```

**B. Mobile Optimizations**
- Ensure 44-48px tap targets for all interactive elements
- Full-height chat on mobile (calc(100vh - nav - header))
- Bottom sheet for Live AI Video controls

**C. Nudge Suggestions Implementation**
```tsx
// Inside chat messages, add AI nudges:
const nudgeSuggestions = [
  "Try gentler step?",
  "Bank the win?",
  "Schedule telehealth",
  "Need a calming activity?",
  "Want to log this progress?"
];

// Render as clickable chips within chat
{nudgeSuggestions.map(suggestion => (
  <Button
    variant="ghost"
    size="sm"
    className="nudge-chip"
    onClick={() => handleNudgeClick(suggestion)}
  >
    {suggestion}
  </Button>
))}
```

---

### 2. ONBOARDING - Conversational Prompts & Approval Screen

#### A. Conversational Prompts (Steps 1-3)
```tsx
// Replace current form fields with voice-first interface
<div className="conversational-prompt">
  <AICompanionStrip>
    Tell me what you'd like help with. Just hit the mic and talk—I'm listening.
  </AICompanionStrip>
  
  <div className="voice-input-primary">
    <Button
      className="mic-button-large"
      variant="default"
      size="lg"
    >
      <Mic className="w-8 h-8 pulse-animation" />
    </Button>
    <p className="text-sm text-muted-foreground">
      Tap to speak or type below
    </p>
  </div>
  
  <Textarea
    placeholder="Or type here..."
    className="secondary-input"
  />
</div>
```

#### B. New "Approve" Screen (Step 4)

**Title**: "Your 7-day gentle start"

**Layout**:
```tsx
<div className="approval-screen">
  <h2>Your 7-day gentle start</h2>
  <p className="subtitle">
    I've prepared these to help you get started. You can adjust anytime.
  </p>
  
  {/* Toggleable Items */}
  <div className="approval-items space-y-4">
    <div className="approval-item">
      <Switch id="todays-routine" defaultChecked />
      <label htmlFor="todays-routine">
        <h3>Today's routine</h3>
        <p>3 activities: morning, afternoon, calming</p>
      </label>
    </div>
    
    <div className="approval-item">
      <Switch id="two-goals" defaultChecked />
      <label htmlFor="two-goals">
        <h3>Two goals</h3>
        <p>Communication and daily living skills</p>
      </label>
    </div>
    
    <div className="approval-item">
      <Switch id="calming-supports" defaultChecked />
      <label htmlFor="calming-supports">
        <h3>Calming supports</h3>
        <p>Quick sensory breaks when needed</p>
      </label>
    </div>
  </div>
  
  {/* Action Buttons */}
  <div className="approval-actions">
    <Button 
      size="lg"
      className="approve-button"
      onClick={handleApprove}
    >
      Approve
    </Button>
    <Button 
      size="lg"
      variant="outline"
      onClick={handleSimplify}
    >
      Simplify
    </Button>
    <Button 
      variant="ghost"
      onClick={handleNotNow}
    >
      Not now
    </Button>
  </div>
</div>
```

---

### 3. PRICING - New Tier Structure

#### Updated Pricing Tiers:

**A. Core ($14.99/month)**
- Unlimited Ask Aminy (AI companion chat)
- Live AI Video sessions (short sessions)
- Daily care plan with activities
- Weekly Outcomes PDF (Core tier)
- Progress tracking & insights
- Aminy Jr: Basic games and rewards
- Community access (read-only + 1 intro post)

**B. Pro ($29.99/month)** ⭐ Most Popular
- Everything in Core, plus:
- Live AI Video (10-minute sessions)
- Provider-ready reports (watermarked)
- Document vault (IEPs, evaluations)
- Aminy Jr: Full game library
- Community: Full participation
- Benefits letter generator
- Telehealth scheduling (ICS/email/SMS)
- Post-visit AI summaries

**C. Pro Plus ($49.99/month)**
- Everything in Pro, plus:
- Live AI Video (20-minute sessions)
- Monthly human credit: 30min RBT or 15min BCBA (use-it-or-lose-it)
- BCBA notes template access
- RBT quick-action coaching
- "Apply to Plan" AI suggestions
- Priority support
- Expiring link reports (time-limited access)
- Add-on packs available (never expire)

**D. Jr-Only ($14.99-$19.99/month)**
- Standalone subscription for Aminy Jr
- No parent plan features
- Just kid-friendly games and activities

#### A La Carte Menu:
```tsx
const aLaCarteServices = [
  { service: "RBT Session (30min)", price: "$49", fourPack: "$175 (save $21)" },
  { service: "BCBA Session (15min)", price: "$89", fourPack: "$320 (save $36)" },
  { service: "SLP Session (30min)", price: "$69", fourPack: "$249 (save $27)" }
];
```

#### B2B2C Pricing:
- **Affiliate Band**: 15-25% revenue share
- **Provider Seat**: $29-49/month per clinician
- **Subcontracted Provider**: Contact for pricing

---

### 4. CLINICIAN/RBT Features

#### A. BCBA Notes Template
```tsx
<div className="bcba-notes-template">
  <h3>BCBA Session Notes</h3>
  
  {/* Template Fields */}
  <div className="template-fields">
    <Label>Client Name</Label>
    <Input value={childName} readOnly />
    
    <Label>Date & Time</Label>
    <Input type="datetime-local" />
    
    <Label>Session Type</Label>
    <Select>
      <option>Initial Assessment</option>
      <option>Follow-up</option>
      <option>Plan Review</option>
    </Select>
    
    <Label>Observations</Label>
    <Textarea rows={4} placeholder="Behavioral observations..." />
    
    <Label>Recommendations</Label>
    <Textarea rows={4} placeholder="Recommended interventions..." />
    
    <Label>Next Steps</Label>
    <Textarea rows={3} placeholder="Action items for family..." />
  </div>
  
  {/* AI-Powered Suggestions */}
  <div className="ai-suggestions">
    <h4>AI Recommendations</h4>
    <Button variant="outline" size="sm">
      Apply to Plan
    </Button>
  </div>
</div>
```

#### B. RBT Quick-Action Row
```tsx
<div className="rbt-quick-actions">
  <Button size="sm" variant="outline">
    <Clock className="w-4 h-4 mr-2" />
    Log Session
  </Button>
  <Button size="sm" variant="outline">
    <Target className="w-4 h-4 mr-2" />
    Update Goals
  </Button>
  <Button size="sm" variant="outline">
    <FileText className="w-4 h-4 mr-2" />
    Quick Note
  </Button>
  <Button size="sm" variant="outline">
    <MessageCircle className="w-4 h-4 mr-2" />
    Message Parent
  </Button>
</div>
```

#### C. Vault Storage Callout
```tsx
<Card className="vault-callout">
  <div className="flex items-start gap-4">
    <Shield className="w-6 h-6 text-accent" />
    <div>
      <h3 className="font-semibold mb-1">Secure Vault Storage</h3>
      <p className="text-sm text-muted-foreground">
        All session notes are automatically saved to the family's secure vault. 
        HIPAA-compliant and encrypted.
      </p>
      <Button variant="link" className="mt-2 p-0">
        View Vault →
      </Button>
    </div>
  </div>
</Card>
```

---

### 5. REPORTS TAB Enhancements

#### A. Weekly Outcomes PDF (Core Tier)
```tsx
<Card className="weekly-report-card">
  <div className="flex items-start justify-between">
    <div>
      <h3 className="font-semibold mb-2">Weekly Outcomes PDF</h3>
      <Badge variant="outline">Core Tier Feature</Badge>
      <p className="text-sm text-muted-foreground mt-2">
        Last 7 days: {startDate} - {endDate}
      </p>
    </div>
    <Button>
      <FileText className="w-4 h-4 mr-2" />
      Download PDF
    </Button>
  </div>
  
  {/* Preview Metrics */}
  <div className="mt-4 grid grid-cols-2 gap-4">
    <div className="metric-card">
      <span className="text-2xl font-bold">12</span>
      <span className="text-sm text-muted-foreground">Activities Completed</span>
    </div>
    <div className="metric-card">
      <span className="text-2xl font-bold">85%</span>
      <span className="text-sm text-muted-foreground">Compliance Rate</span>
    </div>
  </div>
</Card>
```

#### B. Provider-Ready Packet (Pro/Pro Plus)
```tsx
<Card className="provider-packet-card">
  <div className="flex items-start justify-between">
    <div>
      <h3 className="font-semibold mb-2">Provider-Ready Report</h3>
      <Badge variant="default">Pro Feature</Badge>
      <p className="text-sm text-muted-foreground mt-2">
        Comprehensive 30-day report with professional formatting
      </p>
    </div>
    <div className="flex gap-2">
      <Button variant="outline">
        <FileText className="w-4 h-4 mr-2" />
        Watermarked PDF
      </Button>
      <Button>
        <Share className="w-4 h-4 mr-2" />
        Expiring Link
      </Button>
    </div>
  </div>
  
  {/* Watermark Badge */}
  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
    <div className="flex items-center gap-2">
      <Shield className="w-4 h-4 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">
        Report includes Aminy watermark and generation date
      </p>
    </div>
  </div>
  
  {/* Expiring Link Info */}
  {isProPlus && (
    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-600" />
        <p className="text-xs text-amber-700">
          Expiring link: Valid for 30 days from generation
        </p>
      </div>
    </div>
  )}
</Card>
```

#### C. Parity/Cache Notes
```tsx
<div className="parity-notes mt-4">
  <h4 className="text-sm font-medium mb-2">Data Sync Status</h4>
  <div className="flex items-center gap-2">
    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
    <span className="text-xs text-muted-foreground">
      Last synced: {lastSyncTime} • All data current
    </span>
  </div>
  
  {cacheWarning && (
    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
      <p className="text-xs text-yellow-700">
        ⚠️ Some data cached locally. Reconnect to sync latest changes.
      </p>
    </div>
  )}
</div>
```

---

### 6. BENEFITS/TELEHEALTH Features

#### A. Benefits Letter Generator
```tsx
<Card className="letter-generator-card">
  <h3 className="font-semibold mb-4">Benefits Letter Generator</h3>
  
  <div className="flex items-center justify-between mb-4">
    <div>
      <p className="text-sm text-muted-foreground">
        Generate a letter requesting ABA coverage from your insurance
      </p>
    </div>
    <Badge variant="outline">
      Last checked: {lastCheckDate}
    </Badge>
  </div>
  
  {/* Form Fields */}
  <div className="space-y-4">
    <div>
      <Label>Insurance Provider</Label>
      <Select>
        <option>Select your insurance...</option>
        <option>Aetna</option>
        <option>Blue Cross Blue Shield</option>
        <option>Cigna</option>
        <option>UnitedHealthcare</option>
        <option>Other</option>
      </Select>
    </div>
    
    <div>
      <Label>Provider Name (if known)</Label>
      <Input placeholder="e.g., Dr. Smith" />
    </div>
    
    <div>
      <Label>Services Requesting</Label>
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" />
          <span className="text-sm">ABA Therapy</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" />
          <span className="text-sm">Speech Therapy</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" />
          <span className="text-sm">Occupational Therapy</span>
        </label>
      </div>
    </div>
  </div>
  
  <Button className="w-full mt-6">
    Generate Letter
  </Button>
</Card>
```

#### B. Telehealth Scheduling
```tsx
<Card className="telehealth-scheduling-card">
  <h3 className="font-semibold mb-4">Schedule Telehealth Session</h3>
  
  <div className="space-y-4">
    <div>
      <Label>Session Type</Label>
      <Select>
        <option>RBT Check-in (30min)</option>
        <option>BCBA Consultation (15min)</option>
        <option>BCBA Deep Dive (50min)</option>
      </Select>
    </div>
    
    <div>
      <Label>Preferred Date & Time</Label>
      <Input type="datetime-local" />
    </div>
    
    <div>
      <Label>Reason for Session</Label>
      <Textarea 
        rows={3}
        placeholder="Brief description of what you'd like to discuss..."
      />
    </div>
  </div>
  
  {/* Scheduling Options */}
  <div className="mt-6 space-y-2">
    <Button className="w-full">
      <Calendar className="w-4 h-4 mr-2" />
      Add to Calendar (ICS)
    </Button>
    <Button variant="outline" className="w-full">
      <Mail className="w-4 h-4 mr-2" />
      Send Email Reminder
    </Button>
    <Button variant="outline" className="w-full">
      <MessageCircle className="w-4 h-4 mr-2" />
      SMS Reminder
    </Button>
  </div>
</Card>
```

#### C. Post-Visit AI Summary
```tsx
<Card className="post-visit-summary">
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-semibold">Visit Summary</h3>
    <Badge>AI-Generated</Badge>
  </div>
  
  <div className="space-y-4">
    <div>
      <h4 className="text-sm font-medium mb-2">Session Details</h4>
      <p className="text-sm text-muted-foreground">
        30-minute RBT check-in with {providerName}
      </p>
      <p className="text-xs text-muted-foreground">
        {sessionDate} at {sessionTime}
      </p>
    </div>
    
    <div>
      <h4 className="text-sm font-medium mb-2">Key Takeaways</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          <span>Continue morning routine with visual schedule</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          <span>Add 5-minute sensory break before transitions</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          <span>Track meltdown triggers for next session</span>
        </li>
      </ul>
    </div>
    
    <div>
      <h4 className="text-sm font-medium mb-2">Action Items</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
          <input type="checkbox" />
          <span className="text-sm">Update care plan with new strategies</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
          <input type="checkbox" />
          <span className="text-sm">Schedule follow-up in 2 weeks</span>
        </div>
      </div>
    </div>
  </div>
</Card>
```

---

## IMPLEMENTATION PRIORITY ORDER

1. **Phase 4A - Critical UX** (Week 1)
   - ✅ Splash Screen updates (COMPLETE)
   - Pricing tier updates
   - Onboarding approval screen

2. **Phase 4B - Dashboard Overhaul** (Week 2)
   - Companion chat primary pane
   - Today strip implementation
   - Quick actions row
   - Nudge suggestions

3. **Phase 4C - Professional Features** (Week 3)
   - BCBA notes template
   - RBT quick actions
   - Provider-ready reports
   - Benefits letter generator

4. **Phase 4D - Advanced Features** (Week 4)
   - Telehealth scheduling
   - Post-visit summaries
   - Expiring link reports
   - Live AI Video bottom sheet

---

## TECHNICAL CONSIDERATIONS

### Mobile Touch Targets
- All buttons: `min-h-[44px] sm:min-h-[48px]`
- Interactive areas: `min-w-[44px] sm:min-w-[48px]`
- Tap target optimization: `-webkit-tap-highlight-color: rgba(8, 145, 178, 0.2)`

### Bottom Sheet Implementation
```tsx
<Sheet open={showLiveAIVideo} onOpenChange={setShowLiveAIVideo}>
  <SheetContent side="bottom" className="h-[90vh]">
    <SheetHeader>
      <SheetTitle>Live AI Video Session</SheetTitle>
      <SheetDescription>
        10-minute session • {creditsRemaining} credits remaining
      </SheetDescription>
    </SheetHeader>
    
    <div className="video-container mt-4">
      {/* Video interface */}
    </div>
    
    <div className="controls-row">
      <Button variant="outline">
        <Mic className="w-4 h-4 mr-2" />
        Mute
      </Button>
      <Button variant="outline">
        <Video className="w-4 h-4 mr-2" />
        Camera Off
      </Button>
      <Button variant="destructive">
        End Session
      </Button>
    </div>
  </SheetContent>
</Sheet>
```

### Responsive Layout Breakpoints
- Mobile: `< 640px`
- Tablet: `640px - 768px`
- Desktop: `> 768px`

---

## NEXT STEPS

1. Review this roadmap and prioritize features
2. Begin implementation with Phase 4A (pricing updates)
3. Create component files for new features:
   - `/components/TodayStrip.tsx`
   - `/components/CompanionChatPane.tsx`
   - `/components/QuickActionsRow.tsx`
   - `/components/ApprovalScreen.tsx`
   - `/components/BCBANotesTemplate.tsx`
   - `/components/BenefitsLetterGenerator.tsx`
   - `/components/TelehealthScheduler.tsx`

4. Update existing files:
   - `/components/Dashboard.tsx` - Major restructuring
   - `/components/OnboardingFlow5Steps.tsx` - Add approval screen
   - `/components/PaywallScreen.tsx` - New pricing
   - `/components/ReportsTab.tsx` - New report types

---

**Status**: Phase 4 Roadmap Complete
**Last Updated**: December 2024
**Next Review**: After Phase 4A completion
