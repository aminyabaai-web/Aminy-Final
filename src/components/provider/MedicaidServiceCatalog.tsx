// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * MedicaidServiceCatalog
 * HCBS waiver and Medicaid service codes used by Acumen/DCI DSP agencies.
 * Screen: 'medicaid-service-catalog'
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ChevronDown, ChevronUp, CheckCircle, XCircle,
  AlertCircle, DollarSign, Clock, FileText, Search,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────

interface ServiceCode {
  code: string;
  name: string;
  description: string;
  typicalDuration: string;
  rateRangeAZ: string;
  docRequirements: string[];
  evvRequired: boolean;
  priorAuthRequired: boolean;
  category: 'habilitation' | 'personal-care' | 'employment' | 'companion' | 'community';
}

// ─── Service catalog data ─────────────────────────────────────────────

const SERVICES: ServiceCode[] = [
  {
    code: 'H2014',
    name: 'Skills Training and Development (Habilitation)',
    description: 'Individualized training to acquire, maintain, or improve self-help, socialization, and adaptive skills. Provided in community or home setting. Goal is increased independence in daily life.',
    typicalDuration: '1–6 hrs/day',
    rateRangeAZ: '$22–28/hr',
    docRequirements: [
      'Individual Support Plan (ISP)',
      'Session note with skill targets addressed',
      'Progress data toward habilitation goals',
      'DSP signature',
    ],
    evvRequired: true,
    priorAuthRequired: true,
    category: 'habilitation',
  },
  {
    code: 'H2015',
    name: 'Comprehensive Community Support',
    description: 'Supports integration into the community, participation in community activities, and development of natural supports. May include supported recreation, community navigation, and socialization.',
    typicalDuration: '1–4 hrs/session',
    rateRangeAZ: '$18–22/hr',
    docRequirements: [
      'ISP with community integration goals',
      'Activity log with locations visited',
      'Session note',
      'Member signature (when able)',
    ],
    evvRequired: true,
    priorAuthRequired: true,
    category: 'community',
  },
  {
    code: 'S5130',
    name: 'Homemaker / Personal Assistance',
    description: 'Assistance with household tasks (light cleaning, laundry, meal prep) that the member is unable to perform due to disability. Does not include personal hygiene tasks — see T1019.',
    typicalDuration: '1–4 hrs/visit',
    rateRangeAZ: '$16–20/hr',
    docRequirements: [
      'Homemaker task checklist completed each visit',
      'ISP authorizing homemaker services',
      'DSP time log',
    ],
    evvRequired: true,
    priorAuthRequired: false,
    category: 'personal-care',
  },
  {
    code: 'S5135',
    name: 'Companion Services',
    description: 'Non-medical care, supervision, and socialization for adults with disabilities. Prevents isolation and supports safety. Companion does not perform household tasks (see S5130).',
    typicalDuration: '1–8 hrs/session',
    rateRangeAZ: '$16–20/hr',
    docRequirements: [
      'ISP with companion service authorization',
      'Companion log: activities, locations, incidents',
      'Daily check-in notation',
    ],
    evvRequired: true,
    priorAuthRequired: false,
    category: 'companion',
  },
  {
    code: 'T1019',
    name: 'Personal Care Services',
    description: 'Assistance with activities of daily living (ADLs): bathing, dressing, grooming, toileting, transferring, eating. Provided by qualified DSP trained in personal care. Most common HCBS code.',
    typicalDuration: '30 min–4 hrs/visit',
    rateRangeAZ: '$20–24/hr',
    docRequirements: [
      'ISP with personal care hours authorized',
      'ADL checklist per visit',
      'DSP certification on file',
      'EVV check-in/check-out GPS verified',
    ],
    evvRequired: true,
    priorAuthRequired: true,
    category: 'personal-care',
  },
  {
    code: 'H2023',
    name: 'Supported Employment',
    description: 'Job coaching, job development, and on-the-job support for individuals with disabilities in competitive integrated employment. Includes job placement assistance and employer liaison.',
    typicalDuration: '1–4 hrs/session',
    rateRangeAZ: '$28–35/hr',
    docRequirements: [
      'Employment plan with job goals',
      'Session note: tasks supported, employer contact',
      'Monthly progress report',
      'Vocational assessment (initial)',
    ],
    evvRequired: false,
    priorAuthRequired: true,
    category: 'employment',
  },
];

