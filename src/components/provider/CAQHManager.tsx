// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * CAQHManager.tsx
 *
 * CAQH ProView profile manager — completeness checklist with 47 fields
 * across 8 categories, visual completion rings, sync to Aminy, and
 * re-attestation countdown.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Bell,
  CheckCircle,
  ChevronDown,
  ExternalLink,
  Info,
  RefreshCw,
  Shield,
  Upload,
  XCircle,
} from 'lucide-react';
import { DEMO_PROVIDERS } from '../../lib/credentialing-orchestrator';
import { isDemoMode } from '../../lib/demo-seed';

interface CAQHManagerProps {
  providerId?: string;
  onBack?: () => void;
}

function RingChart({ percent, size = 56, label }: { percent: number; size?: number; label: string }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  const color = percent === 100 ? '#43AA8B' : percent >= 70 ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#374151">
          {percent}%
        </text>
      </svg>
      <p className="text-sm text-[#5A6B7A] text-center leading-tight max-w-[64px]">{label}</p>
    </div>
  );
}

export default function CAQHManager({ providerId = 'prov-001', onBack }: CAQHManagerProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Personal Information');
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  // Sample CAQH profiles are presentation-only — never show fabricated
  // credentialing data (CAQH IDs, attestation dates, document status) to real
  // providers. Real CAQH data will be loaded from the backend once wired.
  const provider = isDemoMode()
    ? (DEMO_PROVIDERS.find(p => p.application.providerId === providerId) ?? DEMO_PROVIDERS[0])
    : null;

  if (!provider) {
    return (
      <div className="min-h-screen bg-mist">
        <div className="bg-white border-b border-[#E8E4DF] px-4 pt-12 pb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[#F0EDE8] transition-colors">
                <ArrowLeft size={20} className="text-[#3A4A57]" />
              </button>
            )}
            <div>
              <h1 className="text-lg font-bold text-[#1B2733] flex items-center gap-2">
                <Shield size={18} className="text-blue-600" />
                CAQH ProView Manager
              </h1>
              <p className="text-sm text-[#5A6B7A]">Universal credentialing profile</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center text-center px-6 py-16">
          <div className="w-16 h-16 rounded-full bg-[#F0EDE8] flex items-center justify-center mb-4">
            <Shield size={28} className="text-slate-400" />
          </div>
          <h2 className="text-base font-semibold text-[#3A4A57]">No CAQH profile connected yet</h2>
          <p className="text-sm text-[#5A6B7A] mt-1 max-w-xs">
            Once your CAQH ProView profile is linked, your documents, attestation status, and
            re-credentialing reminders will appear here.
          </p>
        </div>
      </div>
    );
  }

  const { caqhProfile } = provider;

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSynced(true);
    }, 2000);
  };

  const isOverdue = caqhProfile.daysUntilReAttestation < 0;
  const isDueSoon = caqhProfile.daysUntilReAttestation >= 0 && caqhProfile.daysUntilReAttestation < 30;

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DF] px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[#F0EDE8] transition-colors">
              <ArrowLeft size={20} className="text-[#3A4A57]" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold text-[#1B2733] flex items-center gap-2">
              <Shield size={18} className="text-blue-600" />
              CAQH ProView Manager
            </h1>
            <p className="text-xs text-[#5A6B7A]">ID: {caqhProfile.caqhId} · Last attested {caqhProfile.lastAttestedDate}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Re-attestation Banner */}
        {(isOverdue || isDueSoon) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl border ${
              isOverdue ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <XCircle size={16} className={isOverdue ? 'text-red-500' : 'text-amber-500'} />
              <p className={`text-sm font-semibold ${isOverdue ? 'text-red-700' : 'text-amber-700'}`}>
                {isOverdue
                  ? `Re-attestation overdue by ${Math.abs(caqhProfile.daysUntilReAttestation)} days`
                  : `Re-attestation due in ${caqhProfile.daysUntilReAttestation} days`}
              </p>
            </div>
            <p className={`text-sm ${isOverdue ? 'text-red-600' : 'text-amber-600'} mb-2`}>
              Incomplete CAQH is the #1 cause of credentialing delays. Payers auto-reject applications when CAQH is not re-attested within 120 days.
            </p>
            <div className="flex gap-2">
              <a
                href="https://proview.caqh.org"
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg ${
                  isOverdue ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                }`}
              >
                Re-attest now <ExternalLink size={11} />
              </a>
              <button className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-[#E8E4DF] bg-white text-[#3A4A57]">
                <Bell size={11} />
                Set reminder
              </button>
            </div>
          </motion.div>
        )}

        {/* Overall Completion */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DF]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-2xl font-bold text-[#1B2733]">{caqhProfile.completionPercent}%</p>
              <p className="text-sm text-[#5A6B7A]">Overall Completion</p>
            </div>
            <div className="h-16 w-px bg-[#F0EDE8] mx-2" />
            <div className="text-center">
              <p className="text-lg font-bold text-[#1B2733]">{caqhProfile.nextAttestationDue}</p>
              <p className="text-sm text-[#5A6B7A]">Next Due Date</p>
            </div>
            <div className="h-16 w-px bg-[#F0EDE8] mx-2" />
            <div className="text-center">
              <p className={`text-lg font-bold ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-green-600'}`}>
                {Math.abs(caqhProfile.daysUntilReAttestation)}d
              </p>
              <p className="text-sm text-[#5A6B7A]">{isOverdue ? 'Overdue' : 'Remaining'}</p>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="h-2 bg-[#F0EDE8] rounded-full overflow-hidden mb-4">
            <div
              className={`h-full rounded-full ${
                caqhProfile.completionPercent >= 90 ? 'bg-green-500' :
                caqhProfile.completionPercent >= 70 ? 'bg-amber-400' : 'bg-red-400'
              }`}
              style={{ width: `${caqhProfile.completionPercent}%` }}
            />
          </div>

          {/* Category rings */}
          <div className="grid grid-cols-4 gap-2 overflow-x-auto">
            {caqhProfile.categories.slice(0, 4).map(cat => (
              <RingChart
                key={cat.name}
                percent={cat.percent}
                size={60}
                label={cat.name.split(' ')[0]}
              />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {caqhProfile.categories.slice(4).map(cat => (
              <RingChart
                key={cat.name}
                percent={cat.percent}
                size={60}
                label={cat.name.split(' ')[0]}
              />
            ))}
          </div>
        </div>

        {/* Sync button */}
        <button
          onClick={handleSync}
          disabled={syncing || synced}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-medium text-sm transition-all ${
            synced
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {syncing ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Syncing CAQH data to Aminy…
            </>
          ) : synced ? (
            <>
              <CheckCircle size={16} />
              Synced to Aminy profile
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Sync to Aminy Profile
            </>
          )}
        </button>

        {/* Tip */}
        <div className="flex items-start gap-2 bg-[#EEF4F8] rounded-xl p-3 border border-blue-100">
          <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            <strong>Tip:</strong> Syncing imports your CAQH data to pre-fill your Aminy provider profile, saving 20+ hours of manual data entry per payer application.
          </p>
        </div>

        {/* Field Checklist by Category */}
        <div className="space-y-2">
          {caqhProfile.categories.map(cat => {
            const categoryFields = caqhProfile.fields.filter(f => f.category === cat.name);
            const isExpanded = expandedCategory === cat.name;
            const missingRequired = categoryFields.filter(f => !f.completed && f.required);

            return (
              <div key={cat.name} className="bg-white rounded-2xl border border-[#E8E4DF] shadow-sm overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3"
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.name)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      cat.percent === 100 ? 'bg-green-100 text-green-700' :
                      cat.percent >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {cat.percent}%
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-[#1B2733]">{cat.name}</p>
                      <p className="text-sm text-[#8A9BA8]">{cat.completedFields}/{cat.totalFields} fields</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {missingRequired.length > 0 && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                        {missingRequired.length} required
                      </span>
                    )}
                    <ChevronDown
                      size={16}
                      className={`text-[#8A9BA8] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-gray-50"
                    >
                      <div className="px-4 py-3 space-y-2">
                        {categoryFields.map(field => (
                          <div key={field.id} className="flex items-center gap-3">
                            {field.completed ? (
                              <CheckCircle size={14} className="text-green-500 shrink-0" />
                            ) : (
                              <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
                                field.required ? 'border-red-400 bg-red-50' : 'border-[#E8E4DF]'
                              }`} />
                            )}
                            <span className={`text-sm flex-1 ${field.completed ? 'text-[#5A6B7A]' : 'text-[#1B2733]'}`}>
                              {field.name}
                            </span>
                            {!field.completed && (
                              <div className="flex items-center gap-1">
                                {field.required && (
                                  <span className="text-sm text-red-500 font-medium">Required</span>
                                )}
                                <button className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-[#F0EDE8]">
                                  <Upload size={12} className="text-[#8A9BA8]" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
