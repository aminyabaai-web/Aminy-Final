// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * DenialWorkbench.tsx
 *
 * Comprehensive denial management workbench for providers.
 * Features: Denial inbox, auto-categorization, one-click actions,
 * appeal letter generator, analytics, rework queue, and timeline view.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  DollarSign,
  Download,
  Edit3,
  FileText,
  Filter,
  Inbox,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Input } from '../ui/input';
import { isDemoMode } from '../../lib/demo-seed';

// ============================================================================
// Types
// ============================================================================

type ViewMode = 'inbox' | 'analytics' | 'rework' | 'timeline';

interface DenialWorkbenchProps {
  providerId?: string;
  onBack?: () => void;
}

interface Denial {
  id: string;
  claimId: string;
  patientName: string;
  dateOfService: string;
  cptCode: string;
  payer: string;
  billedAmount: number;
  deniedAmount: number;
  carcCode: string;
  rarcCode?: string;
  reason: string;
  category: 'missing-info' | 'auth' | 'coding' | 'medical-necessity' | 'timely-filing' | 'eligibility' | 'duplicate';
  appealDeadline: string;
  daysUntilDeadline: number;
  status: 'new' | 'in-review' | 'appealed' | 'corrected' | 'recovered' | 'written-off';
  suggestedAction: string;
  receivedDate: string;
}

interface AppealStep {
  id: string;
  label: string;
  date?: string;
  status: 'complete' | 'current' | 'upcoming';
  description?: string;
}

// ============================================================================
// CARC/RARC Code Mapping
// ============================================================================

