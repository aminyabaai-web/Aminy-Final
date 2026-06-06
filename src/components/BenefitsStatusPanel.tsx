// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * BenefitsStatusPanel — State-aware benefits tracker.
 *
 * Shows state-specific program names, DD agency contact info, waiver details,
 * application status tracking, and action items for unapplied programs.
 * Reads user state from props → localStorage fallback.
 */

import React, { useMemo } from 'react';
import {
  CheckCircle,
  Clock,
  FileQuestion,
  AlertCircle,
  Phone,
  Globe,
  Shield,
  HandHeart,
  GraduationCap,
  DollarSign,
  ChevronRight,
  Star,
  ExternalLink,
} from 'lucide-react';
import { getStateConfig } from '../lib/state-configs';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type BenefitStatusValue = 'not-started' | 'submitted' | 'review' | 'approved' | 'info-requested' | 'denied';

export interface BenefitTrackedItem {
  id: string;
  program: string;          // e.g. "DDD Eligibility", "ALTCS Application"
  status: BenefitStatusValue;
  date?: Date;
  notes?: string;
  url?: string;
}

interface BenefitsStatusPanelProps {
  stateAbbr?: string;                   // two-letter state abbr; falls back to localStorage
  statuses?: BenefitTrackedItem[];      // tracked application items (optional, legacy-compatible)
  onAddStatus?: (item: BenefitTrackedItem) => void;
  compact?: boolean;                    // condensed view for dashboard widgets
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BenefitStatusValue, {
  icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
}> = {
  'not-started': { icon: Clock,         color: '#8A9BA8', bg: '#F5F2EC', label: 'Not started' },
  'submitted':   { icon: Clock,         color: '#7BA7BC', bg: 'rgba(123,167,188,0.12)', label: 'Submitted' },
  'review':      { icon: Clock,         color: '#E0A45F', bg: 'rgba(224,164,95,0.12)',  label: 'In review' },
  'approved':    { icon: CheckCircle,   color: '#43AA8B', bg: 'rgba(67,170,139,0.12)',  label: 'Approved ✓' },
  'info-requested': { icon: FileQuestion, color: '#E07A5F', bg: 'rgba(224,122,95,0.12)', label: 'Info needed' },
  'denied':      { icon: AlertCircle,   color: '#DC2626', bg: 'rgba(220,38,38,0.10)',   label: 'Denied' },
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function BenefitsStatusPanel({
  stateAbbr: propStateAbbr,
  statuses = [],
  compact = false,
}: BenefitsStatusPanelProps) {
  // Resolve state: prop → localStorage aminy_user_state → aminy_just_diagnosed.state
  const resolvedStateAbbr = useMemo(() => {
    if (propStateAbbr) return propStateAbbr;
    try {
      const simple = localStorage.getItem('aminy_user_state');
      if (simple) return simple;
      const jd = localStorage.getItem('aminy_just_diagnosed');
      if (jd) { const parsed = JSON.parse(jd); if (parsed?.state) return parsed.state; }
    } catch { /* ignore */ }
    return null;
  }, [propStateAbbr]);

  const stateConfig = resolvedStateAbbr ? getStateConfig(resolvedStateAbbr) : null;

  // Build the canonical list of programs to track for this state
  const trackedPrograms: BenefitTrackedItem[] = useMemo(() => {
    if (statuses.length > 0) return statuses;
    if (!stateConfig) return DEFAULT_PROGRAMS;

    return [
      {
        id: 'dd-eligibility',
        program: `${stateConfig.ddAgency.abbreviation} Eligibility Determination`,
        status: 'not-started',
        url: stateConfig.ddAgency.url,
        notes: stateConfig.ddAgency.intakeProcess,
      },
      {
        id: 'waiver',
        program: `${stateConfig.waiver.abbreviation} Waiver Application`,
        status: 'not-started',
        url: stateConfig.waiver.url,
        notes: stateConfig.waiver.estimatedWaitMonths === 0
          ? 'No waitlist — apply as soon as eligible.'
          : stateConfig.waiver.estimatedWaitMonths
            ? `Typical wait ~${stateConfig.waiver.estimatedWaitMonths} months. Apply early.`
            : undefined,
      },
      {
        id: 'medicaid',
        program: `${stateConfig.medicaid.name} Enrollment`,
        status: 'not-started',
        url: stateConfig.medicaid.url,
        notes: `Covers ABA therapy${stateConfig.medicaid.abaAgeLimit ? ` for children under ${stateConfig.medicaid.abaAgeLimit}` : ''}.`,
      },
      {
        id: 'iep',
        program: 'IEP / Special Education Evaluation',
        status: 'not-started',
        notes: stateConfig.schoolSystemNote || 'Request a special education evaluation in writing from your school district. Federal law (IDEA) gives the district 60 days to respond.',
      },
      {
        id: 'insurance-aba',
        program: 'Commercial Insurance ABA Authorization',
        status: 'not-started',
        notes: stateConfig.abaMandateLaw || 'Most commercial plans are required to cover ABA therapy. Request a prior authorization from your insurer.',
      },
    ];
  }, [statuses, stateConfig]);

  if (compact) {
    return <CompactView programs={trackedPrograms} stateConfig={stateConfig} />;
  }

  return (
    <div style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>
      {/* State header */}
      {stateConfig && (
        <div
          style={{
            background: 'rgba(107,144,128,0.07)',
            border: '1px solid rgba(107,144,128,0.18)',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B9080', letterSpacing: '0.06em', marginBottom: 8 }}>
            {stateConfig.name.toUpperCase()} BENEFITS NAVIGATOR
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <InfoRow icon={Shield} label={stateConfig.medicaid.name} sublabel="Medicaid" />
            <InfoRow icon={HandHeart} label={`${stateConfig.ddAgency.name} (${stateConfig.ddAgency.abbreviation})`} sublabel="DD Agency" />
            <InfoRow
              icon={Clock}
              label={
                stateConfig.waiver.estimatedWaitMonths === 0
                  ? `${stateConfig.waiver.abbreviation} — No waitlist ✓`
                  : stateConfig.waiver.estimatedWaitMonths
                    ? `${stateConfig.waiver.abbreviation} — ~${stateConfig.waiver.estimatedWaitMonths} month wait`
                    : stateConfig.waiver.abbreviation
              }
              sublabel="HCBS Waiver"
              accent={stateConfig.waiver.estimatedWaitMonths === 0}
            />
          </div>
          {stateConfig.ddAgency.phone && (
            <a
              href={`tel:${stateConfig.ddAgency.phone.replace(/\D/g, '')}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 10, fontSize: 13, fontWeight: 600, color: '#6B9080',
                textDecoration: 'none',
              }}
            >
              <Phone size={13} />
              {stateConfig.ddAgency.abbreviation}: {stateConfig.ddAgency.phone}
            </a>
          )}
        </div>
      )}

      {/* Program tracker */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1B2733', marginBottom: 12 }}>
          Application Tracker
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {trackedPrograms.map((item) => {
            const cfg = STATUS_CONFIG[item.status];
            const Icon = cfg.icon;
            return (
              <div
                key={item.id}
                style={{
                  background: '#fff',
                  border: '1px solid #E8E4DF',
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: cfg.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={17} color={cfg.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1B2733' }}>
                      {item.program}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: cfg.color,
                        background: cfg.bg,
                        borderRadius: 100,
                        padding: '1px 7px',
                        letterSpacing: '0.03em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  {item.notes && (
                    <p style={{ fontSize: 12, color: '#5A6B7A', lineHeight: 1.5, margin: 0 }}>
                      {item.notes}
                    </p>
                  )}
                  {item.date && (
                    <p style={{ fontSize: 11, color: '#8A9BA8', margin: '3px 0 0' }}>
                      Updated {item.date.toLocaleDateString()}
                    </p>
                  )}
                </div>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ flexShrink: 0, color: '#8A9BA8', display: 'flex', alignItems: 'center' }}
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Self-directed highlight */}
      {stateConfig?.waiver.selfDirected && (
        <div
          style={{
            background: 'rgba(67,170,139,0.08)',
            border: '1px solid rgba(67,170,139,0.20)',
            borderRadius: 12,
            padding: '12px 14px',
            marginTop: 12,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <Star size={15} color="#43AA8B" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#43AA8B', marginBottom: 3 }}>
              Self-Directed Option Available
            </div>
            <p style={{ fontSize: 12, color: '#3A5A4A', lineHeight: 1.5, margin: 0 }}>
              <strong>{stateConfig.waiver.selfDirected}</strong> lets your family manage care workers and
              how waiver dollars are spent.
              {stateConfig.waiver.selfDirectedFI ? ` Fiscal intermediary: ${stateConfig.waiver.selfDirectedFI}.` : ''}
              {' '}Ask your {stateConfig.ddAgency.abbreviation} support coordinator about getting paid to
              care for your child.
            </p>
          </div>
        </div>
      )}

      {/* Key resources */}
      {stateConfig?.keyResources && stateConfig.keyResources.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8A9BA8', letterSpacing: '0.05em', marginBottom: 8 }}>
            KEY RESOURCES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stateConfig.keyResources.map(r => (
              <a
                key={r.label}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 13, color: '#7BA7BC', fontWeight: 500,
                  textDecoration: 'none',
                  padding: '8px 12px',
                  background: '#fff',
                  border: '1px solid #E8E4DF',
                  borderRadius: 10,
                }}
              >
                <Globe size={13} color="#7BA7BC" />
                {r.label}
                <ChevronRight size={13} color="#8A9BA8" style={{ marginLeft: 'auto' }} />
              </a>
            ))}
          </div>
        </div>
      )}

      <p style={{ fontSize: 11, color: '#8A9BA8', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
        Aminy nudges you only when something needs your attention.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT VIEW (for dashboard widgets)
// ─────────────────────────────────────────────────────────────────────────────

function CompactView({ programs, stateConfig }: { programs: BenefitTrackedItem[]; stateConfig: ReturnType<typeof getStateConfig> | null }) {
  const approved = programs.filter(p => p.status === 'approved').length;
  const inProgress = programs.filter(p => p.status === 'submitted' || p.status === 'review').length;
  const notStarted = programs.filter(p => p.status === 'not-started').length;

  return (
    <div style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>
      {stateConfig && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6B9080', background: 'rgba(107,144,128,0.10)', borderRadius: 100, padding: '2px 10px' }}>
            {stateConfig.medicaid.name}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#7BA7BC', background: 'rgba(123,167,188,0.10)', borderRadius: 100, padding: '2px 10px' }}>
            {stateConfig.ddAgency.abbreviation}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#43AA8B', background: 'rgba(67,170,139,0.10)', borderRadius: 100, padding: '2px 10px' }}>
            {stateConfig.waiver.abbreviation}
          </span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        {approved > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#43AA8B' }}>{approved}</div>
            <div style={{ fontSize: 11, color: '#8A9BA8' }}>Approved</div>
          </div>
        )}
        {inProgress > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#7BA7BC' }}>{inProgress}</div>
            <div style={{ fontSize: 11, color: '#8A9BA8' }}>In progress</div>
          </div>
        )}
        {notStarted > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#E07A5F' }}>{notStarted}</div>
            <div style={{ fontSize: 11, color: '#8A9BA8' }}>To start</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, sublabel, accent = false }: {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  accent?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon size={13} color={accent ? '#43AA8B' : '#8A9BA8'} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: '#8A9BA8' }}>{sublabel}: </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: accent ? '#43AA8B' : '#3A4A57' }}>
        {label}
      </span>
    </div>
  );
}

const DEFAULT_PROGRAMS: BenefitTrackedItem[] = [
  { id: 'dd', program: 'DD Agency Eligibility', status: 'not-started', notes: 'Contact your state DD agency to start the eligibility process.' },
  { id: 'waiver', program: 'HCBS Waiver Application', status: 'not-started', notes: 'Apply for your state Medicaid HCBS waiver.' },
  { id: 'medicaid', program: 'State Medicaid Enrollment', status: 'not-started', notes: 'Covers ABA therapy and other services.' },
  { id: 'iep', program: 'IEP / Special Ed Evaluation', status: 'not-started', notes: 'Request a special education evaluation from your school district in writing.' },
  { id: 'insurance', program: 'ABA Insurance Authorization', status: 'not-started', notes: 'Request prior authorization for ABA from your commercial insurer.' },
];
