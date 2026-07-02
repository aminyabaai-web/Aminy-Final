// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * DesktopSideNav - premium desktop shell for Aminy
 *
 * Brand notes (see .claude/skills/aminy-design):
 * - Teal #2A7D99 is the single accent; navy #0D1B2A/#132F43 is ink.
 * - Icon chips carry a soft teal tint so Lucide icons stay visible on
 *   white cards (icons are 20px, strokeWidth 2 — set via the `size`
 *   prop because precompiled h-5/w-5 can be overridden elsewhere).
 * - The wordmark is lowercase "aminy" in Fredoka with the two-tone
 *   compass (mirrors ProviderLanding's inline CompassIcon).
 */

import React from 'react';
import {
  Home,
  Baby,
  MessageCircle,
  Settings,
  User,
  Heart,
  Sparkles,
  Shield,
  ClipboardList,
  FolderOpen,
  ChevronRight,
  Video,
} from 'lucide-react';

/* Inline two-tone compass — navy ring, navy + teal needle (same art as ProviderLanding) */
function CompassIcon({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
    >
      <circle cx="32" cy="32" r="28" fill="none" stroke="#0D1B2A" strokeWidth="5" />
      <g transform="rotate(-45 32 32)">
        <path d="M32 32 L28 34 L32 10 L36 34 Z" fill="#0D1B2A" />
        <path d="M32 32 L28 30 L32 54 L36 30 Z" fill="#2A7D99" />
      </g>
      <circle cx="32" cy="32" r="2.2" fill="#ffffff" />
    </svg>
  );
}

interface DesktopSideNavProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  userName?: string;
}

interface NavItem {
  id: string;
  label: string;
  helper: string;
  icon: React.ElementType;
  /** Accessible name when the visible label alone is ambiguous */
  ariaLabel?: string;
}

const companionItems: NavItem[] = [
  // NOTE: ids must be valid AppScreen values in App.tsx — 'home' and
  // 'document-vault' were dead links (the real screens are 'dashboard'
  // and 'vault').
  { id: 'dashboard', label: 'Home', helper: 'Today and next steps', icon: Home },
  { id: 'care-plan', label: 'My Plan', helper: 'Goals & routines', icon: Heart },
  { id: 'ask-aminy', label: 'Aminy', helper: 'Guidance & memory', icon: Sparkles, ariaLabel: 'Open Aminy AI chat' },
  { id: 'telehealth', label: 'Care', helper: 'Book expert visits', icon: Video },
  { id: 'junior', label: 'Ease', helper: 'Calm & rewards', icon: Baby },
];

const supportItems: NavItem[] = [
  { id: 'messages', label: 'Messages', helper: 'Care team and family', icon: MessageCircle },
  { id: 'incident-log', label: 'Incident Log', helper: 'Log what happened', icon: ClipboardList },
  { id: 'vault', label: 'Document Vault', helper: 'Records and uploads', icon: FolderOpen },
  { id: 'crisis-resources', label: 'Crisis Help', helper: 'Immediate support', icon: Shield },
];

const adminItems: NavItem[] = [
  { id: 'settings', label: 'Settings', helper: 'App preferences', icon: Settings },
  { id: 'profile', label: 'Profile', helper: 'Account & household', icon: User },
];

/* Soft card treatment shared by the three sidebar panels */
const cardShadow = '0 8px 24px rgba(15, 23, 42, 0.05)';
const cardBorder = '1px solid rgba(19, 47, 67, 0.06)';

