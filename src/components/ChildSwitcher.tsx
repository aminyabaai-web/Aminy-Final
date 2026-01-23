import React, { useState } from 'react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Plus, ChevronDown, Lock, Infinity, Crown } from 'lucide-react';
import { TierType, getMaxChildren, getTierDisplayName, compareTiers } from '../lib/tier-utils';

interface Child {
  id: string;
  name: string;
  age: number;
  conditions?: string[];
}

interface ChildSwitcherProps {
  children: Child[];
  activeChildId: string;
  onSwitch: (childId: string) => void;
  onAddChild: () => void;
  tier?: TierType;
  onUpgrade?: () => void;
}

export function ChildSwitcher({
  children,
  activeChildId,
  onSwitch,
  onAddChild,
  tier = 'free',
  onUpgrade
}: ChildSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeChild = children.find(c => c.id === activeChildId);

  // Get max children allowed for this tier
  const maxChildren = getMaxChildren(tier);
  const isUnlimited = maxChildren === Infinity;
  const canAddMore = isUnlimited || children.length < maxChildren;
  const childrenRemaining = isUnlimited ? Infinity : maxChildren - children.length;

  // Determine the next tier that allows more children
  const getUpgradeTierForChildren = (): TierType | null => {
    if (tier === 'proplus') return null;
    if (tier === 'pro') return 'proplus';
    if (tier === 'core') return 'proplus'; // Core has 3, Pro+ has unlimited
    if (tier === 'starter' || tier === 'free') return 'core';
    return 'core';
  };

  const upgradeTier = getUpgradeTierForChildren();

  // Empty state when no children exist
  if (children.length === 0) {
    return (
      <div className="p-6 text-center border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-sm text-muted-foreground mb-4">
          Add a child to get a plan tailored to them.
        </p>
        <Button onClick={onAddChild}>
          <Plus className="w-4 h-4 mr-2" />
          Add Child
        </Button>
        {!isUnlimited && (
          <p className="text-xs text-muted-foreground mt-3">
            Your {getTierDisplayName(tier)} plan supports up to {maxChildren} child
            {maxChildren !== 1 ? 'ren' : ''}.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Label above switcher */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-gray-900">
          Your children
        </label>
        {!isUnlimited && (
          <Badge variant="outline" className="text-xs">
            {children.length}/{maxChildren}
          </Badge>
        )}
        {isUnlimited && (
          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
            <Infinity className="w-3 h-3 mr-1" />
            Unlimited
          </Badge>
        )}
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors w-full"
      >
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-accent/20 text-accent font-medium">
            {activeChild?.name[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 text-left">
          <span className="font-medium">{activeChild?.name}</span>
          {activeChild?.conditions && activeChild.conditions.length > 0 && (
            <span className="text-xs text-muted-foreground ml-2">
              {activeChild.conditions[0]}
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="max-h-64 overflow-y-auto">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => {
                  onSwitch(child.id);
                  setIsOpen(false);
                }}
                className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-accent/20 text-accent font-medium">
                    {child.name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <div className="font-medium">{child.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Age {child.age}
                    {child.conditions && child.conditions.length > 0 && (
                      <span className="ml-1">• {child.conditions[0]}</span>
                    )}
                  </div>
                </div>
                {child.id === activeChildId && (
                  <Check className="w-5 h-5 text-accent" />
                )}
              </button>
            ))}
          </div>

          <div className="border-t p-2">
            {canAddMore ? (
              <button
                onClick={() => {
                  onAddChild();
                  setIsOpen(false);
                }}
                className="w-full p-2 flex items-center gap-2 text-accent hover:bg-accent/10 rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="font-medium">Add another child</span>
                {!isUnlimited && childrenRemaining > 0 && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    ({childrenRemaining} remaining)
                  </span>
                )}
              </button>
            ) : (
              <div className="p-2">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-medium">Child limit reached</span>
                </div>
                {upgradeTier && onUpgrade && (
                  <button
                    onClick={() => {
                      onUpgrade();
                      setIsOpen(false);
                    }}
                    className="w-full p-2 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-md hover:from-purple-600 hover:to-pink-600 transition-colors"
                  >
                    <Crown className="w-4 h-4" />
                    <span className="font-medium">
                      Upgrade to {getTierDisplayName(upgradeTier)}
                      {upgradeTier === 'proplus' ? ' for unlimited' : ''}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
