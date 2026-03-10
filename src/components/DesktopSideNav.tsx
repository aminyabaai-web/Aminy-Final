/**
 * DesktopSideNav - Vertical sidebar navigation for tablet/desktop screens
 *
 * Only visible on md: breakpoint and up (hidden on mobile).
 * Mirrors the same nav items as BottomNavigation.
 */

import React, { useState } from 'react';
import {
  Home,
  Baby,
  MessageCircle,
  Video,
  Menu,
  Settings,
  User,
  Heart,
  Sparkles,
  MoreHorizontal,
  Shield,
  ClipboardList,
  FolderOpen,
  ChevronRight,
  X
} from 'lucide-react';

interface DesktopSideNavProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  userName?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const primaryNavItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'ask-aminy', label: 'Ask Aminy', icon: Sparkles },
  { id: 'junior', label: 'Junior', icon: Baby },
  { id: 'care-plan', label: 'Care Plan', icon: Heart },
  { id: 'telehealth', label: 'Telehealth', icon: Video },
];

const secondaryNavItems: NavItem[] = [
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'incident-log', label: 'Log Incident', icon: ClipboardList },
  { id: 'document-vault', label: 'Vault', icon: FolderOpen },
  { id: 'crisis-resources', label: 'Crisis Help', icon: Shield },
];

const bottomNavItems: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'profile', label: 'Profile', icon: User },
];

export function DesktopSideNav({ currentScreen, onNavigate, userName }: DesktopSideNavProps) {
  const allNavIds = [
    ...primaryNavItems,
    ...secondaryNavItems,
    ...bottomNavItems,
  ].map((item) => item.id);

  const isActive = (id: string) => currentScreen === id;

  return (
    <nav
      className="hidden md:flex flex-col w-60 min-h-screen bg-[#0D1B2A] text-white flex-shrink-0 sticky top-0 h-screen overflow-y-auto"
      aria-label="Desktop navigation"
    >
      {/* Logo / Brand */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-lg font-bold tracking-tight">Aminy</div>
          {userName && (
            <div className="text-xs text-gray-400 truncate max-w-[140px]">
              {userName}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-white/10 mb-2" />

      {/* Primary nav */}
      <div className="flex-1 px-3 space-y-1">
        <div className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Main
        </div>
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? 'bg-teal-600/20 text-teal-300'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }
              `}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={active ? 2 : 1.5} />
              <span>{item.label}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400" />
              )}
            </button>
          );
        })}

        {/* Secondary section */}
        <div className="px-2 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Tools
        </div>
        {secondaryNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? 'bg-teal-600/20 text-teal-300'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }
              `}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={active ? 2 : 1.5} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom items */}
      <div className="px-3 pb-4 space-y-1 mt-auto">
        <div className="mx-1 border-t border-white/10 mb-3" />
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? 'bg-teal-600/20 text-teal-300'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }
              `}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={active ? 2 : 1.5} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default DesktopSideNav;