const CARC_DESCRIPTIONS: Record<string, { reason: string; category: Denial['category'] }> = {
  'CO-4': { reason: 'Procedure code inconsistent with modifier or missing modifier', category: 'coding' },
  'CO-11': { reason: 'Diagnosis code inconsistent with procedure code', category: 'coding' },
  'CO-15': { reason: 'Authorization required — not obtained', category: 'auth' },
  'CO-16': { reason: 'Missing or invalid claim information', category: 'missing-info' },
  'CO-18': { reason: 'Duplicate claim/service', category: 'duplicate' },
  'CO-29': { reason: 'Timely filing limit expired', category: 'timely-filing' },
  'CO-50': { reason: 'Not medically necessary per payer guidelines', category: 'medical-necessity' },
  'CO-97': { reason: 'Payment adjusted — bundled procedure', category: 'coding' },
  'CO-197': { reason: 'Precertification/authorization/notification absent', category: 'auth' },
  'PR-96': { reason: 'Non-covered charge — not medically necessary', category: 'medical-necessity' },
  'CO-27': { reason: 'Expenses incurred after coverage terminated', category: 'eligibility' },
  'CO-45': { reason: 'Charges exceed fee schedule/maximum allowable', category: 'coding' },
};

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_DENIALS: Denial[] = [
  {
    id: 'd1', claimId: 'CLM-2026-0891', patientName: 'Alex M.', dateOfService: '2026-03-15',
    cptCode: '90837', payer: 'BCBS Arizona', billedAmount: 185, deniedAmount: 185,
    carcCode: 'CO-197', reason: 'Prior authorization not obtained before service date',
    category: 'auth', appealDeadline: '2026-04-15', daysUntilDeadline: 14,
    status: 'new', suggestedAction: 'Request retro-authorization from BCBS',
    receivedDate: '2026-03-25',
  },
  {
    id: 'd2', claimId: 'CLM-2026-0876', patientName: 'Jordan K.', dateOfService: '2026-03-10',
    cptCode: '90834', payer: 'Aetna', billedAmount: 150, deniedAmount: 150,
    carcCode: 'CO-16', reason: 'Subscriber ID does not match payer records',
    category: 'missing-info', appealDeadline: '2026-04-10', daysUntilDeadline: 9,
    status: 'new', suggestedAction: 'Verify subscriber ID and resubmit',
    receivedDate: '2026-03-22',
  },
  {
    id: 'd3', claimId: 'CLM-2026-0862', patientName: 'Sam R.', dateOfService: '2026-03-05',
    cptCode: '97153', payer: 'AHCCCS', billedAmount: 240, deniedAmount: 240,
    carcCode: 'CO-50', reason: 'Service not considered medically necessary',
    category: 'medical-necessity', appealDeadline: '2026-04-05', daysUntilDeadline: 4,
    status: 'in-review', suggestedAction: 'Submit clinical appeal with treatment plan',
    receivedDate: '2026-03-18',
  },
  {
    id: 'd4', claimId: 'CLM-2026-0845', patientName: 'Taylor P.', dateOfService: '2026-02-28',
    cptCode: '90791', payer: 'UnitedHealthcare', billedAmount: 200, deniedAmount: 200,
    carcCode: 'CO-11', reason: 'Diagnosis code does not support the procedure billed',
    category: 'coding', appealDeadline: '2026-04-28', daysUntilDeadline: 27,
    status: 'new', suggestedAction: 'Review diagnosis-procedure pairing; consider F84.0 or F90.2',
    receivedDate: '2026-03-20',
  },
  {
    id: 'd5', claimId: 'CLM-2026-0830', patientName: 'Riley C.', dateOfService: '2026-02-20',
    cptCode: '90834', payer: 'Cigna', billedAmount: 150, deniedAmount: 150,
    carcCode: 'CO-29', reason: 'Claim submitted after filing deadline',
    category: 'timely-filing', appealDeadline: '2026-04-01', daysUntilDeadline: 0,
    status: 'new', suggestedAction: 'Locate clearinghouse submission receipt for proof',
    receivedDate: '2026-03-15',
  },
  {
    id: 'd6', claimId: 'CLM-2026-0815', patientName: 'Casey L.', dateOfService: '2026-02-14',
    cptCode: '90837', payer: 'Aetna', billedAmount: 185, deniedAmount: 185,
    carcCode: 'CO-18', reason: 'Duplicate claim already processed',
    category: 'duplicate', appealDeadline: '2026-05-01', daysUntilDeadline: 30,
    status: 'corrected', suggestedAction: 'Verify original claim payment; void if needed',
    receivedDate: '2026-03-10',
  },
  {
    id: 'd7', claimId: 'CLM-2026-0798', patientName: 'Morgan T.', dateOfService: '2026-02-07',
    cptCode: '90834', payer: 'BCBS Arizona', billedAmount: 150, deniedAmount: 150,
    carcCode: 'CO-197', reason: 'Prior authorization expired before service date',
    category: 'auth', appealDeadline: '2026-04-20', daysUntilDeadline: 19,
    status: 'appealed', suggestedAction: 'Appeal submitted — awaiting payer response',
    receivedDate: '2026-03-05',
  },
  {
    id: 'd8', claimId: 'CLM-2026-0780', patientName: 'Drew N.', dateOfService: '2026-01-30',
    cptCode: '97153', payer: 'AHCCCS', billedAmount: 240, deniedAmount: 120,
    carcCode: 'CO-97', reason: 'Procedure bundled — partial payment applied',
    category: 'coding', appealDeadline: '2026-04-30', daysUntilDeadline: 29,
    status: 'recovered', suggestedAction: 'Partial recovery achieved via modifier 59',
    receivedDate: '2026-02-28',
  },
];

// ============================================================================
// Helpers
// ============================================================================

