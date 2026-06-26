// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * CredentialingOrchestrator.tsx
 *
 * AI-powered credentialing command center. Headway-level credentialing UX
 * for ABA/behavioral health providers. Includes readiness gauge, payer kanban,
 * AI enrollment playbooks, risk alerts, CAQH status, and Gantt timeline.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Info,
  Layers,
  ListChecks,
  RefreshCw,
  Shield,
  Sparkles,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  DEMO_PROVIDERS,
  assessCredentialingReadiness,
  flagCredentialingRisks,
  generateEnrollmentPlan,
  getEnrollmentPlaybook,
  type PanelApplicationStatus,
  type EnrollmentPlaybook,
} from '../../lib/credentialing-orchestrator';

// ============================================================================
// Types
// ============================================================================

interface CredentialingOrchestratorProps {
  providerId?: string;
  onBack?: () => void;
}

type TabType = 'overview' | 'playbook' | 'caqh' | 'timeline';

const STATUS_CONFIG: Record<PanelApplicationStatus, {
  label: string;
  color: string;
  bg: string;
  border: string;
}> = {
  'not-started': { label: 'Not Started', color: 'text-[#5A6B7A]', bg: 'bg-[#F6FBFB]', border: 'border-[#E8E4DF]' },
  'submitted': { label: 'Submitted', color: 'text-blue-600', bg: 'bg-[#EEF4F8]', border: 'border-[#C8DDE8]' },
  'pending': { label: 'Pending Review', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  'credentialed': { label: 'Credentialed', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  'denied': { label: 'Denied', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

// ============================================================================
// Sub-components
// ============================================================================

function ReadinessGauge({ percent }: { percent: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  const color = percent >= 80 ? '#2A7D99' : percent >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="12" />
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="70" y="66" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#0D1B2A">{percent}%</text>
        <text x="70" y="84" textAnchor="middle" fontSize="11" fill="#6B7280">Ready</text>
      </svg>
      <p className="text-sm font-medium text-[#5A6B7A] mt-1">Credentialing Readiness</p>
    </div>
  );
}

function RiskBadge({ severity }: { severity: 'critical' | 'high' | 'medium' }) {
  const config = {
    critical: 'bg-red-100 text-red-700 border border-red-200',
    high: 'bg-amber-100 text-amber-700 border border-amber-200',
    medium: 'bg-yellow-100 text-yellow-700 border border-[#EDF4F7]',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config[severity]}`}>
      {severity.toUpperCase()}
    </span>
  );
}

function GanttBar({ label, start, end, status, index }: {
  label: string;
  start: number;
  end: number;
  status: PanelApplicationStatus;
  index: number;
}) {
  const colors: Record<PanelApplicationStatus, string> = {
    'credentialed': 'bg-green-500',
    'pending': 'bg-amber-400',
    'submitted': 'bg-blue-400',
    'not-started': 'bg-gray-300',
    'denied': 'bg-red-400',
  };
  const width = Math.max(4, end - start);

  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-sm text-[#5A6B7A] w-32 shrink-0 truncate">{label}</span>
      <div className="flex-1 relative h-6 bg-[#EDF4F7] rounded overflow-hidden">
        <motion.div
          className={`absolute top-1 bottom-1 rounded ${colors[status]}`}
          style={{ left: `${start}%`, width: `${width}%` }}
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function CredentialingOrchestrator({
  providerId = 'prov-001',
  onBack,
}: CredentialingOrchestratorProps) {
  const [tab, setTab] = useState<TabType>('overview');
  const [selectedPayer, setSelectedPayer] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(new Set());

  const provider = DEMO_PROVIDERS.find(p => p.application.providerId === providerId) ?? DEMO_PROVIDERS[0];
  const readiness = useMemo(() => assessCredentialingReadiness(providerId), [providerId]);
  const risks = useMemo(() => flagCredentialingRisks(providerId), [providerId]);
  const { caqhProfile, panelApplications } = provider;

  const kanbanColumns: PanelApplicationStatus[] = ['not-started', 'submitted', 'pending', 'credentialed'];

  const selectedPlaybook: EnrollmentPlaybook | null = selectedPayer
    ? getEnrollmentPlaybook(selectedPayer)
    : null;

  const ganttData = panelApplications.map((app, i) => ({
    label: app.payer,
    start: i * 20,
    end: i * 20 + (app.status === 'credentialed' ? 18 : app.status === 'pending' ? 12 : app.status === 'submitted' ? 8 : 4),
    status: app.status,
    index: i,
  }));

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Layers size={14} /> },
    { id: 'playbook', label: 'AI Playbook', icon: <Sparkles size={14} /> },
    { id: 'caqh', label: 'CAQH Status', icon: <Shield size={14} /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <div className="bg-navy-dark text-white px-4 pt-12 pb-4" style={{ background: '#0D1B2A' }}>
        <div className="flex items-center gap-3 mb-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold">Credentialing Orchestrator</h1>
            <p className="text-sm text-white/60">AI-powered payer enrollment engine</p>
          </div>
        </div>

        {/* Risk Alerts in header */}
        {risks.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {risks.slice(0, 2).map(risk => (
              <div
                key={risk.type}
                className="flex items-center gap-2 bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-2 text-sm"
              >
                <AlertTriangle size={14} className="text-red-300 shrink-0" />
                <span className="text-red-100">{risk.description}</span>
                {risk.link && (
                  <a href={risk.link} target="_blank" rel="noreferrer" className="ml-auto shrink-0">
                    <ExternalLink size={12} className="text-red-300" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mt-4 overflow-x-auto no-scrollbar pb-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-white text-navy-dark' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              style={tab === t.id ? { color: '#0D1B2A' } : {}}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-24">
        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Readiness Gauge */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
                <div className="flex items-center justify-between">
                  <ReadinessGauge percent={readiness.overallPercent} />
                  <div className="flex-1 ml-4 space-y-2">
                    {readiness.gaps.slice(0, 3).map((gap, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          gap.severity === 'blocking' ? 'bg-red-500' :
                          gap.severity === 'warning' ? 'bg-amber-400' : 'bg-blue-400'
                        }`} />
                        <p className="text-sm text-[#5A6B7A] leading-snug">{gap.issue}</p>
                      </div>
                    ))}
                    {readiness.gaps.length === 0 && (
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-500" />
                        <p className="text-sm text-green-600 font-medium">No blocking issues</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payer Kanban Board */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
                <h2 className="text-sm font-semibold text-[#132F43] mb-3 flex items-center gap-2">
                  <Users size={15} className="text-[#6B9080]" />
                  Payer Status Board
                </h2>
                <div className="space-y-2">
                  {kanbanColumns.map(status => {
                    const apps = panelApplications.filter(p => p.status === status);
                    if (apps.length === 0) return null;
                    const cfg = STATUS_CONFIG[status];
                    return (
                      <div key={status}>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-t-lg border-l-2 ${cfg.border} ${cfg.bg}`}>
                          <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                          <span className={`text-sm ${cfg.color} opacity-70`}>({apps.length})</span>
                        </div>
                        <div className="space-y-1.5 mt-1">
                          {apps.map(app => (
                            <div
                              key={app.id}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl border ${cfg.border} ${cfg.bg} cursor-pointer hover:opacity-80 transition-opacity`}
                              onClick={() => {
                                setSelectedPayer(app.payerId);
                                setTab('playbook');
                              }}
                            >
                              <div>
                                <p className="text-sm font-medium text-[#132F43]">{app.payer}</p>
                                {app.submittedDate && (
                                  <p className="text-sm text-[#5A6B7A]">Submitted {app.submittedDate}</p>
                                )}
                                {app.followUpDate && app.status !== 'credentialed' && (
                                  <p className="text-sm text-amber-600">Follow up: {app.followUpDate}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {app.status === 'credentialed' && <CheckCircle size={16} className="text-green-500" />}
                                {app.status === 'denied' && <XCircle size={16} className="text-red-500" />}
                                {app.status === 'pending' && <Clock size={16} className="text-amber-500" />}
                                <ChevronRight size={14} className="text-[#8A9BA8]" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Risk Alerts Full List */}
              {risks.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
                  <h2 className="text-sm font-semibold text-[#132F43] mb-3 flex items-center gap-2">
                    <AlertTriangle size={15} className="text-red-500" />
                    Credentialing Risks
                  </h2>
                  <div className="space-y-2">
                    {risks.map(risk => (
                      <div key={risk.type} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <RiskBadge severity={risk.severity} />
                          </div>
                          <p className="text-sm font-medium text-[#132F43] mt-1">{risk.description}</p>
                          <p className="text-sm text-[#5A6B7A] mt-0.5">{risk.action}</p>
                        </div>
                        {risk.link && (
                          <a
                            href={risk.link}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 mt-0.5 text-sm text-blue-600 flex items-center gap-1 hover:underline"
                          >
                            Renew <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {tab === 'playbook' && (
            <motion.div
              key="playbook"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Payer Selector */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
                <h2 className="text-sm font-semibold text-[#132F43] mb-3 flex items-center gap-2">
                  <Sparkles size={15} className="text-[#6B9080]" />
                  Select Payer for AI Playbook
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {['ahcccs', 'bcbs_az', 'uhc', 'aetna', 'cigna'].map(payerId => {
                    const names: Record<string, string> = {
                      ahcccs: 'AHCCCS',
                      bcbs_az: 'BCBS AZ',
                      uhc: 'UnitedHealthcare',
                      aetna: 'Aetna',
                      cigna: 'Cigna',
                    };
                    const app = panelApplications.find(p => p.payerId === payerId);
                    const status = app?.status ?? 'not-started';
                    const cfg = STATUS_CONFIG[status];
                    return (
                      <button
                        key={payerId}
                        onClick={() => setSelectedPayer(payerId)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          selectedPayer === payerId
                            ? 'border-[#6B9080] bg-[#6B9080]/10'
                            : `${cfg.border} ${cfg.bg} hover:opacity-80`
                        }`}
                      >
                        <p className="text-sm font-medium text-[#132F43]">{names[payerId]}</p>
                        <p className={`text-sm mt-0.5 ${cfg.color}`}>{cfg.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Playbook Steps */}
              {selectedPlaybook && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-[#132F43]">{selectedPlaybook.payerName} Enrollment</h2>
                    <span className="text-xs text-[#5A6B7A] bg-[#EDF4F7] px-2 py-1 rounded-full">
                      ~{selectedPlaybook.totalEstimatedDays} days
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedPlaybook.steps.map((step, idx) => {
                      const stepKey = `${selectedPayer}-${step.stepNumber}`;
                      const isChecked = checkedSteps.has(stepKey);
                      const isExpanded = expandedStep === idx;
                      return (
                        <div
                          key={idx}
                          className={`border rounded-xl transition-all ${
                            isChecked ? 'border-green-200 bg-green-50' : 'border-[#E8E4DF] bg-[#F6FBFB]'
                          }`}
                        >
                          <div
                            className="flex items-center gap-3 p-3 cursor-pointer"
                            onClick={() => setExpandedStep(isExpanded ? null : idx)}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = new Set(checkedSteps);
                                isChecked ? next.delete(stepKey) : next.add(stepKey);
                                setCheckedSteps(next);
                              }}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                isChecked ? 'bg-green-500 border-green-500' : 'border-[#E8E4DF] bg-white'
                              }`}
                            >
                              {isChecked && <CheckCircle size={12} className="text-white" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-[#8A9BA8] font-mono">Step {step.stepNumber}</span>
                                <span className="text-xs text-[#8A9BA8]">·</span>
                                <span className="text-sm text-[#5A6B7A]">{step.estimatedDays}d</span>
                              </div>
                              <p className={`text-sm font-medium leading-tight ${isChecked ? 'line-through text-[#8A9BA8]' : 'text-[#132F43]'}`}>
                                {step.title}
                              </p>
                            </div>
                            <ChevronDown
                              size={16}
                              className={`text-[#8A9BA8] shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-3 space-y-2">
                                  <p className="text-sm text-[#5A6B7A] leading-relaxed">{step.description}</p>
                                  {step.whoToCall && (
                                    <div className="flex items-center gap-2 text-sm text-blue-600">
                                      <Info size={12} />
                                      <span>{step.whoToCall}</span>
                                    </div>
                                  )}
                                  {step.whatToUpload && step.whatToUpload.length > 0 && (
                                    <div>
                                      <p className="text-sm font-medium text-[#5A6B7A] mb-1">Documents needed:</p>
                                      <div className="space-y-0.5">
                                        {step.whatToUpload.map((doc, di) => (
                                          <div key={di} className="flex items-center gap-1.5 text-sm text-[#5A6B7A]">
                                            <FileText size={11} className="text-[#8A9BA8]" />
                                            {doc}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {step.url && (
                                    <a
                                      href={step.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-1 text-sm text-[#6B9080] hover:underline"
                                    >
                                      <ExternalLink size={11} />
                                      Open portal
                                    </a>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tips & Common Mistakes */}
                  <div className="mt-4 space-y-3">
                    <div className="bg-[#6B9080]/10 rounded-xl p-3 border border-[#E8E4DF]">
                      <p className="text-sm font-semibold text-[#6B9080] mb-2 flex items-center gap-1.5">
                        <Zap size={12} /> Pro Tips
                      </p>
                      <ul className="space-y-1">
                        {selectedPlaybook.tips.map((tip, i) => (
                          <li key={i} className="text-sm text-[#6B9080] flex items-start gap-1.5">
                            <span className="text-primary shrink-0">•</span> {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                      <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                        <XCircle size={12} /> Common Mistakes
                      </p>
                      <ul className="space-y-1">
                        {selectedPlaybook.commonMistakes.map((m, i) => (
                          <li key={i} className="text-sm text-red-700 flex items-start gap-1.5">
                            <span className="text-red-400 shrink-0">•</span> {m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {!selectedPlaybook && !selectedPayer && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Sparkles size={32} className="text-[#8A9BA8] mb-3" />
                  <p className="text-sm text-[#5A6B7A]">Select a payer above to see the step-by-step enrollment playbook</p>
                </div>
              )}
            </motion.div>
          )}

          {tab === 'caqh' && (
            <motion.div
              key="caqh"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* CAQH Header */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[#132F43] flex items-center gap-2">
                      <Shield size={15} className="text-blue-600" />
                      CAQH ProView Status
                    </h2>
                    <p className="text-sm text-[#5A6B7A] mt-0.5">ID: {caqhProfile.caqhId}</p>
                  </div>
                  <div className={`text-center px-3 py-2 rounded-xl ${
                    caqhProfile.daysUntilReAttestation < 0 ? 'bg-red-100' :
                    caqhProfile.daysUntilReAttestation < 30 ? 'bg-amber-100' : 'bg-green-100'
                  }`}>
                    <p className={`text-lg font-bold ${
                      caqhProfile.daysUntilReAttestation < 0 ? 'text-red-600' :
                      caqhProfile.daysUntilReAttestation < 30 ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {Math.abs(caqhProfile.daysUntilReAttestation)}d
                    </p>
                    <p className="text-sm text-[#5A6B7A]">
                      {caqhProfile.daysUntilReAttestation < 0 ? 'Overdue' : 'Until re-attest'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                  <div className="bg-[#F6FBFB] rounded-xl p-2">
                    <p className="text-xl font-bold text-[#132F43]">{caqhProfile.completionPercent}%</p>
                    <p className="text-sm text-[#5A6B7A]">Complete</p>
                  </div>
                  <div className="bg-[#F6FBFB] rounded-xl p-2">
                    <p className="text-sm text-[#132F43] font-semibold leading-tight">{caqhProfile.lastAttestedDate}</p>
                    <p className="text-sm text-[#5A6B7A]">Last Attested</p>
                  </div>
                  <div className="bg-[#F6FBFB] rounded-xl p-2">
                    <p className="text-sm text-[#132F43] font-semibold leading-tight">{caqhProfile.nextAttestationDue}</p>
                    <p className="text-sm text-[#5A6B7A]">Next Due</p>
                  </div>
                </div>

                {caqhProfile.daysUntilReAttestation < 30 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                    <p className="text-sm font-semibold text-amber-700 mb-1 flex items-center gap-1.5">
                      <AlertTriangle size={12} /> Re-attestation Required
                    </p>
                    <p className="text-sm text-amber-600">
                      Incomplete CAQH is the #1 cause of credentialing delays. Re-attest at proview.caqh.org to keep payer applications active.
                    </p>
                    <a
                      href="https://proview.caqh.org"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 flex items-center gap-1 text-sm text-amber-700 font-medium hover:underline"
                    >
                      Open CAQH ProView <ExternalLink size={11} />
                    </a>
                  </div>
                )}

                {/* Category completion rings */}
                <h3 className="text-sm font-semibold text-[#5A6B7A] mb-2">Completion by Category</h3>
                <div className="space-y-2">
                  {caqhProfile.categories.map(cat => (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm text-[#3A4A57]">{cat.name}</span>
                        <span className={`text-sm font-medium ${
                          cat.percent === 100 ? 'text-green-600' : cat.percent >= 70 ? 'text-amber-600' : 'text-red-500'
                        }`}>{cat.percent}%</span>
                      </div>
                      <div className="h-1.5 bg-[#EDF4F7] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            cat.percent === 100 ? 'bg-green-500' : cat.percent >= 70 ? 'bg-amber-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${cat.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-blue-700 transition-colors">
                  <RefreshCw size={14} />
                  Sync to Aminy Profile
                </button>
                <p className="text-sm text-[#8A9BA8] text-center mt-1">Imports CAQH data to pre-fill your provider profile</p>
              </div>
            </motion.div>
          )}

          {tab === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
                <h2 className="text-sm font-semibold text-[#132F43] mb-1 flex items-center gap-2">
                  <Clock size={15} className="text-[#6B9080]" />
                  Credentialing Timeline
                </h2>
                <p className="text-sm text-[#5A6B7A] mb-4">Estimated approval milestones by payer</p>

                {/* Gantt chart */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-sm text-[#8A9BA8] mb-2 ml-[132px]">
                    <span>Start</span>
                    <span>30d</span>
                    <span>60d</span>
                    <span>90d+</span>
                  </div>
                  {ganttData.map((item) => (
                    <GanttBar key={item.label} {...item} />
                  ))}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-[#E8E4DF]">
                  {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'denied').map(([status, cfg]) => (
                    <div key={status} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded ${cfg.bg} border ${cfg.border}`} />
                      <span className="text-sm text-[#5A6B7A]">{cfg.label}</span>
                    </div>
                  ))}
                </div>

                {/* Approval timeline estimates */}
                <div className="mt-4 space-y-2">
                  <h3 className="text-sm font-semibold text-[#5A6B7A]">Expected Approval Dates</h3>
                  {panelApplications.map(app => (
                    <div key={app.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-sm text-[#3A4A57]">{app.payer}</span>
                      <div className="text-right">
                        {app.expectedApprovalDate ? (
                          <span className="text-sm font-medium text-[#132F43]">{app.expectedApprovalDate}</span>
                        ) : app.status === 'credentialed' ? (
                          <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                            <CheckCircle size={13} /> Approved
                          </span>
                        ) : (
                          <span className="text-sm text-[#8A9BA8]">Not started</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate Roster Letter */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
                <h2 className="text-sm font-semibold text-[#132F43] mb-3 flex items-center gap-2">
                  <ListChecks size={15} className="text-[#5A6B7A]" />
                  Roster Update Letters
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {(['address-change', 'new-location', 'add-specialty', 'terminate-provider'] as const).map(type => {
                    const labels: Record<string, string> = {
                      'address-change': 'Address Change',
                      'new-location': 'New Location',
                      'add-specialty': 'Add Specialty',
                      'terminate-provider': 'Terminate',
                    };
                    return (
                      <button
                        key={type}
                        className="flex items-center gap-2 p-3 border border-[#E8E4DF] rounded-xl hover:bg-[#F6FBFB] transition-colors text-left"
                      >
                        <Download size={13} className="text-[#8A9BA8] shrink-0" />
                        <span className="text-sm text-[#3A4A57]">{labels[type]}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm text-[#8A9BA8] mt-2">AI generates a ready-to-send letter for your selected payer</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
