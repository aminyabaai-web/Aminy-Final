// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ProviderQualityPanel — surfaces provider verification status, NPS, and
 * aggregated outcome metrics for insurance payors / AACT.
 *
 * Data sources:
 *   - provider_profiles   (verification_status counts)
 *   - nps_responses       (trigger LIKE '%provider%' rows)
 *   - session_notes       (total sessions completed)
 *   - goals               (goal attainment rate)
 *   - nps_responses       (consumer NPS for family satisfaction)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Star,
  FileText,
  Target,
  Users,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Button } from '../ui/button';
import { toast } from 'sonner';

interface VerificationCounts {
  pending: number;
  verified: number;
  rejected: number;
}

interface ProviderNPSRow {
  score: number;
  feedback: string | null;
  created_at: string;
  trigger: string | null;
}

interface OutcomeMetrics {
  totalSessions: number;
  totalGoals: number;
  achievedGoals: number;
  consumerNPS: number | null;
}

export function ProviderQualityPanel() {
  const [loading, setLoading] = useState(true);
  const [verificationCounts, setVerificationCounts] = useState<VerificationCounts>({
    pending: 0,
    verified: 0,
    rejected: 0,
  });
  const [providerNPSRows, setProviderNPSRows] = useState<ProviderNPSRow[]>([]);
  const [providerNPS, setProviderNPS] = useState<number | null>(null);
  const [outcomes, setOutcomes] = useState<OutcomeMetrics | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [payorReport, setPayorReport] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Verification status counts
      const { data: profiles } = await supabase
        .from('provider_profiles')
        .select('verification_status');

      if (profiles) {
        const counts: VerificationCounts = { pending: 0, verified: 0, rejected: 0 };
        profiles.forEach((p: { verification_status: string | null }) => {
          const s = (p.verification_status ?? 'pending') as keyof VerificationCounts;
          if (s in counts) counts[s]++;
          else counts.pending++;
        });
        setVerificationCounts(counts);
      }

      // 2. Provider NPS (trigger includes 'provider')
      const { data: pnps } = await supabase
        .from('nps_responses')
        .select('score, feedback, created_at, trigger')
        .or('trigger.ilike.%provider%')
        .order('created_at', { ascending: false })
        .limit(50);

      const rows = (pnps ?? []) as ProviderNPSRow[];
      setProviderNPSRows(rows);

      if (rows.length > 0) {
        const promoters = rows.filter(r => r.score >= 9).length;
        const detractors = rows.filter(r => r.score <= 6).length;
        setProviderNPS(Math.round(((promoters - detractors) / rows.length) * 100));
      }

      // 3. Outcome metrics — session count, goal attainment, consumer NPS
      const [sessionsRes, goalsRes, consumerNPSRes] = await Promise.all([
        supabase.from('session_notes').select('id', { count: 'exact', head: true }),
        supabase.from('goals').select('status'),
        supabase
          .from('nps_responses')
          .select('score')
          .not('trigger', 'ilike', '%provider%')
          .limit(200),
      ]);

      const totalSessions = sessionsRes.count ?? 0;
      const goals = (goalsRes.data ?? []) as Array<{ status: string }>;
      const totalGoals = goals.length;
      const achievedGoals = goals.filter(g => g.status === 'achieved').length;

      const consumerScores = (consumerNPSRes.data ?? []) as Array<{ score: number }>;
      let consumerNPS: number | null = null;
      if (consumerScores.length > 0) {
        const promoters = consumerScores.filter(r => r.score >= 9).length;
        const detractors = consumerScores.filter(r => r.score <= 6).length;
        consumerNPS = Math.round(((promoters - detractors) / consumerScores.length) * 100);
      }

      setOutcomes({ totalSessions, totalGoals, achievedGoals, consumerNPS });
    } catch (err) {
      console.error('[ProviderQualityPanel] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generatePayorReport = async () => {
    if (!outcomes) return;
    setGeneratingReport(true);
    setPayorReport(null);
    try {
      const goalRate =
        outcomes.totalGoals > 0
          ? Math.round((outcomes.achievedGoals / outcomes.totalGoals) * 100)
          : null;

      const payload = {
        userId: 'admin',
        messages: [
          {
            role: 'user',
            content: `Generate a brief (2–3 paragraph) payor-facing quality report for Aminy's provider network.
Data:
- Verified providers: ${verificationCounts.verified}
- Pending verification: ${verificationCounts.pending}
- Total sessions completed: ${outcomes.totalSessions}
- Goal attainment rate: ${goalRate !== null ? goalRate + '%' : 'insufficient data'}
- Family satisfaction NPS: ${outcomes.consumerNPS !== null ? outcomes.consumerNPS : 'insufficient data'}
- Provider satisfaction NPS: ${providerNPS !== null ? providerNPS : 'insufficient data'}

The report is for sharing with insurance payors (AACT / AHCCCS). Emphasize quality, outcomes, and compliance. Keep it professional and concise.`,
          },
        ],
        systemContext:
          'You are a clinical quality writer for Aminy, a behavioral wellness platform for autism families. Write professional payor-facing reports that emphasize outcomes, provider quality, and regulatory compliance.',
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/ai/brain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const text: string =
        data?.message?.content ??
        data?.content ??
        data?.text ??
        'Report generated — no content returned.';
      setPayorReport(text);
    } catch (err) {
      console.error('[ProviderQualityPanel] report error:', err);
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 gap-3 text-[#5A6B7A]">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading provider quality data…</span>
      </div>
    );
  }

  const goalAttainmentRate =
    outcomes && outcomes.totalGoals > 0
      ? Math.round((outcomes.achievedGoals / outcomes.totalGoals) * 100)
      : null;

  const hasAnyData =
    verificationCounts.verified + verificationCounts.pending + verificationCounts.rejected > 0 ||
    providerNPSRows.length > 0 ||
    (outcomes && (outcomes.totalSessions > 0 || outcomes.totalGoals > 0));

  return (
    <div className="space-y-6 mt-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 dark:bg-teal-900/30 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#132F43] dark:text-white">Provider Quality</h3>
            <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">
              Verification status, satisfaction, and outcomes for payors
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={load}>
          <RefreshCw className="w-3 h-3" />
          Refresh
        </Button>
      </div>

      {!hasAnyData ? (
        <div className="bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl p-8 text-center">
          <FileText className="w-10 h-10 text-neutral-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-[#5A6B7A] dark:text-[#8A9BA8] text-sm">
            No data yet — will populate as sessions complete.
          </p>
        </div>
      ) : (
        <>
          {/* Verification Status */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E8E4DF] dark:border-slate-700 p-5">
            <h4 className="text-sm font-semibold text-[#132F43] dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#577590]" />
              Provider Verification Status
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {verificationCounts.verified}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">Verified</div>
              </div>
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {verificationCounts.pending}
                </div>
                <div className="text-sm text-amber-600 dark:text-amber-400">Pending</div>
              </div>
              <div className="text-center p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-rose-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                  {verificationCounts.rejected}
                </div>
                <div className="text-sm text-rose-600 dark:text-rose-400">Rejected</div>
              </div>
            </div>
          </div>

          {/* Provider NPS */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E8E4DF] dark:border-slate-700 p-5">
            <h4 className="text-sm font-semibold text-[#132F43] dark:text-white mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Provider Satisfaction NPS
              {providerNPSRows.length === 0 && (
                <span className="text-sm font-normal text-[#8A9BA8] ml-1">(no responses yet)</span>
              )}
            </h4>
            {providerNPSRows.length === 0 ? (
              <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">
                No provider NPS responses yet — will populate as providers complete sessions.
              </p>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-4">
                  <span
                    className={`text-4xl font-bold ${
                      providerNPS !== null && providerNPS >= 50
                        ? 'text-green-600'
                        : providerNPS !== null && providerNPS >= 20
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {providerNPS !== null ? providerNPS : '—'}
                  </span>
                  <span className="text-[#5A6B7A] dark:text-[#8A9BA8] text-sm">
                    / 100 · {providerNPSRows.length} responses
                  </span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {providerNPSRows.slice(0, 8).map((row, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 text-sm border-b border-neutral-100 dark:border-slate-700 pb-2 last:border-0"
                    >
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-semibold shrink-0 ${
                          row.score >= 9
                            ? 'bg-green-100 text-green-700'
                            : row.score >= 7
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {row.score}
                      </span>
                      <span className="text-[#5A6B7A] dark:text-[#8A9BA8] line-clamp-2">
                        {row.feedback ?? <em>No comment</em>}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Outcomes for Payors */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E8E4DF] dark:border-slate-700 p-5">
            <h4 className="text-sm font-semibold text-[#132F43] dark:text-white mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-violet-600" />
              Outcomes for Payors
            </h4>
            {outcomes && (outcomes.totalSessions === 0 && outcomes.totalGoals === 0) ? (
              <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">
                No data yet — will populate as sessions complete.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="text-center p-3 bg-[#EEF4F8] dark:bg-slate-800 rounded-lg">
                  <FileText className="w-4 h-4 text-[#577590] mx-auto mb-1" />
                  <div className="text-2xl font-bold text-[#132F43] dark:text-white">
                    {outcomes?.totalSessions ?? 0}
                  </div>
                  <div className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Sessions Completed</div>
                </div>
                <div className="text-center p-3 bg-[#EEF4F8] dark:bg-slate-800 rounded-lg">
                  <Target className="w-4 h-4 text-violet-600 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-[#132F43] dark:text-white">
                    {goalAttainmentRate !== null ? `${goalAttainmentRate}%` : '—'}
                  </div>
                  <div className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Goal Attainment</div>
                </div>
                <div className="text-center p-3 bg-[#EEF4F8] dark:bg-slate-800 rounded-lg">
                  <Star className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-[#132F43] dark:text-white">
                    {outcomes?.consumerNPS !== null && outcomes?.consumerNPS !== undefined
                      ? outcomes.consumerNPS
                      : '—'}
                  </div>
                  <div className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8]">Family NPS</div>
                </div>
              </div>
            )}

            {/* Generate Payor Report */}
            <div className="border-t border-neutral-100 dark:border-slate-700 pt-4">
              <Button
                onClick={generatePayorReport}
                disabled={generatingReport}
                className="gap-2 w-full sm:w-auto"
              >
                {generatingReport ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {generatingReport ? 'Generating report…' : 'Generate payor report'}
              </Button>

              {payorReport && (
                <div className="mt-4 p-4 bg-neutral-50 dark:bg-slate-800 rounded-lg border border-neutral-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-[#577590]" />
                    <span className="text-sm font-semibold text-[#132F43] dark:text-white">
                      Payor Quality Report
                    </span>
                  </div>
                  <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] whitespace-pre-wrap leading-relaxed">
                    {payorReport}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1"
                    onClick={() => navigator.clipboard?.writeText(payorReport)}
                  >
                    Copy to clipboard
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ProviderQualityPanel;
