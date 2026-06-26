// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * RosterManager.tsx
 *
 * Provider roster management — current roster entries per payer,
 * add to roster flow, and roster update request tracking.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Plus,
  RefreshCw,
  Send,
  Shield,
  Upload,
  Users,
  XCircle,
} from 'lucide-react';
import { DEMO_PROVIDERS } from '../../lib/credentialing-orchestrator';
import { isDemoMode } from '../../lib/demo-seed';

interface RosterManagerProps {
  providerId?: string;
  onBack?: () => void;
}

// Empty shells for real (non-demo) BCBAs — no fabricated payers, rates, or requests.
const EMPTY_ROSTER: typeof DEMO_PROVIDERS[number]['rosterEntries'] = [];
const EMPTY_PANEL_APPLICATIONS: typeof DEMO_PROVIDERS[number]['panelApplications'] = [];

type UpdateType = 'service-location' | 'add-supervisor' | 'remove-rbt' | 'rate-change';
type UpdateStatus = 'submitted' | 'acknowledged' | 'confirmed';

interface RosterUpdateRequest {
  id: string;
  payer: string;
  type: UpdateType;
  description: string;
  submittedDate: string;
  status: UpdateStatus;
  effectiveDate: string;
}

const UPDATE_STATUS_CONFIG: Record<UpdateStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  submitted: {
    label: 'Submitted',
    color: 'text-blue-600',
    bg: 'bg-[#EEF4F8]',
    icon: <Send size={13} className="text-blue-500" />,
  },
  acknowledged: {
    label: 'Acknowledged',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    icon: <Clock size={13} className="text-amber-500" />,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'text-green-600',
    bg: 'bg-green-50',
    icon: <CheckCircle size={13} className="text-green-500" />,
  },
};

const DEMO_UPDATE_REQUESTS: RosterUpdateRequest[] = [
  {
    id: 'req-001',
    payer: 'AHCCCS',
    type: 'service-location',
    description: 'Add new service location: 4040 N. Central Ave, Suite 200, Phoenix AZ 85012',
    submittedDate: '2026-03-15',
    status: 'acknowledged',
    effectiveDate: '2026-04-01',
  },
  {
    id: 'req-002',
    payer: 'BCBS AZ',
    type: 'add-supervisor',
    description: 'Add supervising BCBA: Dr. Sarah Chen, NPI 1234567890',
    submittedDate: '2026-03-28',
    status: 'submitted',
    effectiveDate: '2026-04-10',
  },
];

