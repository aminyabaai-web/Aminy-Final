// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Care Team View
 *
 * Multi-provider care team management for each child:
 * - Shows all providers assigned (BCBA, RBT, SLP, OT, etc.)
 * - Provider cards: name, role, last session, next appointment, contact
 * - "Add to Care Team" flow with provider search
 * - Child selector for families with multiple children
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  getCareTeam,
  addTeamMember,
  removeTeamMember,
  searchProvidersForTeam,
  getChildren,
  type CareTeam,
  type CareTeamMember,
  type CareTeamRole,
  type ProviderSearchForTeam,
} from '../lib/care-team-service';

// ============================================================================
// Constants
// ============================================================================

const ROLE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  BCBA: { bg: '#e8f5f0', text: '#2d8a6e', icon: '\ud83c\udfaf' },
  RBT: { bg: '#e0f2e9', text: '#2d8a6e', icon: '\ud83e\udde9' },
  SLP: { bg: '#e8f0fe', text: '#1a56db', icon: '\ud83d\udde3\ufe0f' },
  OT: { bg: '#fff5e6', text: '#b87a3a', icon: '\u270b' },
  PT: { bg: '#f3e8ff', text: '#7e22ce', icon: '\ud83c\udfc3' },
  Psychologist: { bg: '#fce7f3', text: '#be185d', icon: '\ud83e\udde0' },
  'Developmental Pediatrician': { bg: '#ffe4e6', text: '#be123c', icon: '\ud83e\ude7a' },
  LCSW: { bg: '#e0e7ff', text: '#4338ca', icon: '\ud83d\udc9c' },
  Other: { bg: '#f5f5f5', text: '#666', icon: '\ud83d\udc64' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: '#43AA8B' },
  inactive: { label: 'Inactive', color: '#999' },
  pending: { label: 'Pending', color: '#F4A261' },
};

// ============================================================================
// Component
// ============================================================================