function NavGroup({
  title,
  items,
  currentScreen,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  currentScreen: string;
  onNavigate: (screen: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="px-1 text-[12px] font-medium text-[#5A6B7A]">{title}</div>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = currentScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-label={item.ariaLabel}
              aria-current={active ? 'page' : undefined}
              className={[
                'group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors duration-200',
                active ? 'text-[#132F43]' : 'text-[#3A4A57] hover:bg-[#EDF4F7]',
              ].join(' ')}
              style={
                active
                  ? {
                      background: 'rgba(42, 125, 153, 0.08)',
                      boxShadow: 'inset 0 0 0 1px rgba(42, 125, 153, 0.2)',
                    }
                  : undefined
              }
            >
              <div
                className={[
                  'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                  active ? 'bg-[#2A7D99] text-white' : 'bg-[#EDF4F7] text-[#2A7D99]',
                ].join(' ')}
              >
                <Icon size={20} strokeWidth={2} style={{ width: 20, height: 20 }} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-[#132F43]">{item.label}</div>
                <div className="truncate text-[12px] text-[#5A6B7A]">{item.helper}</div>
              </div>

              <ChevronRight
                size={16}
                strokeWidth={2}
                style={{ width: 16, height: 16 }}
                className={['transition-colors', active ? 'text-[#2A7D99]' : 'text-slate-400'].join(' ')}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DesktopSideNav({ currentScreen, onNavigate, userName }: DesktopSideNavProps) {
  const displayName = userName || 'Your household';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'A';

  return (
    <nav
      className="sticky top-0 hidden h-screen min-h-screen w-[296px] flex-shrink-0 overflow-y-auto px-4 pb-5 pt-6 text-[#132F43] md:flex"
      style={{
        background: 'linear-gradient(180deg, #F6FBFB 0%, #EDF4F7 100%)',
        borderRight: '1px solid rgba(19, 47, 67, 0.06)',
      }}
      aria-label="Desktop navigation"
    >
      <div className="flex min-h-full w-full flex-col gap-3">
        {/* Brand lockup */}
        <div className="rounded-[24px] bg-white p-4" style={{ border: cardBorder, boxShadow: cardShadow }}>
          <div className="inline-flex rounded-full bg-[#2A7D99]/10 px-3 py-1 text-xs font-medium text-[#2A7D99]">
            Caregiver companion
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] bg-white"
              style={{ border: '1px solid rgba(19, 47, 67, 0.08)', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)' }}
            >
              <CompassIcon size={34} />
            </div>
            <div className="min-w-0">
              <div
                className="text-[28px] text-[#0D1B2A]"
                style={{ fontFamily: "'Fredoka', 'Schibsted Grotesk', sans-serif", fontWeight: 600, lineHeight: 1.1 }}
              >
                aminy
              </div>
              <div className="mt-1 text-[12px] italic text-[#5A6B7A]">
                Gentle guidance. Meaningful progress.
              </div>
            </div>
          </div>

          <div
            className="mt-4 rounded-2xl bg-white p-3"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(19, 47, 67, 0.08)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="whitespace-nowrap text-[12px] text-[#5A6B7A]">Telehealth states</span>
              <span
                className="whitespace-nowrap text-[12px] font-semibold text-[#132F43]"
                style={{ letterSpacing: '0.04em' }}
              >
                AZ · MT · TX
              </span>
            </div>
            <div
              className="mt-2 flex items-center justify-between gap-2 pt-2"
              style={{ borderTop: '1px solid rgba(19, 47, 67, 0.06)' }}
            >
              <span className="whitespace-nowrap text-[12px] text-[#5A6B7A]">Companion</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap text-[12px] font-semibold text-[#132F43]">
                <Sparkles size={13} strokeWidth={2} style={{ width: 13, height: 13 }} className="text-[#2A7D99]" />
                Always-on AI
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 rounded-[24px] bg-white p-3" style={{ border: cardBorder, boxShadow: cardShadow }}>
          <div className="space-y-4">
            <NavGroup title="Companion" items={companionItems} currentScreen={currentScreen} onNavigate={onNavigate} />
            <NavGroup title="Support" items={supportItems} currentScreen={currentScreen} onNavigate={onNavigate} />
            <NavGroup title="Account" items={adminItems} currentScreen={currentScreen} onNavigate={onNavigate} />
          </div>
        </div>

        {/* Signed-in footer */}
        <div className="rounded-[24px] bg-white p-4" style={{ border: cardBorder, boxShadow: cardShadow }}>
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#EDF4F7] text-[14px] font-semibold text-[#2A7D99]"
              aria-hidden="true"
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium text-[#5A6B7A]">Signed in</div>
              <div className="truncate text-[15px] font-semibold text-[#0D1B2A]">{displayName}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[#2A7D99] hover:text-[#2A7D99]"
          >
            Manage account
            <ChevronRight size={14} strokeWidth={2} style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>
    </nav>
  );
}

export default DesktopSideNav;