const CATEGORY_LABELS: Record<ServiceCode['category'], string> = {
  habilitation: 'Habilitation',
  'personal-care': 'Personal Care',
  employment: 'Employment',
  companion: 'Companion',
  community: 'Community',
};

const CATEGORY_COLORS: Record<ServiceCode['category'], string> = {
  habilitation: 'bg-[#6B9080]/10 text-[#6B9080]',
  'personal-care': 'bg-blue-100 text-blue-700',
  employment: 'bg-green-100 text-green-700',
  companion: 'bg-violet-100 text-violet-700',
  community: 'bg-amber-100 text-amber-700',
};

// ─── Service Card ─────────────────────────────────────────────────────

function ServiceCard({ service }: { service: ServiceCode }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left p-4 flex items-start gap-3"
      >
        <div className="bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded-lg min-w-fit mt-0.5">
          {service.code}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-[#1B2733] text-sm leading-snug">{service.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${CATEGORY_COLORS[service.category]}`}>
                {CATEGORY_LABELS[service.category]}
              </span>
            </div>
            {expanded ? <ChevronUp className="w-5 h-5 text-[#8A9BA8] flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-5 h-5 text-[#8A9BA8] flex-shrink-0 mt-0.5" />}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1 text-xs text-[#5A6B7A]">
              <DollarSign className="w-3.5 h-3.5" />
              <span className="font-medium text-[#3A4A57]">{service.rateRangeAZ}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#5A6B7A]">
              <Clock className="w-3.5 h-3.5" />
              <span>{service.typicalDuration}</span>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${service.evvRequired ? 'bg-red-50 text-red-700' : 'bg-[#F0EDE8] text-[#5A6B7A]'}`}>
              {service.evvRequired ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              EVV {service.evvRequired ? 'required' : 'not required'}
            </div>
            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${service.priorAuthRequired ? 'bg-orange-50 text-orange-700' : 'bg-[#F0EDE8] text-[#5A6B7A]'}`}>
              {service.priorAuthRequired ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
              {service.priorAuthRequired ? 'Prior auth required' : 'No prior auth'}
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-[#E8E4DF] pt-3 space-y-3">
              <p className="text-sm text-[#5A6B7A]">{service.description}</p>
              <div>
                <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide mb-2 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Documentation Requirements
                </p>
                <ul className="space-y-1">
                  {service.docRequirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#3A4A57]">
                      <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

interface MedicaidServiceCatalogProps {
  onBack?: () => void;
}

export default function MedicaidServiceCatalog({ onBack }: MedicaidServiceCatalogProps) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<ServiceCode['category'] | 'all'>('all');

  const filtered = SERVICES.filter(s => {
    const matchesSearch = search === '' ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'all' || s.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-mist pb-8">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E4DF] sticky top-0 z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-[#F0EDE8] text-[#5A6B7A]">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold text-[#1B2733]">Medicaid Service Catalog</h1>
            <p className="text-xs text-[#5A6B7A]">HCBS / DDD Waiver — Arizona (Acumen/DCI compatible)</p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9BA8]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by code or name..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E8E4DF] text-sm focus:border-[#6B9080] focus:outline-none"
          />
        </div>

        {/* Category filter */}
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {(['all', 'habilitation', 'personal-care', 'employment', 'companion', 'community'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition-colors ${
                filterCategory === cat
                  ? 'bg-primary text-white'
                  : 'bg-[#F0EDE8] text-[#5A6B7A] hover:bg-[#E8E4DF]'
              }`}
            >
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      <div className="mx-4 mt-4 p-3 bg-[#EEF4F8] border border-[#C8DDE8] rounded-xl">
        <p className="text-xs text-blue-700">
          <strong>{filtered.length} service codes</strong> — rates are AZ DDD estimates (FY2025-26).
          Verify with your AHCCCS provider agreement. EVV via DCI, Acumen, or Therap.
        </p>
      </div>

      {/* Cards */}
      <div className="px-4 mt-3 space-y-3">
        {filtered.map(service => (
          <ServiceCard key={service.code} service={service} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[#8A9BA8]">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No services match your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