export default function RosterManager({ providerId = 'prov-001', onBack }: RosterManagerProps) {
  // Demo mode shows a realistic, populated roster for investor/AACT walk-throughs.
  // Real BCBAs start with empty roster + update queues — never fabricated payers or rates.
  const demo = isDemoMode();
  const demoProvider = DEMO_PROVIDERS.find(p => p.application.providerId === providerId) ?? DEMO_PROVIDERS[0];
  const rosterEntries = demo ? demoProvider.rosterEntries : EMPTY_ROSTER;
  const panelApplications = demo ? demoProvider.panelApplications : EMPTY_PANEL_APPLICATIONS;
  const updateRequests = demo ? DEMO_UPDATE_REQUESTS : [];
  const [showAddFlow, setShowAddFlow] = useState(false);
  const [selectedPayer, setSelectedPayer] = useState('');
  const [addStep, setAddStep] = useState(1);

  const credentialedPayers = panelApplications.filter(p => p.status === 'credentialed');

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DF] px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[#EDF4F7] transition-colors">
              <ArrowLeft size={20} className="text-[#3A4A57]" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold text-[#132F43] flex items-center gap-2">
              <Users size={18} className="text-[#6B9080]" />
              Roster Manager
            </h1>
            <p className="text-sm text-[#5A6B7A]">Active rosters · {rosterEntries.length} payers</p>
          </div>
          <button
            onClick={() => setShowAddFlow(true)}
            className="flex items-center gap-1.5 bg-primary text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-[#6B9080] transition-colors"
          >
            <Plus size={14} />
            Add to Roster
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Active Roster Entries */}
        <div>
          <h2 className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wider mb-2">Active Roster</h2>
          {rosterEntries.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-[#E8E4DF]">
              <Shield size={32} className="text-[#8A9BA8] mx-auto mb-2" />
              <p className="text-sm text-[#5A6B7A]">No active roster entries yet.</p>
              <p className="text-sm text-[#8A9BA8] mt-1">Complete credentialing with a payer to appear on their roster.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rosterEntries.map(entry => (
                <div key={entry.id} className="bg-white rounded-2xl border border-[#E8E4DF] shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                    <div>
                      <p className="text-sm font-semibold text-[#132F43]">{entry.payer}</p>
                      <p className="text-sm text-[#5A6B7A]">Effective {entry.effectiveDate}</p>
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                      In-Network
                    </span>
                  </div>

                  {/* Contracted Rates */}
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <DollarSign size={13} className="text-[#8A9BA8]" />
                      <p className="text-sm font-medium text-[#5A6B7A]">Contracted Rates</p>
                    </div>
                    <div className="space-y-1.5">
                      {entry.contractedRates.map(rate => (
                        <div key={rate.cptCode} className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-mono font-medium text-[#3A4A57]">{rate.cptCode}</span>
                            <span className="text-sm text-[#5A6B7A] ml-2">{rate.description}</span>
                          </div>
                          <span className="text-sm font-semibold text-[#132F43]">
                            ${rate.rate.toFixed(2)}/unit
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Covered Services */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {entry.coveredServices.map(svc => (
                        <span key={svc} className="text-xs bg-[#EDF4F7] text-[#5A6B7A] px-2 py-0.5 rounded-full">
                          {svc}
                        </span>
                      ))}
                    </div>

                    <button className="mt-3 w-full flex items-center justify-between py-2 border-t border-gray-50 text-sm text-[#5A6B7A] hover:text-[#3A4A57] transition-colors">
                      <span>View full roster details</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Update Requests */}
        <div>
          <h2 className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wider mb-2">Roster Update Requests</h2>
          {updateRequests.length === 0 ? (
            <div className="bg-white rounded-2xl p-4 text-center border border-[#E8E4DF]">
              <p className="text-sm text-[#8A9BA8]">No pending update requests</p>
            </div>
          ) : (
            <div className="space-y-2">
              {updateRequests.map(req => {
                const statusCfg = UPDATE_STATUS_CONFIG[req.status];
                const typeLabels: Record<UpdateType, string> = {
                  'service-location': 'New Service Location',
                  'add-supervisor': 'Add Supervisor',
                  'remove-rbt': 'Remove RBT',
                  'rate-change': 'Rate Change',
                };
                return (
                  <div key={req.id} className="bg-white rounded-2xl border border-[#E8E4DF] shadow-sm p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-[#132F43]">{typeLabels[req.type]}</p>
                        <p className="text-sm text-[#5A6B7A]">{req.payer} · Submitted {req.submittedDate}</p>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </div>
                    </div>
                    <p className="text-sm text-[#5A6B7A] mb-2">{req.description}</p>
                    <div className="flex items-center gap-1.5 text-sm text-[#8A9BA8]">
                      <Calendar size={11} />
                      <span>Effective: {req.effectiveDate}</span>
                    </div>
                    {/* Progress indicator */}
                    <div className="flex items-center gap-2 mt-3">
                      {(['submitted', 'acknowledged', 'confirmed'] as UpdateStatus[]).map((s, i) => (
                        <React.Fragment key={s}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                            ['submitted', 'acknowledged', 'confirmed'].indexOf(req.status) >= i
                              ? 'bg-primary text-white'
                              : 'bg-[#E8E4DF] text-[#8A9BA8]'
                          }`}>
                            {i + 1}
                          </div>
                          {i < 2 && (
                            <div className={`flex-1 h-0.5 ${
                              ['submitted', 'acknowledged', 'confirmed'].indexOf(req.status) > i
                                ? 'bg-primary'
                                : 'bg-[#E8E4DF]'
                            }`} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1 text-sm text-[#8A9BA8] px-0.5">
                      <span>Submitted</span>
                      <span>Acknowledged</span>
                      <span>Confirmed</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Update Types */}
        <div>
          <h2 className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wider mb-2">Request a Roster Update</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { type: 'service-location' as const, label: 'Add Service Location', icon: <FileText size={16} className="text-[#6B9080]" /> },
              { type: 'add-supervisor' as const, label: 'Add Supervising BCBA', icon: <Users size={16} className="text-blue-600" /> },
              { type: 'remove-rbt' as const, label: 'Remove Terminated RBT', icon: <XCircle size={16} className="text-red-500" /> },
              { type: 'rate-change' as const, label: 'Rate Negotiation', icon: <DollarSign size={16} className="text-amber-600" /> },
            ].map(item => (
              <button
                key={item.type}
                onClick={() => { setShowAddFlow(true); }}
                className="flex flex-col items-center gap-2 p-4 bg-white border border-[#E8E4DF] rounded-2xl hover:bg-[#F6FBFB] transition-colors text-center"
              >
                {item.icon}
                <span className="text-sm text-[#3A4A57] font-medium leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add to Roster Modal */}
      <AnimatePresence>
        {showAddFlow && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddFlow(false)}
          >
            <motion.div
              className="w-full bg-white rounded-t-3xl p-5 pb-10"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-[#132F43]">Add to Roster</h2>
                <button onClick={() => setShowAddFlow(false)} className="p-1 rounded-lg hover:bg-[#EDF4F7]">
                  <XCircle size={20} className="text-[#8A9BA8]" />
                </button>
              </div>

              {addStep === 1 && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-[#5A6B7A]">Select Payer</label>
                  <div className="space-y-2">
                    {credentialedPayers.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPayer(p.payerId)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          selectedPayer === p.payerId
                            ? 'border-[#6B9080] bg-[#6B9080]/10'
                            : 'border-[#E8E4DF] hover:bg-[#F6FBFB]'
                        }`}
                      >
                        <CheckCircle size={16} className={selectedPayer === p.payerId ? 'text-[#6B9080]' : 'text-[#8A9BA8]'} />
                        <span className="text-sm font-medium text-[#132F43]">{p.payer}</span>
                      </button>
                    ))}
                    {credentialedPayers.length === 0 && (
                      <p className="text-sm text-[#8A9BA8] text-center py-3">
                        No credentialed payers yet. Complete credentialing first.
                      </p>
                    )}
                  </div>
                  <button
                    disabled={!selectedPayer}
                    onClick={() => setAddStep(2)}
                    className="w-full py-3 bg-primary text-white rounded-xl font-medium text-sm disabled:opacity-40 transition-opacity"
                  >
                    Continue
                  </button>
                </div>
              )}

              {addStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[#5A6B7A] block mb-1">Effective Date</label>
                    <input
                      type="date"
                      className="w-full border border-[#E8E4DF] rounded-xl px-3 py-2 text-sm text-[#132F43] focus:outline-none focus:border-[#6B9080]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#5A6B7A] block mb-2">Required Documents</label>
                    <div className="space-y-2">
                      {['Provider participation request form', 'Updated W-9', 'Malpractice insurance certificate', 'CAQH authorization'].map(doc => (
                        <div key={doc} className="flex items-center gap-3 p-2.5 border border-dashed border-[#E8E4DF] rounded-xl">
                          <Upload size={14} className="text-[#8A9BA8] shrink-0" />
                          <span className="text-sm text-[#5A6B7A]">{doc}</span>
                          <button className="ml-auto text-sm text-blue-600 font-medium">Upload</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAddStep(1)}
                      className="flex-1 py-3 border border-[#E8E4DF] rounded-xl font-medium text-sm text-[#5A6B7A]"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => { setShowAddFlow(false); setAddStep(1); }}
                      className="flex-1 py-3 bg-primary text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <Send size={14} />
                      Submit Request
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
