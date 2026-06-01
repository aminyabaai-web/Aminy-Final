// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * DesktopSideNav - premium desktop shell for Aminy
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
  Activity,
  Video,
  Compass,
} from 'lucide-react';

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
}

const companionItems: NavItem[] = [
  { id: 'home', label: 'Home', helper: 'Today and next steps', icon: Home },
  { id: 'care-plan', label: 'My Plan', helper: 'Goals, routines & progress', icon: Heart },
  { id: 'ask-aminy', label: 'Aminy', helper: 'AI guidance and memory', icon: Sparkles },
  { id: 'telehealth', label: 'Care', helper: 'Book visits with experts', icon: Video },
  { id: 'junior', label: 'Ease', helper: 'Calm, rewards, transitions', icon: Baby },
];

const supportItems: NavItem[] = [
  { id: 'messages', label: 'Messages', helper: 'Care team and family', icon: MessageCircle },
  { id: 'incident-log', label: 'Incident Log', helper: 'Capture what happened', icon: ClipboardList },
  { id: 'document-vault', label: 'Document Vault', helper: 'Records and uploads', icon: FolderOpen },
  { id: 'crisis-resources', label: 'Crisis Help', helper: 'Immediate support', icon: Shield },
];

const adminItems: NavItem[] = [
  { id: 'settings', label: 'Settings', helper: 'Preferences and controls', icon: Settings },
  { id: 'profile', label: 'Profile', helper: 'Account and household', icon: User },
];

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
    <div className="space-y-2.5">
      <div className="px-1 text-[12px] font-medium tracking-[0.01em] text-slate-500">
        {title}
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = currentScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              className={[
                'group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-200',
                active
                  ? 'bg-teal-50 text-slate-900 shadow-[0_14px_32px_rgba(20,184,166,0.12)] ring-1 ring-inset ring-teal-200/80'
                  : 'bg-transparent text-slate-700 hover:bg-white/85 hover:text-slate-950',
              ].join(' ')}
            >
              <div
                className={[
                  'flex h-10 w-10 items-center justify-center rounded-2xl transition-colors',
                  active
                    ? 'bg-teal-600 text-white'
                    : 'bg-white text-slate-500 shadow-sm group-hover:bg-teal-50 group-hover:text-teal-700',
                ].join(' ')}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.1 : 1.9} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold tracking-[-0.01em]">{item.label}</div>
                <div className="truncate text-[12px] text-slate-500 group-hover:text-slate-600">{item.helper}</div>
              </div>

              <ChevronRight
                className={[
                  'h-4 w-4 transition-all',
                  active ? 'translate-x-0 text-teal-500' : 'text-slate-400 group-hover:translate-x-0.5 group-hover:text-slate-600',
                ].join(' ')}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DesktopSideNav({ currentScreen, onNavigate, userName }: DesktopSideNavProps) {
  return (
    <nav
      className="sticky top-0 hidden h-screen min-h-screen w-[296px] flex-shrink-0 overflow-y-auto border-r border-slate-200/50 px-5 pb-5 pt-6 text-slate-900 md:flex"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(45, 212, 191, 0.16), transparent 24%), linear-gradient(180deg, #f8fbfb 0%, #f1f7f8 46%, #eef4f8 100%)',
      }}
      aria-label="Desktop navigation"
    >
      <div className="flex min-h-full w-full flex-col gap-5">
        <div
          className="rounded-[28px] border border-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,252,252,0.86))' }}
        >
          <div className="min-w-0">
            <div className="inline-flex rounded-full bg-teal-50 px-3 py-1.5 text-xs font-medium tracking-[0.02em] text-teal-700">
              Caregiver companion
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-teal-500 to-cyan-500 shadow-[0_12px_28px_rgba(45,212,191,0.2)]">
                <Compass className="h-7 w-7 text-white" strokeWidth={2} aria-label="Aminy" />
              </div>
              <div className="min-w-0">
                <div className="text-[1.75rem] font-semibold tracking-[-0.05em] text-slate-950">Aminy</div>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Gentle guidance. Meaningful progress.
                </div>
                <div className="mt-1 text-[13px] leading-5 text-slate-600">
                  Calm guidance, care access, and progress your family can actually use.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-white/85 p-3 ring-1 ring-inset ring-slate-200/70">
              <div className="text-xs font-medium text-slate-500">Access</div>
              <div className="mt-1 text-[14px] font-semibold text-slate-900">AZ · MT · TX</div>
              <div className="text-[12px] text-slate-600">Supported telehealth states</div>
            </div>
            <div className="rounded-2xl bg-white/85 p-3 ring-1 ring-inset ring-slate-200/70">
              <div className="text-xs font-medium text-slate-500">Focus</div>
              <div className="mt-1 flex items-center gap-1.5 text-[14px] font-semibold text-slate-900">
                <Activity className="h-3.5 w-3.5 text-teal-600" />
                Live workflow
              </div>
              <div className="text-[12px] text-slate-600">Guidance, care access, records</div>
            </div>
          </div>
        </div>

        <div
          className="flex-1 rounded-[28px] border border-white/90 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.82), rgba(247,251,251,0.74))' }}
        >
          <div className="space-y-6">
            <NavGroup title="Companion" items={companionItems} currentScreen={currentScreen} onNavigate={onNavigate} />
            <NavGroup title="Support" items={supportItems} currentScreen={currentScreen} onNavigate={onNavigate} />
            <NavGroup title="Account" items={adminItems} currentScreen={currentScreen} onNavigate={onNavigate} />
          </div>
        </div>

        <div
          className="rounded-[24px] border border-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,252,252,0.84))' }}
        >
          <div className="text-xs font-medium text-slate-500">Signed in</div>
          <div className="mt-2 text-[15px] font-semibold text-slate-950">{userName || 'Your household'}</div>
          <div className="mt-1 text-[12px] leading-5 text-slate-600">
            Guidance, telehealth, and records stay in one calmer place.
          </div>
        </div>
      </div>
    </nav>
  );
}

export default DesktopSideNav;