export default function CareTeamView() {
  const [children, setChildren] = useState<{ id: string; name: string; age: number }[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [careTeam, setCareTeam] = useState<CareTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddFlow, setShowAddFlow] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  // Load children list
  useEffect(() => {
    async function load() {
      const { data } = await getChildren();
      setChildren(data);
      if (data.length > 0) {
        setSelectedChildId(data[0].id);
      }
    }
    load();
  }, []);

  // Load care team when child changes
  const loadCareTeam = useCallback(async () => {
    if (!selectedChildId) return;
    setLoading(true);
    const { data } = await getCareTeam(selectedChildId);
    setCareTeam(data);
    setLoading(false);
  }, [selectedChildId]);

  useEffect(() => {
    loadCareTeam();
  }, [loadCareTeam]);

  async function handleRemoveMember(memberId: string) {
    const { error } = await removeTeamMember(memberId);
    if (!error) {
      loadCareTeam();
    }
  }

  async function handleAddMember(providerId: string, role: CareTeamRole) {
    if (!selectedChildId) return;
    await addTeamMember({ childId: selectedChildId, providerId, role });
    setShowAddFlow(false);
    loadCareTeam();
  }

  const activeMembers = careTeam?.members.filter((m) => m.status !== 'inactive') || [];
  const selectedChild = children.find((c) => c.id === selectedChildId);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', padding: '16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0D1B2A', margin: '0 0 4px 0' }}>
          Care Team
        </h1>
        <p style={{ fontSize: '14px', color: '#577590', margin: 0 }}>
          {selectedChild ? `${selectedChild.name}'s providers` : 'Your child\'s provider network'}
        </p>
      </div>

      {/* Child Selector */}
      {children.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px' }}>
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => setSelectedChildId(child.id)}
              style={{
                padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                backgroundColor: selectedChildId === child.id ? '#0D1B2A' : '#fff',
                color: selectedChildId === child.id ? '#fff' : '#0D1B2A',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                fontWeight: 600, fontSize: '13px',
              }}
            >
              {child.name} ({child.age}y)
            </button>
          ))}
        </div>
      )}

      {/* Team Summary */}
      {careTeam && activeMembers.length > 0 && (
        <div style={{
          display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px',
        }}>
          {activeMembers.map((m) => {
            const roleStyle = ROLE_COLORS[m.role] || ROLE_COLORS.Other;
            return (
              <div key={m.id} style={{
                padding: '6px 10px', borderRadius: '16px', backgroundColor: roleStyle.bg,
                fontSize: '11px', fontWeight: 600, color: roleStyle.text, whiteSpace: 'nowrap',
              }}>
                {roleStyle.icon} {m.role}
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <LoadingCards />
      ) : (
        <>
          {/* Provider Cards */}
          {activeMembers.length === 0 ? (
            <EmptyState onAdd={() => setShowAddFlow(true)} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeMembers.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  isExpanded={expandedMember === member.id}
                  onToggle={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
                  onRemove={() => handleRemoveMember(member.id)}
                />
              ))}
            </div>
          )}

          {/* Add to Care Team Button */}
          <button
            onClick={() => setShowAddFlow(true)}
            style={{
              width: '100%', padding: '14px', marginTop: '16px',
              borderRadius: '12px', border: '2px dashed #43AA8B',
              backgroundColor: 'transparent', color: '#43AA8B',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            + Add Provider to Care Team
          </button>
        </>
      )}

      {/* Add Provider Flow */}
      {showAddFlow && (
        <AddProviderModal
          onAdd={handleAddMember}
          onClose={() => setShowAddFlow(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Member Card
// ============================================================================

function MemberCard({
  member,
  isExpanded,
  onToggle,
  onRemove,
}: {
  member: CareTeamMember;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const roleStyle = ROLE_COLORS[member.role] || ROLE_COLORS.Other;
  const statusStyle = STATUS_LABELS[member.status] || STATUS_LABELS.active;

  return (
    <div style={{
      backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      borderLeft: `4px solid ${roleStyle.text}`,
    }}>
      {/* Main Row */}
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', padding: '14px', cursor: 'pointer' }}
      >
        {/* Avatar */}
        <div style={{
          width: '44px', height: '44px', borderRadius: '22px',
          backgroundColor: roleStyle.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', marginRight: '12px', flexShrink: 0,
        }}>
          {roleStyle.icon}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0D1B2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {member.provider?.name || 'Provider'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span style={{
              fontSize: '11px', fontWeight: 600, padding: '1px 6px', borderRadius: '3px',
              backgroundColor: roleStyle.bg, color: roleStyle.text,
            }}>
              {member.role}
            </span>
            {member.provider?.credentials && (
              <span style={{ fontSize: '11px', color: '#999' }}>{member.provider.credentials}</span>
            )}
          </div>
        </div>

        {/* Status */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: statusStyle.color }}>{statusStyle.label}</div>
          {member.isPrimary && (
            <div style={{ fontSize: '9px', color: '#F4A261', fontWeight: 700, marginTop: '2px' }}>PRIMARY</div>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div style={{ padding: '0 14px 14px 14px', borderTop: '1px solid #f0f0f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '12px' }}>
            <DetailItem
              label="Last Session"
              value={member.lastSessionDate ? formatDate(member.lastSessionDate) : 'No sessions yet'}
            />
            <DetailItem
              label="Next Appointment"
              value={member.nextAppointment ? formatDate(member.nextAppointment) : 'Not scheduled'}
            />
            <DetailItem label="Since" value={formatDate(member.startDate)} />
            <DetailItem label="Specialty" value={member.specialty || member.role} />
          </div>

          {member.notes && (
            <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '6px', fontSize: '12px', color: '#577590' }}>
              {member.notes}
            </div>
          )}

          {/* Contact Actions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            {member.provider?.email && (
              <a
                href={`mailto:${member.provider.email}`}
                style={{
                  flex: 1, padding: '8px', textAlign: 'center', borderRadius: '8px',
                  backgroundColor: '#e8f5f0', color: '#2d8a6e', fontSize: '12px', fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Email
              </a>
            )}
            {member.provider?.phone && (
              <a
                href={`tel:${member.provider.phone}`}
                style={{
                  flex: 1, padding: '8px', textAlign: 'center', borderRadius: '8px',
                  backgroundColor: '#e8f0fe', color: '#1a56db', fontSize: '12px', fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Call
              </a>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              style={{
                padding: '8px 12px', borderRadius: '8px', border: '1px solid #E07A5F',
                backgroundColor: '#fff', color: '#E07A5F', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Add Provider Modal
// ============================================================================

function AddProviderModal({
  onAdd,
  onClose,
}: {
  onAdd: (providerId: string, role: CareTeamRole) => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<CareTeamRole | ''>('');
  const [results, setResults] = useState<ProviderSearchForTeam[]>([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    setSearching(true);
    const { data } = await searchProvidersForTeam(searchQuery, selectedRole || undefined);
    setResults(data);
    setSearching(false);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery.length >= 2 || selectedRole) {
        handleSearch();
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, selectedRole]);

  const roles: CareTeamRole[] = ['BCBA', 'RBT', 'SLP', 'OT', 'PT', 'Psychologist', 'LCSW', 'Other'];

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '16px 16px 0 0', padding: '20px',
        width: '100%', maxWidth: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0D1B2A', margin: 0 }}>
            Add to Care Team
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#999', cursor: 'pointer' }}>
            \u00d7
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search providers by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', border: '1px solid #e0e0e0', borderRadius: '8px',
            fontSize: '14px', outline: 'none', marginBottom: '10px', boxSizing: 'border-box',
          }}
        />

        {/* Role Filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
          <button
            onClick={() => setSelectedRole('')}
            style={{
              padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
              border: !selectedRole ? '2px solid #0D1B2A' : '1px solid #e0e0e0',
              backgroundColor: !selectedRole ? '#0D1B2A' : '#fff',
              color: !selectedRole ? '#fff' : '#577590',
            }}
          >
            All
          </button>
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              style={{
                padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                border: selectedRole === role ? `2px solid ${(ROLE_COLORS[role] || ROLE_COLORS.Other).text}` : '1px solid #e0e0e0',
                backgroundColor: selectedRole === role ? (ROLE_COLORS[role] || ROLE_COLORS.Other).bg : '#fff',
                color: selectedRole === role ? (ROLE_COLORS[role] || ROLE_COLORS.Other).text : '#577590',
              }}
            >
              {role}
            </button>
          ))}
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {searching ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#577590', fontSize: '13px' }}>
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '13px' }}>
              {searchQuery || selectedRole ? 'No providers found' : 'Search or select a role to find providers'}
            </div>
          ) : (
            results.map((provider) => (
              <div
                key={provider.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: '1px solid #f0f0f0',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0D1B2A' }}>{provider.name}</div>
                  <div style={{ fontSize: '12px', color: '#577590' }}>{provider.credentials} - {provider.specialty}</div>
                  {provider.rating > 0 && (
                    <div style={{ fontSize: '11px', color: '#F4A261' }}>
                      {'*'.repeat(Math.round(provider.rating))} {provider.rating.toFixed(1)}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    const role = mapTypeToRole(provider.type);
                    onAdd(provider.id, role);
                  }}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', border: 'none',
                    backgroundColor: '#43AA8B', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Add
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: '#999', fontWeight: 600, marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#0D1B2A', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{
      textAlign: 'center', padding: '40px 20px',
      backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>&#x1F465;</div>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0D1B2A', margin: '0 0 8px 0' }}>
        No Care Team Yet
      </h3>
      <p style={{ fontSize: '13px', color: '#577590', margin: '0 0 16px 0' }}>
        Add providers to build your child&apos;s care team
      </p>
      <button
        onClick={onAdd}
        style={{
          padding: '10px 24px', borderRadius: '8px', border: 'none',
          backgroundColor: '#43AA8B', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
        }}
      >
        Find Providers
      </button>
    </div>
  );
}

function LoadingCards() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{
          backgroundColor: '#fff', borderRadius: '12px', padding: '14px', height: '72px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ width: '60%', height: '14px', backgroundColor: '#e9ecef', borderRadius: '4px', marginBottom: '8px' }} />
          <div style={{ width: '40%', height: '10px', backgroundColor: '#e9ecef', borderRadius: '4px' }} />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function mapTypeToRole(type: string): CareTeamRole {
  const map: Record<string, CareTeamRole> = {
    bcba: 'BCBA', rbt: 'RBT', slp: 'SLP', ot: 'OT', pt: 'PT',
    psychologist: 'Psychologist', lcsw: 'LCSW',
  };
  return map[type.toLowerCase()] || 'Other';
}
