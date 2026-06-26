import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  CheckCircle,
  MessageCircle,
  TrendingUp,
  Calendar,
  Heart,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface VisitSummaryCardProps {
  parentSummary: string;
  childName: string;
  providerName: string;
  sessionDate: string;
  sessionType: string;
  durationMinutes: number;
  goals: { title: string; progressPct: number }[];
  wins: string[];
  metrics?: { accuracy: number; engagement: number; goalProgress: number };
  acknowledged?: boolean;
  onAcknowledge?: () => void;
  onAskQuestion?: () => void;
}

// ============================================================================
// Session Type Labels
// ============================================================================

const SESSION_TYPE_LABELS: Record<string, string> = {
  aba: 'ABA Therapy',
  speech: 'Speech Therapy',
  ot: 'Occupational Therapy',
  'mental-health': 'Mental Health',
  eval: 'Evaluation',
};

// ============================================================================
// Component
// ============================================================================

export function VisitSummaryCard({
  parentSummary,
  childName,
  providerName,
  sessionDate,
  sessionType,
  durationMinutes,
  goals,
  wins,
  metrics,
  acknowledged: initialAcknowledged = false,
  onAcknowledge,
  onAskQuestion,
}: VisitSummaryCardProps) {
  const [acknowledged, setAcknowledged] = useState(initialAcknowledged);

  const typeLabel = SESSION_TYPE_LABELS[sessionType] || sessionType;
  const formattedDate = new Date(sessionDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleAcknowledge = () => {
    setAcknowledged(true);
    onAcknowledge?.();
    toast.success('Thank you! Your acknowledgment has been recorded.');
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6B9080] to-[#2A7D99] px-5 py-4 text-white">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold">{childName}'s Visit Summary</h3>
            <p className="text-teal-100 text-sm">{typeLabel} with {providerName}</p>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 text-sm">
            <Calendar className="w-3 h-3 mr-1" />
            {formattedDate}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-2 text-sm text-teal-100">
          <span>{durationMinutes} minutes</span>
          {acknowledged && (
            <Badge className="bg-emerald-400/30 text-white border-emerald-300/50 text-sm gap-1">
              <CheckCircle className="w-3 h-3" /> Acknowledged
            </Badge>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Summary */}
        <div>
          <p className="text-sm text-[#3A4A57] leading-relaxed whitespace-pre-line">
            {parentSummary}
          </p>
        </div>

        {/* Wins */}
        {wins.length > 0 && (
          <div className="bg-emerald-50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-emerald-900 flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-emerald-600" />
              Today's Wins
            </h4>
            <ul className="space-y-2">
              {wins.map((win, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-emerald-800">{win}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Goal Progress */}
        {goals.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-[#132F43] flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Goal Progress
            </h4>
            <div className="space-y-3">
              {goals.map((goal, idx) => (
                <GoalMeter key={idx} title={goal.title} progressPct={goal.progressPct} />
              ))}
            </div>
          </div>
        )}

        {/* Quick Metrics */}
        {metrics && (
          <div className="grid grid-cols-3 gap-3">
            <MetricPill label="Accuracy" value={metrics.accuracy} />
            <MetricPill label="Engagement" value={metrics.engagement} />
            <MetricPill label="Progress" value={metrics.goalProgress} />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-1">
          {!acknowledged && (
            <Button
              onClick={handleAcknowledge}
              className="gap-2 bg-primary hover:bg-primary text-white flex-1 sm:flex-none"
            >
              <Heart className="w-4 h-4" />
              Acknowledge
            </Button>
          )}
          <Button
            onClick={() => {
              onAskQuestion?.();
              if (!onAskQuestion) {
                toast('Your question has been queued for the provider.');
              }
            }}
            variant="outline"
            className="gap-2 flex-1 sm:flex-none"
          >
            <MessageCircle className="w-4 h-4" />
            Questions?
          </Button>
        </div>

        {acknowledged && (
          <p className="text-sm text-slate-400 text-center">
            You acknowledged this summary on {new Date().toLocaleDateString()}
          </p>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function GoalMeter({ title, progressPct }: { title: string; progressPct: number }) {
  const clamped = Math.min(100, Math.max(0, progressPct));
  const color =
    clamped >= 75
      ? 'bg-emerald-500'
      : clamped >= 50
      ? 'bg-blue-500'
      : clamped >= 25
      ? 'bg-amber-500'
      : 'bg-slate-400';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-[#3A4A57] truncate pr-2">{title}</span>
        <span className="text-sm font-medium text-[#132F43] whitespace-nowrap">{clamped}%</span>
      </div>
      <div className="h-2.5 bg-[#F0EDE8] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  const color =
    value >= 75
      ? 'text-emerald-700 bg-emerald-50'
      : value >= 50
      ? 'text-blue-700 bg-[#EEF4F8]'
      : 'text-amber-700 bg-amber-50';

  return (
    <div className={`rounded-xl px-3 py-2 text-center ${color}`}>
      <div className="text-lg font-semibold">{value}%</div>
      <div className="text-sm">{label}</div>
    </div>
  );
}

export default VisitSummaryCard;