function urgencyColor(days: number): string {
  if (days <= 0) return 'text-red-600 bg-red-50 border-red-200';
  if (days <= 7) return 'text-red-600 bg-red-50 border-red-200';
  if (days <= 14) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-[#5A6B7A] bg-[#FAF7F2] border-[#E8E4DF]';
}

function categoryLabel(cat: Denial['category']): string {
  const labels: Record<string, string> = {
    'missing-info': 'Missing Info',
    auth: 'Authorization',
    coding: 'Coding Error',
    'medical-necessity': 'Medical Necessity',
    'timely-filing': 'Timely Filing',
    eligibility: 'Eligibility',
    duplicate: 'Duplicate',
  };
  return labels[cat] || cat;
}

function categoryColor(cat: Denial['category']): string {
  const colors: Record<string, string> = {
    'missing-info': 'bg-blue-100 text-blue-700',
    auth: 'bg-violet-100 text-violet-700',
    coding: 'bg-orange-100 text-orange-700',
    'medical-necessity': 'bg-red-100 text-red-700',
    'timely-filing': 'bg-[#F0EDE8] text-[#3A4A57]',
    eligibility: 'bg-[#6B9080]/10 text-cyan-700',
    duplicate: 'bg-[#F0EDE8] text-[#5A6B7A]',
  };
  return colors[cat] || 'bg-[#F0EDE8] text-[#5A6B7A]';
}

function statusConfig(status: Denial['status']) {
  const cfg: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    new: { label: 'New', color: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-3 h-3" /> },
    'in-review': { label: 'In Review', color: 'bg-amber-100 text-amber-700', icon: <Eye className="w-3 h-3" /> },
    appealed: { label: 'Appealed', color: 'bg-blue-100 text-blue-700', icon: <Send className="w-3 h-3" /> },
    corrected: { label: 'Corrected', color: 'bg-emerald-100 text-emerald-700', icon: <Edit3 className="w-3 h-3" /> },
    recovered: { label: 'Recovered', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3 h-3" /> },
    'written-off': { label: 'Written Off', color: 'bg-[#F0EDE8] text-[#5A6B7A]', icon: <XCircle className="w-3 h-3" /> },
  };
  return cfg[status] || cfg.new;
}

// ============================================================================
// Denial Inbox
// ============================================================================

function DenialInbox({
  denials,
  onSelect,
}: {
  denials: Denial[];
  onSelect: (d: Denial) => void;
}) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    let result = [...denials];
    if (filterCategory !== 'all') result = result.filter((d) => d.category === filterCategory);
    if (filterStatus !== 'all') result = result.filter((d) => d.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.patientName.toLowerCase().includes(q) ||
          d.claimId.toLowerCase().includes(q) ||
          d.carcCode.toLowerCase().includes(q) ||
          d.payer.toLowerCase().includes(q)
      );
    }
    // Sort by appeal deadline urgency
    result.sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline);
    return result;
  }, [denials, filterCategory, filterStatus, searchQuery]);

  const categories = ['all', ...Array.from(new Set(denials.map((d) => d.category)))];
  const statuses = ['all', 'new', 'in-review', 'appealed', 'corrected', 'recovered', 'written-off'];

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Search patient, claim ID, code..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-8 text-sm h-8"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filterCategory === cat
                ? 'bg-slate-800 text-white'
                : 'bg-[#F0EDE8] text-[#5A6B7A] hover:bg-[#E8E4DF]'
            }`}
          >
            {cat === 'all' ? 'All' : categoryLabel(cat as Denial['category'])}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap transition-colors ${
              filterStatus === s
                ? 'bg-slate-700 text-white'
                : 'bg-white text-[#5A6B7A] border border-[#E8E4DF] hover:bg-[#FAF7F2]'
            }`}
          >
            {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Denial Cards */}
      <div className="space-y-2">
        {filtered.map((denial) => {
          const sc = statusConfig(denial.status);
          return (
            <motion.div
              key={denial.id}
              layout
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card
                className={`p-3 cursor-pointer hover:shadow-sm transition-all border ${urgencyColor(denial.daysUntilDeadline).split(' ').find(c => c.startsWith('border-')) || 'border-[#E8E4DF]'}`}
                onClick={() => onSelect(denial)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className={`w-4 h-4 ${denial.daysUntilDeadline <= 7 ? 'text-red-500' : 'text-amber-500'}`} />
                      <span className="text-sm font-semibold text-[#1B2733]">{denial.patientName}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.color}`}>
                    {sc.icon} {sc.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${categoryColor(denial.category)}`}>
                    {categoryLabel(denial.category)}
                  </span>
                  <span className="text-xs text-[#5A6B7A]">{denial.carcCode}</span>
                  <span className="text-xs text-slate-400">&middot;</span>
                  <span className="text-xs text-[#5A6B7A]">{denial.payer}</span>
                  <span className="text-xs text-slate-400">&middot;</span>
                  <span className="text-xs text-[#5A6B7A]">{denial.cptCode}</span>
                </div>

                <p className="text-xs text-[#5A6B7A] mb-2">{denial.reason}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#3A4A57]">${denial.deniedAmount}</span>
                    <span className="text-xs text-slate-400">{denial.dateOfService}</span>
                  </div>
                  <div className={`text-xs font-medium ${denial.daysUntilDeadline <= 0 ? 'text-red-600' : denial.daysUntilDeadline <= 7 ? 'text-red-500' : 'text-[#5A6B7A]'}`}>
                    {denial.daysUntilDeadline <= 0
                      ? 'DEADLINE EXPIRED'
                      : `${denial.daysUntilDeadline}d to appeal`}
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-[#F0EDE8] flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-6 h-6 text-slate-400" />
            </div>
            {denials.length === 0 ? (
              <>
                <p className="text-sm font-semibold text-[#3A4A57]">No denials to work</p>
                <p className="text-xs text-[#5A6B7A] mt-1 max-w-xs mx-auto">
                  When a payer denies one of your claims, it will land here with the reason code and a suggested fix.
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-400">No denials match your filters</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Denial Detail / Actions
// ============================================================================

function DenialDetail({
  denial,
  onBack,
}: {
  denial: Denial;
  onBack: () => void;
}) {
  const [showAppealLetter, setShowAppealLetter] = useState(false);
  const sc = statusConfig(denial.status);

  const carcInfo = CARC_DESCRIPTIONS[denial.carcCode];

  const appealSteps: AppealStep[] = [
    { id: '1', label: 'Denial Received', date: denial.receivedDate, status: 'complete', description: `${denial.carcCode}: ${denial.reason}` },
    { id: '2', label: 'Review & Categorize', date: denial.status !== 'new' ? denial.receivedDate : undefined, status: denial.status === 'new' ? 'current' : 'complete' },
    { id: '3', label: 'Corrective Action', status: denial.status === 'in-review' ? 'current' : denial.status === 'new' ? 'upcoming' : 'complete' },
    { id: '4', label: 'Appeal / Resubmit', status: denial.status === 'appealed' ? 'current' : ['new', 'in-review'].includes(denial.status) ? 'upcoming' : 'complete' },
    { id: '5', label: 'Resolution', status: ['recovered', 'written-off', 'corrected'].includes(denial.status) ? 'complete' : 'upcoming' },
  ];

  const appealLetterTemplate = `
[Your Practice Name]
[Address]
[Date]

${denial.payer}
Appeals Department

RE: Appeal of Claim Denial
Claim ID: ${denial.claimId}
Patient: ${denial.patientName}
Date of Service: ${denial.dateOfService}
CPT Code: ${denial.cptCode}
Denied Amount: $${denial.deniedAmount}
CARC Code: ${denial.carcCode}

Dear Appeals Committee,

I am writing to appeal the denial of the above-referenced claim. The service provided was medically necessary and appropriate for the patient's condition.

${denial.category === 'medical-necessity'
    ? 'The patient presents with documented clinical needs that meet medical necessity criteria as defined by current evidence-based guidelines. The treatment plan was developed following comprehensive assessment and is consistent with accepted standards of care for the patient\'s diagnosis.\n\nEnclosed please find:\n1. Complete treatment plan with measurable goals\n2. Progress notes demonstrating medical necessity\n3. Relevant peer-reviewed literature supporting the intervention'
    : denial.category === 'auth'
    ? 'The service was provided in accordance with the patient\'s treatment plan. I am requesting retroactive authorization based on the clinical urgency of the patient\'s presentation. Documentation supporting the medical necessity of the service at the time it was rendered is enclosed.'
    : denial.category === 'coding'
    ? 'Upon review, I believe the original coding accurately reflects the service provided. [Alternatively: I have corrected the coding to more accurately reflect the service rendered.] Please find the updated claim information enclosed.'
    : 'I have reviewed the denial reason and am providing the requested information/correction to support reprocessing of this claim.'}

I respectfully request that you reconsider this denial and reprocess the claim for payment.

Sincerely,
[Provider Name, Credentials]
NPI: [Your NPI]
  `.trim();

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="text-xs text-[#5A6B7A]">
        <ArrowLeft className="w-3 h-3 mr-1" /> Back to Inbox
      </Button>

      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-[#1B2733]">{denial.patientName}</h3>
            <p className="text-xs text-[#5A6B7A]">{denial.claimId} &middot; {denial.dateOfService}</p>
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>
            {sc.icon} {sc.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-400">Payer</span>
            <p className="font-medium text-[#3A4A57]">{denial.payer}</p>
          </div>
          <div>
            <span className="text-slate-400">CPT Code</span>
            <p className="font-medium text-[#3A4A57]">{denial.cptCode}</p>
          </div>
          <div>
            <span className="text-slate-400">Denied Amount</span>
            <p className="font-bold text-red-600">${denial.deniedAmount}</p>
          </div>
          <div>
            <span className="text-slate-400">Appeal Deadline</span>
            <p className={`font-medium ${denial.daysUntilDeadline <= 7 ? 'text-red-600' : 'text-[#3A4A57]'}`}>
              {denial.appealDeadline} ({denial.daysUntilDeadline}d)
            </p>
          </div>
        </div>
      </Card>

      {/* Denial Reason */}
      <Card className="p-4 border-red-200 bg-red-50">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800 mb-1">{denial.carcCode}: {categoryLabel(denial.category)}</p>
            <p className="text-xs text-red-700">{denial.reason}</p>
            {carcInfo && (
              <p className="text-xs text-red-600 mt-1 italic">Standard: {carcInfo.reason}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Suggested Action */}
      <Card className="p-4 border-emerald-200 bg-emerald-50">
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800 mb-1">Suggested Action</p>
            <p className="text-xs text-emerald-700">{denial.suggestedAction}</p>
          </div>
        </div>
      </Card>

      {/* One-Click Actions */}
      <div className="grid grid-cols-2 gap-2">
        {denial.category === 'missing-info' && (
          <Button variant="outline" size="sm" className="h-9 text-xs justify-start">
            <Edit3 className="w-3 h-3 mr-1.5" /> Correction Form
          </Button>
        )}
        {denial.category === 'auth' && (
          <Button variant="outline" size="sm" className="h-9 text-xs justify-start">
            <RefreshCw className="w-3 h-3 mr-1.5" /> Request Retro-Auth
          </Button>
        )}
        {denial.category === 'coding' && (
          <Button variant="outline" size="sm" className="h-9 text-xs justify-start">
            <Sparkles className="w-3 h-3 mr-1.5" /> Suggest Correct Code
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs justify-start"
          onClick={() => setShowAppealLetter(!showAppealLetter)}
        >
          <FileText className="w-3 h-3 mr-1.5" /> {showAppealLetter ? 'Hide' : 'Generate'} Appeal Letter
        </Button>
        <Button variant="outline" size="sm" className="h-9 text-xs justify-start">
          <Send className="w-3 h-3 mr-1.5" /> Resubmit Claim
        </Button>
        <Button variant="outline" size="sm" className="h-9 text-xs justify-start text-red-600 border-red-200">
          <XCircle className="w-3 h-3 mr-1.5" /> Write Off
        </Button>
      </div>

      {/* Appeal Letter */}
      <AnimatePresence>
        {showAppealLetter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#1B2733] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  Generated Appeal Letter
                </h3>
                <Button variant="ghost" size="sm" className="h-6 text-xs">
                  <Copy className="w-3 h-3 mr-1" /> Copy
                </Button>
              </div>
              <pre className="text-xs text-[#3A4A57] whitespace-pre-wrap bg-[#FAF7F2] rounded-lg p-3 border border-[#E8E4DF] max-h-64 overflow-y-auto leading-relaxed">
                {appealLetterTemplate}
              </pre>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="text-xs flex-1">
                  <Download className="w-3 h-3 mr-1" /> Download PDF
                </Button>
                <Button variant="outline" size="sm" className="text-xs flex-1">
                  <Edit3 className="w-3 h-3 mr-1" /> Edit Letter
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-[#1B2733] mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          Appeal Timeline
        </h3>
        <div className="relative pl-6">
          {appealSteps.map((step, i) => (
            <div key={step.id} className="relative pb-4 last:pb-0">
              {/* Connector line */}
              {i < appealSteps.length - 1 && (
                <div className={`absolute left-[-16px] top-5 w-0.5 h-full ${
                  step.status === 'complete' ? 'bg-emerald-400' : 'bg-[#E8E4DF]'
                }`} />
              )}
              {/* Step dot */}
              <div className={`absolute left-[-20px] top-1 w-3 h-3 rounded-full border-2 ${
                step.status === 'complete'
                  ? 'bg-emerald-500 border-emerald-500'
                  : step.status === 'current'
                  ? 'bg-white border-blue-500 ring-2 ring-blue-200'
                  : 'bg-white border-slate-300'
              }`} />
              <div>
                <p className={`text-sm font-medium ${
                  step.status === 'complete' ? 'text-[#3A4A57]' : step.status === 'current' ? 'text-blue-700' : 'text-slate-400'
                }`}>
                  {step.label}
                </p>
                {step.date && <p className="text-xs text-slate-400">{step.date}</p>}
                {step.description && <p className="text-xs text-[#5A6B7A] mt-0.5">{step.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// Analytics Panel
// ============================================================================

function AnalyticsPanel({ denials }: { denials: Denial[] }) {
  // No denials → no analytics. Avoids rendering placeholder rates / divide-by-zero
  // revenue figures to providers who have no denial history yet.
  if (denials.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-[#F0EDE8] flex items-center justify-center mx-auto mb-3">
          <BarChart3 className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-[#3A4A57]">No denial analytics yet</p>
        <p className="text-xs text-[#5A6B7A] mt-1 max-w-xs mx-auto">
          Recovery rates, top denial reasons, and revenue-at-risk trends appear once you have denied claims to analyze.
        </p>
      </Card>
    );
  }

  const totalDenied = denials.reduce((s, d) => s + d.deniedAmount, 0);
  const recovered = denials.filter((d) => d.status === 'recovered');
  const totalRecovered = recovered.reduce((s, d) => s + d.deniedAmount, 0);
  const recoveryRate = denials.length > 0 ? Math.round((recovered.length / denials.length) * 100) : 0;
  const denialRate = 12; // mock: 12% of all claims denied

  // Top reasons
  const reasonCounts = denials.reduce<Record<string, number>>((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + 1;
    return acc;
  }, {});
  const topReasons = Object.entries(reasonCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const maxReasonCount = topReasons.length > 0 ? topReasons[0][1] : 1;

  // By payer
  const payerDenials = denials.reduce<Record<string, { count: number; amount: number }>>((acc, d) => {
    if (!acc[d.payer]) acc[d.payer] = { count: 0, amount: 0 };
    acc[d.payer].count++;
    acc[d.payer].amount += d.deniedAmount;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <p className="text-xs text-[#5A6B7A]">Total Denied</p>
          <p className="text-xl font-bold text-red-600">${totalDenied.toLocaleString()}</p>
          <p className="text-xs text-slate-400">{denials.length} claims</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-[#5A6B7A]">Recovered</p>
          <p className="text-xl font-bold text-emerald-600">${totalRecovered.toLocaleString()}</p>
          <p className="text-xs text-slate-400">{recovered.length} claims</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-[#5A6B7A]">Denial Rate</p>
          <div className="flex items-center gap-1">
            <p className="text-xl font-bold text-[#1B2733]">{denialRate}%</p>
            <TrendingDown className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xs text-emerald-500">-2% vs last month</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-[#5A6B7A]">Recovery Rate</p>
          <div className="flex items-center gap-1">
            <p className="text-xl font-bold text-[#1B2733]">{recoveryRate}%</p>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xs text-emerald-500">+5% vs last month</p>
        </Card>
      </div>

      {/* Top Denial Reasons */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-[#1B2733] mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-violet-500" />
          Top Denial Reasons
        </h3>
        <div className="space-y-3">
          {topReasons.map(([cat, count]) => {
            const pct = Math.round((count / maxReasonCount) * 100);
            return (
              <div key={cat}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-[#3A4A57]">{categoryLabel(cat as Denial['category'])}</span>
                  <span className="text-[#5A6B7A]">{count} ({Math.round((count / denials.length) * 100)}%)</span>
                </div>
                <div className="w-full h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-violet-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Denial by Payer */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-[#1B2733] mb-3">Denials by Payer</h3>
        <div className="space-y-2">
          {Object.entries(payerDenials)
            .sort(([, a], [, b]) => b.amount - a.amount)
            .map(([payer, data]) => (
              <div key={payer} className="flex items-center justify-between py-2 border-b border-[#E8E4DF] last:border-0">
                <div>
                  <p className="text-sm font-medium text-[#3A4A57]">{payer}</p>
                  <p className="text-xs text-slate-400">{data.count} denials</p>
                </div>
                <span className="text-sm font-semibold text-red-600">${data.amount.toLocaleString()}</span>
              </div>
            ))}
        </div>
      </Card>

      {/* $ Impact */}
      <Card className="p-4 bg-[#EEF4F8] border-[#C8DDE8]">
        <div className="flex items-start gap-3">
          <DollarSign className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-[#4A6478]">Revenue Impact</h3>
            <p className="text-xs text-blue-600 mt-1">
              At your current denial rate of {denialRate}%, approximately ${Math.round(totalDenied * 12 / denials.length * 30).toLocaleString()} in
              annual revenue is at risk. Reducing denials by 3% would recover an estimated
              ${Math.round(totalDenied * 0.25).toLocaleString()} per quarter.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// Rework Queue
// ============================================================================

function ReworkQueue({ denials }: { denials: Denial[] }) {
  const reworkItems = denials.filter((d) => ['new', 'in-review'].includes(d.status));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1B2733]">Claims Needing Correction</h3>
        <Badge variant="outline" className="text-xs">
          {reworkItems.length} items
        </Badge>
      </div>

      {reworkItems.length === 0 ? (
        <Card className="p-6 text-center">
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-[#5A6B7A]">All caught up! No claims need rework.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {reworkItems.map((denial) => (
            <Card key={denial.id} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-[#3A4A57]">{denial.patientName}</p>
                  <p className="text-xs text-slate-400">{denial.claimId}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${categoryColor(denial.category)}`}>
                  {categoryLabel(denial.category)}
                </span>
              </div>
              <p className="text-xs text-[#5A6B7A] mb-2">{denial.suggestedAction}</p>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${denial.daysUntilDeadline <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
                  {denial.daysUntilDeadline <= 0 ? 'OVERDUE' : `${denial.daysUntilDeadline}d remaining`}
                </span>
                <div className="flex gap-1">
                  {denial.category === 'missing-info' && (
                    <Button variant="outline" size="sm" className="h-6 text-[10px]">
                      <Edit3 className="w-2.5 h-2.5 mr-0.5" /> Fix
                    </Button>
                  )}
                  {denial.category === 'coding' && (
                    <Button variant="outline" size="sm" className="h-6 text-[10px]">
                      <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Recode
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="h-6 text-[10px]">
                    <Send className="w-2.5 h-2.5 mr-0.5" /> Resubmit
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function DenialWorkbench({
  providerId = 'demo-provider',
  onBack,
}: DenialWorkbenchProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('inbox');
  const [selectedDenial, setSelectedDenial] = useState<Denial | null>(null);
  // Sample denials are shown only in demo mode (investor/AACT walkthroughs).
  // Real providers see their own payer denials once the claims pipeline syncs them.
  const denials = isDemoMode() ? MOCK_DENIALS : [];

  const newCount = denials.filter((d) => d.status === 'new').length;
  const urgentCount = denials.filter((d) => d.daysUntilDeadline <= 7 && !['recovered', 'written-off', 'corrected'].includes(d.status)).length;
  const totalAtRisk = denials
    .filter((d) => !['recovered', 'written-off'].includes(d.status))
    .reduce((s, d) => s + d.deniedAmount, 0);

  const views: { id: ViewMode; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'inbox', label: 'Inbox', icon: <Inbox className="w-4 h-4" />, badge: newCount || undefined },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'rework', label: 'Rework', icon: <RefreshCw className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-mist pb-20">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DF] px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-3">
          {onBack && (
            <button onClick={onBack} className="text-[#5A6B7A]">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold text-[#1B2733]">Denial Workbench</h1>
            <p className="text-xs text-[#5A6B7A]">
              {urgentCount} urgent &middot; ${totalAtRisk.toLocaleString()} at risk
            </p>
          </div>
        </div>

        {/* View Tabs */}
        {!selectedDenial && (
          <div className="flex gap-1">
            {views.map((v) => {
              const isActive = viewMode === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setViewMode(v.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'bg-[#F0EDE8] text-[#5A6B7A] hover:bg-[#E8E4DF]'
                  }`}
                >
                  {v.icon}
                  {v.label}
                  {v.badge != null && v.badge > 0 && (
                    <span
                      className={`ml-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                        isActive ? 'bg-white text-[#1B2733]' : 'bg-red-500 text-white'
                      }`}
                    >
                      {v.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {selectedDenial ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              <DenialDetail denial={selectedDenial} onBack={() => setSelectedDenial(null)} />
            </motion.div>
          ) : (
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              {viewMode === 'inbox' && (
                <DenialInbox denials={denials} onSelect={setSelectedDenial} />
              )}
              {viewMode === 'analytics' && <AnalyticsPanel denials={denials} />}
              {viewMode === 'rework' && <ReworkQueue denials={denials} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
