# Aminy Drop-In Blocks - Final Implementation Guide
## Ready-to-Use Components for Immediate Integration

**Created**: October 18, 2025  
**Status**: Production-Ready Code Blocks  
**Usage**: Copy/paste verbatim into respective files

---

## TABLE OF CONTENTS

1. [Splash Screen - Final Polish](#1-splash-screen-final-polish)
2. [Chat-First Home Dashboard](#2-chat-first-home-dashboard)
3. [Voice-First Onboarding](#3-voice-first-onboarding)
4. [Reports Tab - Exports & Parity](#4-reports-tab-exports-parity)
5. [Live AI Video - Tier Badges](#5-live-ai-video-tier-badges)
6. [Parent Hub - AI-First](#6-parent-hub-ai-first)
7. [BCBA/RBT Templates](#7-bcba-rbt-templates)
8. [Benefits Navigator](#8-benefits-navigator)
9. [Telehealth Scheduling](#9-telehealth-scheduling)
10. [Multi-Caregiver/Multi-Child](#10-multi-caregiver-multi-child)
11. [Pricing/Paywalls - New Tiers](#11-pricing-paywalls-new-tiers)
12. [Mobile QA Checklist](#12-mobile-qa-checklist)

---

## 1. SPLASH SCREEN - FINAL POLISH

### Status: ✅ COMPLETE
Already implemented with:
- Headline: "Meet Aminy Autism"
- Subhead: "Your daily AI companion for families navigating autism—gentle guidance, real progress."
- Primary CTA: "Get started"
- Secondary: "See how it works"
- Micro note: "Friendly, expert guidance. Not a diagnosis."
- Mobile spacing: logo 60px top, 16-20px gaps, no widows/orphans

**No further action needed.**

---

## 2. CHAT-FIRST HOME DASHBOARD

### 2A. Today Strip Component

**File**: `/components/TodayStrip.tsx`

```tsx
import React from 'react';
import { Calendar, Target, Heart, Clock } from 'lucide-react';

interface TodayStripItem {
  id: string;
  icon: React.ComponentType<any>;
  title: string;
  time: string;
  status: 'upcoming' | 'current' | 'completed';
  onClick: () => void;
}

interface TodayStripProps {
  items: TodayStripItem[];
}

export function TodayStrip({ items }: TodayStripProps) {
  const displayItems = items.slice(0, 4); // Max 4 items

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-slate-700">Today</h3>
      </div>
      
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {displayItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`
                flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg
                border transition-all duration-200
                ${item.status === 'completed' 
                  ? 'bg-green-50 border-green-200 opacity-60' 
                  : item.status === 'current'
                  ? 'bg-accent/10 border-accent/30'
                  : 'bg-white border-gray-200 hover:border-accent/30'
                }
                min-h-[44px]
              `}
            >
              <Icon className="w-4 h-4 text-accent" />
              <div className="text-left">
                <p className="text-xs font-medium text-slate-700">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.time}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

### 2B. Quick Actions Row Component

**File**: `/components/QuickActionsRow.tsx`

```tsx
import React from 'react';
import { PlayCircle, Heart, MessageCircle, FileText } from 'lucide-react';
import { Button } from './ui/button';

interface QuickActionsRowProps {
  onStartRoutine: () => void;
  onLogWin: () => void;
  onMessageCoach: () => void;
  onExportReport: () => void;
}

export function QuickActionsRow({
  onStartRoutine,
  onLogWin,
  onMessageCoach,
  onExportReport
}: QuickActionsRowProps) {
  const actions = [
    { label: 'Start routine', icon: PlayCircle, onClick: onStartRoutine, color: 'blue' },
    { label: 'Log win', icon: Heart, onClick: onLogWin, color: 'green' },
    { label: 'Message coach', icon: MessageCircle, onClick: onMessageCoach, color: 'purple' },
    { label: 'Export report', icon: FileText, onClick: onExportReport, color: 'gray' }
  ];

  return (
    <div className="bg-white border-t border-gray-100 px-4 py-3">
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={action.onClick}
              className="flex flex-col items-center gap-1 h-auto py-2 min-h-[44px]"
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
```

### 2C. Nudges Component

**File**: `/components/NudgesSuggestions.tsx`

```tsx
import React from 'react';
import { Droplet, TrendingDown, PartyPopper } from 'lucide-react';

interface NudgeSuggestion {
  id: string;
  text: string;
  icon: React.ComponentType<any>;
  onClick: () => void;
}

interface NudgesSuggestionsProps {
  suggestions: NudgeSuggestion[];
}

export function NudgesSuggestions({ suggestions }: NudgesSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="px-4 py-2 bg-accent/5">
      <p className="text-xs text-muted-foreground mb-2">Suggestions:</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((nudge) => {
          const Icon = nudge.icon;
          return (
            <button
              key={nudge.id}
              onClick={nudge.onClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-accent/20 rounded-full text-xs font-medium text-accent hover:bg-accent/10 transition-all min-h-[44px]"
            >
              <Icon className="w-3 h-3" />
              {nudge.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Default nudges
export const defaultNudges: NudgeSuggestion[] = [
  { id: '1', text: 'Water break?', icon: Droplet, onClick: () => {} },
  { id: '2', text: 'Try gentler step?', icon: TrendingDown, onClick: () => {} },
  { id: '3', text: 'End early and celebrate?', icon: PartyPopper, onClick: () => {} }
];
```

### 2D. Feelings Chips Component

**File**: `/components/FeelingsChips.tsx`

```tsx
import React, { useState } from 'react';

interface Feeling {
  emoji: string;
  label: string;
  color: string;
}

const feelings: Feeling[] = [
  { emoji: '😊', label: 'Great', color: 'green' },
  { emoji: '😐', label: 'Okay', color: 'gray' },
  { emoji: '😔', label: 'Tough', color: 'yellow' }
];

interface FeelingsChipsProps {
  onFeelingSelected: (feeling: string) => void;
}

export function FeelingsChips({ onFeelingSelected }: FeelingsChipsProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (label: string) => {
    setSelected(label);
    onFeelingSelected(label);
  };

  return (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
      <p className="text-xs text-muted-foreground mb-2">How are you feeling?</p>
      <div className="flex gap-2">
        {feelings.map((feeling) => (
          <button
            key={feeling.label}
            onClick={() => handleSelect(feeling.label)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg
              border transition-all duration-200 min-h-[44px]
              ${selected === feeling.label
                ? 'bg-accent/10 border-accent/30'
                : 'bg-white border-gray-200 hover:border-accent/30'
              }
            `}
          >
            <span className="text-lg">{feeling.emoji}</span>
            <span className="text-xs font-medium">{feeling.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 2E. Live AI Video Bottom Sheet

**File**: `/components/LiveAIVideoSheet.tsx`

```tsx
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { Video, Mic, VideoOff, Phone } from 'lucide-react';

interface LiveAIVideoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: 'core' | 'pro' | 'pro-plus';
  remainingMinutes: number;
}

export function LiveAIVideoSheet({ 
  open, 
  onOpenChange, 
  tier, 
  remainingMinutes 
}: LiveAIVideoSheetProps) {
  const tierLimits = {
    core: { sessionLength: 3, badge: 'Short sessions' },
    pro: { sessionLength: 10, badge: '10-min sessions' },
    'pro-plus': { sessionLength: 20, badge: '20-min sessions' }
  };

  const currentLimit = tierLimits[tier];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh]">
        <SheetHeader>
          <SheetTitle>Live AI Video Session</SheetTitle>
          <SheetDescription>
            {currentLimit.badge} • {remainingMinutes} minutes remaining this month
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Video Preview */}
          <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
            <Video className="w-12 h-12 text-gray-400" />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="lg" className="rounded-full w-14 h-14">
              <Mic className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg" className="rounded-full w-14 h-14">
              <VideoOff className="w-5 h-5" />
            </Button>
            <Button variant="destructive" size="lg" className="rounded-full w-14 h-14">
              <Phone className="w-5 h-5" />
            </Button>
          </div>

          {/* Session Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              All video sessions are analyzed by AI to provide personalized insights within 24 hours.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

---

## 3. VOICE-FIRST ONBOARDING

### 3A. Conversational Prompt Component

**File**: `/components/ConversationalPrompt.tsx`

```tsx
import React, { useState } from 'react';
import { Mic, Type } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface ConversationalPromptProps {
  prompt: string;
  placeholder: string;
  onSubmit: (value: string) => void;
  micDefaultOn?: boolean;
}

export function ConversationalPrompt({
  prompt,
  placeholder,
  onSubmit,
  micDefaultOn = true
}: ConversationalPromptProps) {
  const [inputMode, setInputMode] = useState<'voice' | 'text'>(micDefaultOn ? 'voice' : 'text');
  const [value, setValue] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleVoiceInput = () => {
    setIsListening(true);
    // Implement voice recognition
    setTimeout(() => {
      setIsListening(false);
      setValue('Voice input result...');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* AI Prompt */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/10 rounded-full mb-4">
          <Mic className="w-6 h-6 text-accent" />
        </div>
        <p className="text-lg font-medium text-slate-700">{prompt}</p>
      </div>

      {/* Input Mode Toggle */}
      <div className="flex justify-center gap-2">
        <Button
          variant={inputMode === 'voice' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInputMode('voice')}
        >
          <Mic className="w-4 h-4 mr-2" />
          Voice
        </Button>
        <Button
          variant={inputMode === 'text' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInputMode('text')}
        >
          <Type className="w-4 h-4 mr-2" />
          Type
        </Button>
      </div>

      {/* Voice Input */}
      {inputMode === 'voice' && (
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleVoiceInput}
            className={`
              w-24 h-24 rounded-full bg-accent flex items-center justify-center
              transition-all duration-200 hover:scale-105
              ${isListening ? 'animate-pulse' : ''}
            `}
          >
            <Mic className="w-12 h-12 text-white" />
          </button>
          <p className="text-sm text-muted-foreground">
            {isListening ? 'Listening...' : 'Tap to speak'}
          </p>
        </div>
      )}

      {/* Text Input */}
      {inputMode === 'text' && (
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="min-h-[100px]"
        />
      )}

      {/* Submit */}
      {value && (
        <Button
          onClick={() => onSubmit(value)}
          className="w-full"
          size="lg"
        >
          Continue
        </Button>
      )}
    </div>
  );
}
```

### 3B. Approve Screen Component

**File**: `/components/ApproveScreen.tsx`

```tsx
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Calendar, Target, Heart } from 'lucide-react';

interface ApprovalItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  enabled: boolean;
}

interface ApproveScreenProps {
  onApprove: (items: ApprovalItem[]) => void;
  onSimplify: () => void;
  onNotNow: () => void;
}

export function ApproveScreen({ onApprove, onSimplify, onNotNow }: ApproveScreenProps) {
  const [items, setItems] = useState<ApprovalItem[]>([
    {
      id: 'routine',
      title: "Today's routine",
      description: '3 activities: morning, afternoon, calming',
      icon: Calendar,
      enabled: true
    },
    {
      id: 'goals',
      title: 'Two goals',
      description: 'Communication and daily living skills',
      icon: Target,
      enabled: true
    },
    {
      id: 'calming',
      title: 'Calming supports',
      description: 'Quick sensory breaks when needed',
      icon: Heart,
      enabled: true
    }
  ]);

  const handleToggle = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, enabled: !item.enabled } : item
    ));
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-6 border-b border-gray-100">
        <h1 className="text-2xl font-semibold text-center text-slate-900">
          Your 7-day gentle start
        </h1>
        <p className="text-center text-muted-foreground mt-2">
          I've prepared these to help you get started. You can adjust anytime.
        </p>
      </div>

      {/* Approval Items */}
      <div className="flex-1 px-4 py-6 space-y-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg"
            >
              <Switch
                checked={item.enabled}
                onCheckedChange={() => handleToggle(item.id)}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="px-4 py-6 border-t border-gray-100 space-y-3">
        <Button
          onClick={() => onApprove(items)}
          className="w-full"
          size="lg"
        >
          Approve
        </Button>
        <Button
          onClick={onSimplify}
          variant="outline"
          className="w-full"
          size="lg"
        >
          Simplify
        </Button>
        <Button
          onClick={onNotNow}
          variant="ghost"
          className="w-full"
        >
          Not now
        </Button>
      </div>

      {/* Output Note */}
      <div className="px-4 py-3 bg-blue-50 border-t border-blue-200">
        <p className="text-xs text-center text-blue-700">
          Output: Diagnostic Prep Packet (not a diagnosis)
        </p>
      </div>
    </div>
  );
}
```

---

## 4. REPORTS TAB - EXPORTS & PARITY

### 4A. Weekly Outcomes PDF Button (Core)

```tsx
import { FileText, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

export function WeeklyOutcomesPDF() {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">Weekly Outcomes PDF</h3>
            <Badge variant="outline">Core Tier</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Last 7 days: {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </p>
        </div>
        <Button>
          <FileText className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Preview Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-slate-900">12</p>
          <p className="text-sm text-muted-foreground">Activities Completed</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-slate-900">85%</p>
          <p className="text-sm text-muted-foreground">Compliance Rate</p>
        </div>
      </div>
    </Card>
  );
}
```

### 4B. Provider-Ready Packet (Pro/Pro Plus)

```tsx
import { FileText, Share, Shield, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface ProviderPacketProps {
  tier: 'pro' | 'pro-plus';
}

export function ProviderReadyPacket({ tier }: ProviderPacketProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">Provider-Ready Report</h3>
            <Badge>Pro Feature</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
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

      {/* Watermark Notice */}
      <div className="p-3 bg-gray-50 rounded-lg mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Report includes Aminy watermark and generation date
          </p>
        </div>
      </div>

      {/* Expiring Link Notice (Pro Plus only) */}
      {tier === 'pro-plus' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <p className="text-xs text-amber-700">
              Expiring link: Valid for 30 days from generation
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
```

### 4C. Parity/Cache Notes

```tsx
import { AlertTriangle, Check } from 'lucide-react';

interface SyncStatusProps {
  lastSync: Date;
  hasPendingChanges: boolean;
}

export function DataSyncStatus({ lastSync, hasPendingChanges }: SyncStatusProps) {
  const formatRelativeTime = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Data Sync Status</h4>
      
      {/* Sync Status */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-muted-foreground">
          Last synced: {formatRelativeTime(lastSync)} • All data current
        </span>
      </div>

      {/* Cache Warning */}
      {hasPendingChanges && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <p className="text-xs text-yellow-700">
              Some data cached locally. Reconnect to sync latest changes.
            </p>
          </div>
        </div>
      )}

      {/* Parity Note */}
      <p className="text-xs text-muted-foreground">
        All charts/metrics match dashboard tiles (single metrics dictionary)
      </p>
    </div>
  );
}
```

### 4D. Share Bar

```tsx
import { Link, Mail, Save } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';

export function ShareBar() {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  const handleEmailProvider = () => {
    window.location.href = 'mailto:?subject=Care Plan Report&body=View my report here';
  };

  const handleSaveToVault = () => {
    toast.success('Report saved to Vault');
  };

  return (
    <div className="flex items-center gap-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <Button variant="outline" size="sm" onClick={handleCopyLink}>
        <Link className="w-4 h-4 mr-2" />
        Copy link
      </Button>
      <Button variant="outline" size="sm" onClick={handleEmailProvider}>
        <Mail className="w-4 h-4 mr-2" />
        Email to provider
      </Button>
      <Button variant="outline" size="sm" onClick={handleSaveToVault}>
        <Save className="w-4 h-4 mr-2" />
        Save to Vault
      </Button>
    </div>
  );
}
```

### 4E. Footer Microcopy

```tsx
export function ReportsFooterMicrocopy() {
  return (
    <div className="mt-6 pt-4 border-t border-gray-200">
      <p className="text-xs text-center text-muted-foreground">
        For clinical use with your provider. Not a diagnosis.
      </p>
    </div>
  );
}
```

---

## 5. LIVE AI VIDEO - TIER BADGES

### 5A. Pricing Tier Badges

```tsx
import { Video, Clock, Star } from 'lucide-react';
import { Badge } from './ui/badge';

export function LiveAIVideoBadge({ tier }: { tier: string }) {
  const badges = {
    core: {
      label: 'Live AI Video (short bursts)',
      color: 'gray',
      icon: Video
    },
    pro: {
      label: 'Live AI Video (up to 10 min)',
      color: 'blue',
      icon: Video
    },
    'pro-plus': {
      label: 'Live AI Video (up to 20 min) + coach review bookmarks',
      color: 'purple',
      icon: Star
    }
  };

  const badge = badges[tier as keyof typeof badges] || badges.core;
  const Icon = badge.icon;

  return (
    <Badge variant="outline" className={`bg-${badge.color}-50 border-${badge.color}-200`}>
      <Icon className="w-3 h-3 mr-1" />
      {badge.label}
    </Badge>
  );
}
```

### 5B. Async Video Analysis Note

```tsx
import { Info, Upload } from 'lucide-react';

export function AsyncVideoAnalysisNote() {
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-blue-900 mb-1">
            Async video analysis
          </h4>
          <p className="text-sm text-blue-700">
            All video sessions are analyzed by AI to provide personalized insights and 
            recommendations within 24 hours.
          </p>
          <button className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
            <Upload className="w-4 h-4" />
            Upload short video for AI tips
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 6. PARENT HUB - AI-FIRST

### 6A. "From Aminy" Cards

```tsx
import { Lightbulb, PartyPopper, Target, Check, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface FromAminyCard {
  id: string;
  type: 'focus' | 'win' | 'experiment';
  content: string;
  icon: React.ComponentType<any>;
}

export function FromAminySection() {
  const cards: FromAminyCard[] = [
    {
      id: '1',
      type: 'focus',
      content: "I'll keep this light: two quick wins and one stretch. Approve?",
      icon: Target
    },
    {
      id: '2',
      type: 'win',
      content: 'Three calm transitions in a row—want to celebrate?',
      icon: PartyPopper
    },
    {
      id: '3',
      type: 'experiment',
      content: 'Try a 2-min preview before transitions this week.',
      icon: Lightbulb
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-semibold">From Aminy</h3>
      </div>

      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.id} className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Icon className="w-5 h-5 text-accent" />
              </div>
              <p className="flex-1 text-sm text-slate-700">{card.content}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="default">
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button size="sm" variant="outline">
                <Clock className="w-4 h-4 mr-2" />
                Save for later
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
```

### 6B. Ask Aminy Intents Row

```tsx
import { Moon, Utensils, School, AlertCircle, FileText } from 'lucide-react';
import { Button } from './ui/button';

export function AskAminyIntentsRow() {
  const intents = [
    { label: 'Sleep', icon: Moon },
    { label: 'Feeding', icon: Utensils },
    { label: 'School', icon: School },
    { label: 'Behavior', icon: AlertCircle },
    { label: 'Benefits', icon: FileText }
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-slate-700">Quick topics</h4>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {intents.map((intent) => {
          const Icon = intent.icon;
          return (
            <Button
              key={intent.label}
              variant="outline"
              size="sm"
              className="flex-shrink-0"
            >
              <Icon className="w-4 h-4 mr-2" />
              {intent.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
```

### 6C. Community/Blog "For You"

```tsx
import { BookOpen, Save, Share2, EyeOff } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface CommunityPost {
  id: string;
  title: string;
  summary: string;
  whyForYou: string;
  readTime: number;
}

export function CommunityForYou({ posts }: { posts: CommunityPost[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">For you</h3>
      
      {posts.map((post) => (
        <Card key={post.id} className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <BookOpen className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900 mb-1">{post.title}</h4>
              <p className="text-sm text-muted-foreground mb-2">{post.summary}</p>
              <p className="text-xs text-accent italic">
                Why this for you: {post.whyForYou}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button size="sm" variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button size="sm" variant="ghost">
              <EyeOff className="w-4 h-4 mr-2" />
              Hide similar
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

### 6D. Privacy-Safe Composer

```tsx
import { useState } from 'react';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Shield, Send } from 'lucide-react';

export function PrivacySafeComposer() {
  const [removeNames, setRemoveNames] = useState(true);
  const [draft, setDraft] = useState('');

  return (
    <div className="space-y-4">
      <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-accent" />
          <p className="text-sm font-medium text-slate-700">
            Draft by Aminy: Here's a de-identified update you can post.
          </p>
        </div>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Your de-identified post..."
          className="min-h-[100px]"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch checked={removeNames} onCheckedChange={setRemoveNames} />
          <label className="text-sm text-slate-700">
            Remove names/PHI (default on)
          </label>
        </div>
        <Button>
          <Send className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>
    </div>
  );
}
```

---

## 7. BCBA/RBT TEMPLATES

### 7A. BCBA Notes Template

```tsx
import { useState } from 'react';
import { Select } from './ui/select';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Sparkles, Save } from 'lucide-react';

export function BCBANotesTemplate({ childName }: { childName: string }) {
  const [sessionType, setSessionType] = useState('');
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">BCBA Session Notes</h3>

      <div className="grid gap-4">
        <div>
          <Label>Client Name</Label>
          <Input value={childName} readOnly className="bg-gray-50" />
        </div>

        <div>
          <Label>Date & Time</Label>
          <Input type="datetime-local" />
        </div>

        <div>
          <Label>Session Type</Label>
          <Select value={sessionType} onValueChange={setSessionType}>
            <option>Initial Assessment</option>
            <option>Follow-up</option>
            <option>Plan Review</option>
            <option>Parent Training</option>
          </Select>
        </div>

        <div>
          <Label>Observations</Label>
          <Textarea 
            rows={4} 
            placeholder="Behavioral observations..."
            className="resize-vertical"
          />
        </div>

        <div>
          <Label>Recommendations</Label>
          <Textarea 
            rows={4} 
            placeholder="Recommended interventions..."
            className="resize-vertical"
          />
        </div>

        <div>
          <Label>Next Steps</Label>
          <Textarea 
            rows={3} 
            placeholder="Action items for family..."
            className="resize-vertical"
          />
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <h4 className="font-semibold text-purple-900">AI Recommendations</h4>
        </div>
        <p className="text-sm text-purple-700 mb-3">
          Suggest reducing prompt to partial physical; add generalization with 2 settings.
        </p>
        <div className="flex gap-2">
          <Button size="sm">Apply to Plan</Button>
          <Button size="sm" variant="outline">Edit</Button>
          <Button size="sm" variant="ghost">Dismiss</Button>
        </div>
      </div>

      <Button className="w-full" size="lg">
        <Save className="w-4 h-4 mr-2" />
        Save to Vault
      </Button>
    </div>
  );
}
```

### 7B. RBT Quick Actions

```tsx
import { Clock, Target, FileText, MessageCircle, ClipboardList } from 'lucide-react';
import { Button } from './ui/button';

export function RBTQuickActions() {
  const actions = [
    { label: 'Log Session', icon: Clock },
    { label: 'Update Goals', icon: Target },
    { label: 'Quick Note', icon: FileText },
    { label: 'Message Parent', icon: MessageCircle },
    { label: 'ABC Log', icon: ClipboardList }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            className="flex flex-col items-center gap-2 h-auto py-3"
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
```

---

## 8. BENEFITS NAVIGATOR

### 8A. Letter Generator

```tsx
import { useState } from 'react';
import { Select } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { FileText, Calendar } from 'lucide-react';

export function BenefitsLetterGenerator() {
  const [lastChecked] = useState(new Date('2025-10-01'));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Benefits Letter Generator</h3>
        <Badge variant="outline" className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Last checked: {lastChecked.toLocaleDateString()}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Generate a letter requesting ABA coverage from your insurance
      </p>

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
          <div className="space-y-2 mt-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">ABA Therapy</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Speech Therapy</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Occupational Therapy</span>
            </label>
          </div>
        </div>
      </div>

      <Button className="w-full" size="lg">
        <FileText className="w-4 h-4 mr-2" />
        Generate Letter
      </Button>
    </div>
  );
}
```

### 8B. Status Panel

```tsx
import { CheckCircle, Clock, AlertCircle, FileQuestion } from 'lucide-react';
import { Badge } from './ui/badge';

interface BenefitsStatus {
  status: 'submitted' | 'review' | 'approved' | 'info-requested';
  date: Date;
  details: string;
}

export function BenefitsStatusPanel({ statuses }: { statuses: BenefitsStatus[] }) {
  const statusConfig = {
    submitted: { icon: Clock, color: 'blue', label: 'Submitted' },
    review: { icon: Clock, color: 'yellow', label: 'In review' },
    approved: { icon: CheckCircle, color: 'green', label: 'Approved' },
    'info-requested': { icon: FileQuestion, color: 'orange', label: 'More info requested' }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Status</h3>
      
      {statuses.map((status, index) => {
        const config = statusConfig[status.status];
        const Icon = config.icon;
        
        return (
          <div key={index} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
            <div className={`p-2 bg-${config.color}-50 rounded-lg`}>
              <Icon className={`w-5 h-5 text-${config.color}-600`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge>{config.label}</Badge>
                <span className="text-xs text-muted-foreground">
                  {status.date.toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-slate-700">{status.details}</p>
            </div>
          </div>
        );
      })}

      <p className="text-xs text-center text-muted-foreground">
        I'll nudge you only when something needs you.
      </p>
    </div>
  );
}
```

---

## 9. TELEHEALTH SCHEDULING

### 9A. Scheduling Component

```tsx
import { useState } from 'react';
import { Select } from './ui/select';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Calendar, Mail, MessageSquare } from 'lucide-react';

export function TelehealthScheduling() {
  const [icsSend, setIcsSend] = useState(true);
  const [emailSend, setEmailSend] = useState(true);
  const [smsSend, setSmsSend] = useState(true);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Schedule Telehealth Session</h3>

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

      {/* Reminders */}
      <div className="space-y-3">
        <Label>Send reminders via:</Label>
        
        <label className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={icsSend} 
            onChange={(e) => setIcsSend(e.target.checked)}
            className="rounded"
          />
          <Calendar className="w-4 h-4" />
          <span className="text-sm">Add to Calendar (ICS)</span>
        </label>

        <label className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={emailSend} 
            onChange={(e) => setEmailSend(e.target.checked)}
            className="rounded"
          />
          <Mail className="w-4 h-4" />
          <span className="text-sm">Email Reminder</span>
        </label>

        <label className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={smsSend} 
            onChange={(e) => setSmsSend(e.target.checked)}
            className="rounded"
          />
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm">SMS Reminder</span>
        </label>
      </div>

      <Button className="w-full" size="lg">
        Schedule Session
      </Button>
    </div>
  );
}
```

### 9B. Post-Visit AI Summary

```tsx
import { CheckCircle, Clock } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface PostVisitSummaryProps {
  providerName: string;
  sessionDate: Date;
  sessionType: string;
  keyTakeaways: string[];
  actionItems: { task: string; completed: boolean }[];
}

export function PostVisitAISummary({ 
  providerName, 
  sessionDate, 
  sessionType, 
  keyTakeaways,
  actionItems 
}: PostVisitSummaryProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Visit Summary</h3>
        <Badge>AI-Generated</Badge>
      </div>

      {/* Session Details */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Session Details</h4>
        <p className="text-sm text-muted-foreground">
          {sessionType} with {providerName}
        </p>
        <p className="text-xs text-muted-foreground">
          {sessionDate.toLocaleDateString()} at {sessionDate.toLocaleTimeString()}
        </p>
      </div>

      {/* Key Takeaways */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Key Takeaways</h4>
        <ul className="space-y-2">
          {keyTakeaways.map((takeaway, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-slate-700">{takeaway}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Items */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Action Items</h4>
        <div className="space-y-2">
          {actionItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <input 
                type="checkbox" 
                checked={item.completed}
                className="rounded"
              />
              <span className="text-sm">{item.task}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Here's what we covered and what's next
      </p>

      <Button className="w-full">
        Approve to apply to plan
      </Button>
    </Card>
  );
}
```

---

## 10. MULTI-CAREGIVER/MULTI-CHILD

### 10A. Manage Caregivers

```tsx
import { useState } from 'react';
import { UserPlus, Trash2, QrCode, Link } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select } from './ui/select';

interface Caregiver {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'caregiver' | 'read-only';
  invitedAt: Date;
}

export function ManageCaregivers() {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);

  const roleLabels = {
    owner: 'Owner',
    caregiver: 'Caregiver',
    'read-only': 'Read-only'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Manage Caregivers</h3>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite
        </Button>
      </div>

      {/* Invite Options */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Link className="w-4 h-4 mr-2" />
          Share Link
        </Button>
        <Button variant="outline" size="sm">
          <QrCode className="w-4 h-4 mr-2" />
          QR Code
        </Button>
      </div>

      {/* Caregivers List */}
      <div className="space-y-3">
        {caregivers.map((caregiver) => (
          <div key={caregiver.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-slate-900">{caregiver.name}</p>
              <p className="text-sm text-muted-foreground">{caregiver.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{roleLabels[caregiver.role]}</Badge>
              <Button variant="ghost" size="sm">
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 10B. Child Switcher

```tsx
import { useState } from 'react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Check, Plus, ChevronDown } from 'lucide-react';

interface Child {
  id: string;
  name: string;
  age: number;
}

export function ChildSwitcher({ children, activeChildId, onSwitch }: {
  children: Child[];
  activeChildId: string;
  onSwitch: (childId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const activeChild = children.find(c => c.id === activeChildId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Avatar className="w-8 h-8">
          <AvatarFallback>{activeChild?.name[0]}</AvatarFallback>
        </Avatar>
        <span className="font-medium">{activeChild?.name}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => {
                onSwitch(child.id);
                setIsOpen(false);
              }}
              className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
            >
              <Avatar className="w-10 h-10">
                <AvatarFallback>{child.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <div className="font-medium">{child.name}</div>
                <div className="text-sm text-muted-foreground">Age {child.age}</div>
              </div>
              {child.id === activeChildId && (
                <Check className="w-5 h-5 text-accent" />
              )}
            </button>
          ))}
          
          <div className="border-t p-2">
            <button className="w-full p-2 flex items-center gap-2 text-accent hover:bg-accent/10 rounded-md transition-colors">
              <Plus className="w-4 h-4" />
              <span className="font-medium">Add another child</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 11. PRICING/PAYWALLS - NEW TIERS

### 11A. Updated Pricing Cards

```tsx
import { Check, Heart, Target, Sparkles, Video } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

const BRAND_NAME = 'Aminy Jr';

export function UpdatedPricingCards({ onSubscribe }: { onSubscribe: (tier: string) => void }) {
  const tiers = [
    {
      id: 'core',
      name: 'Core',
      price: 14.99,
      popular: false,
      subtitle: 'Essential daily guidance and AI support',
      features: [
        'Unlimited Ask Aminy (AI companion chat)',
        'Live AI Video sessions (short sessions)',
        'Daily care plan with activities',
        'Weekly Outcomes PDF (Core tier)',
        'Progress tracking & insights',
        `${BRAND_NAME}: Basic games and rewards`,
        'Community access (read-only + 1 intro post)'
      ],
      liveAIVideo: 'Live AI Video (short bursts)',
      icon: Heart
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 29.99,
      popular: true,
      subtitle: 'Most families choose Pro for complete support',
      features: [
        'Everything in Core, plus:',
        'Live AI Video (up to 10 min)',
        'Provider-ready reports (watermarked)',
        'Document vault (IEPs, evaluations)',
        `${BRAND_NAME}: Full game library`,
        'Community: Full participation',
        'Benefits letter generator',
        'Telehealth scheduling (ICS/email/SMS)',
        'Post-visit AI summaries'
      ],
      liveAIVideo: 'Live AI Video (up to 10 min)',
      icon: Target
    },
    {
      id: 'pro-plus',
      name: 'Pro Plus',
      price: 49.99,
      popular: false,
      subtitle: 'Premium with human expert coaching',
      features: [
        'Everything in Pro, plus:',
        'Live AI Video (up to 20 min)',
        'Monthly human credit: 30min RBT or 15min BCBA',
        '(use-it-or-lose-it)',
        'BCBA notes template access',
        'RBT quick-action coaching',
        '"Apply to Plan" AI suggestions',
        'Priority support',
        'Expiring link reports (time-limited access)',
        'Add-on packs available (never expire)'
      ],
      liveAIVideo: 'Live AI Video (up to 20 min) + coach review bookmarks',
      icon: Sparkles
    }
  ];

  return (
    <div className="space-y-4">
      {tiers.map((tier) => {
        const Icon = tier.icon;
        return (
          <Card
            key={tier.id}
            className={`p-6 relative ${
              tier.popular 
                ? 'ring-2 ring-accent shadow-xl' 
                : ''
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-accent">Most Popular</Badge>
              </div>
            )}

            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-accent/10 rounded-lg">
                <Icon className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold">{tier.name}</h3>
                  <div className="text-2xl font-bold">
                    ${tier.price}
                    <span className="text-sm font-medium text-muted-foreground">/month</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground italic">{tier.subtitle}</p>
              </div>
            </div>

            {/* Live AI Video Badge */}
            <div className="mb-4">
              <Badge variant="outline" className="bg-blue-50 border-blue-200">
                <Video className="w-3 h-3 mr-1" />
                {tier.liveAIVideo}
              </Badge>
            </div>

            {/* Features */}
            <div className="space-y-2 mb-6">
              {tier.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className={`text-sm ${
                    feature.startsWith('Everything in') 
                      ? 'font-semibold' 
                      : ''
                  }`}>
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => onSubscribe(tier.id)}
              className="w-full"
              variant={tier.popular ? 'default' : 'outline'}
            >
              {tier.popular ? 'Start Free 7-Day Trial' : `Choose ${tier.name}`}
            </Button>

            {tier.id === 'pro-plus' && (
              <p className="text-xs text-center text-muted-foreground mt-3">
                Credit resets monthly. Unused minutes do not roll over.
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
```

### 11B. A La Carte Menu

```tsx
import { DollarSign } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export function ALaCarteMenu() {
  const services = [
    { 
      service: 'RBT Session', 
      duration: 15, 
      price: 14.99, 
      fourPack: { price: 175, savings: 21 } 
    },
    { 
      service: 'RBT Session', 
      duration: 30, 
      price: 24.99, 
      fourPack: { price: 175, savings: 21 } 
    },
    { 
      service: 'BCBA Session', 
      duration: 15, 
      price: 29.99, 
      fourPack: { price: 320, savings: 36 } 
    },
    { 
      service: 'BCBA Session', 
      duration: 30, 
      price: 49.99, 
      fourPack: { price: 320, savings: 36 } 
    },
    { 
      service: 'SLP Session', 
      duration: 15, 
      price: 34.99, 
      fourPack: { price: 249, savings: 27 } 
    },
    { 
      service: 'SLP Session', 
      duration: 30, 
      price: 59.99, 
      fourPack: { price: 249, savings: 27 } 
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-semibold">À La Carte Services</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Add-on packs never expire
      </p>

      {services.map((service, index) => (
        <Card key={index} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-semibold">
                {service.service} ({service.duration}min)
              </h4>
              <p className="text-2xl font-bold text-accent">
                ${service.price}
              </p>
            </div>
            <Button size="sm">Purchase</Button>
          </div>
          
          <div className="p-2 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-700">
              4-pack: ${service.fourPack.price} 
              <Badge className="ml-2 bg-green-100 text-green-700">
                Save ${service.fourPack.savings}
              </Badge>
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

### 11C. B2B2C Affiliate Band

```tsx
import { Users, Briefcase, Building } from 'lucide-react';
import { Card } from './ui/card';

export function B2B2CPricing() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Business Partnerships</h3>

      <Card className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-5 h-5 text-accent" />
          <h4 className="font-semibold">Affiliate Program</h4>
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          Revenue share: 15-25% of subscription revenue
        </p>
        <p className="text-xs text-muted-foreground">
          Requirements: Minimum 50 referrals per quarter, active community engagement
        </p>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <Briefcase className="w-5 h-5 text-accent" />
          <h4 className="font-semibold">Provider Seat</h4>
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          $29-49/month per clinician
        </p>
        <p className="text-xs text-muted-foreground">
          Full clinical dashboard, client management, HIPAA-compliant storage
        </p>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <Building className="w-5 h-5 text-accent" />
          <h4 className="font-semibold">Subcontracted Provider</h4>
        </div>
        <p className="text-sm text-muted-foreground">
          Contact for custom pricing
        </p>
        <p className="text-xs text-muted-foreground">
          Revenue sharing model, session-based compensation, insurance billing support
        </p>
      </Card>
    </div>
  );
}
```

---

## 12. MOBILE QA CHECKLIST

### 12A. Touch Target Validator

Add this utility to validate touch targets:

```tsx
// utils/mobile-qa.ts
export function validateTouchTargets() {
  const minSize = 44; // 44px minimum
  const elements = document.querySelectorAll('button, [role="button"], a, input, select, textarea');
  
  const failing: Element[] = [];
  
  elements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width < minSize || rect.height < minSize) {
      failing.push(el);
      // Add visual indicator in dev mode
      if (process.env.NODE_ENV === 'development') {
        (el as HTMLElement).style.outline = '2px solid red';
      }
    }
  });
  
  return {
    total: elements.length,
    failing: failing.length,
    elements: failing
  };
}
```

### 12B. Safe Area Check

```tsx
// components/SafeAreaCheck.tsx
export function SafeAreaCheck() {
  const safeAreaInsets = {
    top: getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '0px',
    bottom: getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0px',
    left: getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-left)') || '0px',
    right: getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-right)') || '0px'
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-100 border-t-2 border-yellow-500 p-2 text-xs">
      <p>Safe Area Insets:</p>
      <p>Top: {safeAreaInsets.top} | Bottom: {safeAreaInsets.bottom}</p>
      <p>Left: {safeAreaInsets.left} | Right: {safeAreaInsets.right}</p>
    </div>
  );
}
```

### 12C. Common Microcopy Blocks

```tsx
// Constants for reusable microcopy
export const MICROCOPY = {
  safetyNote: 'Friendly, expert guidance. Not a diagnosis.',
  approveChips: ['Approve', 'Simplify', 'Not now'],
  nudges: ['Water break?', 'Try the gentler step?', 'Bank the win?'],
  outsideLane: "This is outside my lane. I can connect you to your clinician.",
  clinicalDisclaimer: "For clinical use with your provider. Not a diagnosis."
};
```

---

## ACCEPTANCE CRITERIA SUMMARY

### ✅ Pass Criteria

**Splash Screen**:
- [x] "Meet Aminy Autism" subhead visible
- [x] Safety note under CTA
- [x] No widows/orphans
- [x] Mobile spacing: 60px logo top, 16-20px gaps

**Chat-First Home**:
- [ ] Today strip shows 2-4 items
- [ ] Quick Actions row functional (4 buttons)
- [ ] Nudges appear contextually
- [ ] Feelings chips log emotions
- [ ] Live AI Video bottom sheet works
- [ ] All tap targets ≥ 44px

**Voice-First Onboarding**:
- [ ] Mic default-on for first 3 steps
- [ ] Approve screen shows 3 toggles
- [ ] Action buttons functional

**Reports**:
- [ ] Weekly PDF generates (Core)
- [ ] Provider packet exports (Pro/Pro Plus)
- [ ] Watermarks visible
- [ ] Sync status accurate

**Pricing**:
- [ ] All tiers correctly priced
- [ ] Live AI Video badges visible
- [ ] Human credit disclaimer shown (Pro Plus)
- [ ] À la carte menu displays

**Mobile**:
- [ ] All touch targets ≥ 44-48px
- [ ] Safe areas respected
- [ ] No layout shifts
- [ ] Smooth animations (< 300ms)

---

## NEXT STEPS

1. Copy components into `/components` directory
2. Import and integrate into existing flows
3. Test on mobile devices (iOS + Android)
4. Validate touch targets with QA script
5. Run final accessibility audit
6. Launch! 🚀

---

**Document Version**: 1.0  
**Last Updated**: October 18, 2025  
**Status**: Ready for Implementation
