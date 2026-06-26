// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Crisis Resources Page
 *
 * Comprehensive crisis resources available both online and offline.
 * This page is always cached by the service worker for emergency access.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Phone,
  MessageSquare,
  Heart,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Wifi,
  WifiOff,
  ArrowLeft,
  Search,
} from 'lucide-react';
import { Button } from './ui/button';
import { HAPTICS } from '../lib/mobile-experience-enhancer';
import { Card } from './ui/card';
import { Input } from './ui/input';
import {
  CRISIS_RESOURCES,
  CrisisResource,
  getResourcesByCategory,
  getEmergencyResources,
  searchResources,
} from '../lib/crisis-resources';
import { isOnline, onConnectivityChange } from '../lib/service-worker';

interface CrisisResourcesProps {
  onBack?: () => void;
}

const CATEGORY_INFO = {
  emergency: {
    label: 'Emergency',
    icon: AlertTriangle,
    color: 'bg-red-500',
    description: 'Call immediately if there is danger',
  },
  hotline: {
    label: 'Crisis Hotlines',
    icon: Phone,
    color: 'bg-orange-500',
    description: '24/7 support when you need to talk',
  },
  technique: {
    label: 'Calming Techniques',
    icon: Heart,
    color: 'bg-primary',
    description: 'Strategies to help during difficult moments',
  },
  safety: {
    label: 'Safety Planning',
    icon: Shield,
    color: 'bg-[#7BA7BC]',
    description: 'Prepare for and manage challenging situations',
  },
  'self-care': {
    label: 'Parent Self-Care',
    icon: Heart,
    color: 'bg-purple-500',
    description: 'Take care of yourself to care for others',
  },
};

export function CrisisResources({ onBack }: CrisisResourcesProps) {
  const [online, setOnline] = useState(isOnline());
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedResource, setExpandedResource] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CrisisResource['category'] | 'all'>('all');

  useEffect(() => {
    const unsubscribe = onConnectivityChange(setOnline);
    return unsubscribe;
  }, []);

  const filteredResources = searchQuery
    ? searchResources(searchQuery)
    : activeCategory === 'all'
    ? CRISIS_RESOURCES
    : getResourcesByCategory(activeCategory);

  const emergencyResources = getEmergencyResources();

  return (
    <div className="min-h-screen bg-mist dark:bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-[#E8E4DF] dark:border-slate-700 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-[#5A6B7A] dark:text-slate-400 hover:bg-[#EDF4F7] dark:hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-xl font-bold text-[#132F43] dark:text-white flex-1">
            Crisis Resources
          </h1>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
            online
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          }`}>
            {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {online ? 'Online' : 'Offline'}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search crisis resources"
          />
        </div>
      </div>

      {/* Emergency Quick Access - Always Visible */}
      <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 p-4">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-red-200 bg-white/80 p-4 shadow-sm dark:border-red-900/40 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">
              Need help right now?
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#132F43] dark:text-white">
              Call or text 988 for immediate crisis support
            </h2>
            <p className="mt-1 text-sm text-[#5A6B7A] dark:text-slate-300">
              If there is immediate danger, call 911. Otherwise, 988 is the fastest next step for urgent mental-health support.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:min-w-[200px]">
            <Button asChild className="h-11 rounded-2xl bg-red-600 text-white hover:bg-red-700 action-button">
              <a href="tel:988" onClick={() => HAPTICS.heavy()}>Call or text 988 now</a>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-2xl border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/30">
              <a href="tel:911" onClick={() => HAPTICS.heavy()}>Call 911 if there is immediate danger</a>
            </Button>
          </div>
        </div>
        <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide mb-3">
          Immediate Help
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {emergencyResources.map((resource) => (
            <a
              key={resource.id}
              href={`tel:${resource.phoneNumber}`}
              className="flex-shrink-0 flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-3 rounded-xl shadow-sm border border-red-200 dark:border-red-800"
            >
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-[#132F43] dark:text-white text-sm">
                  {resource.title}
                </p>
                <p className="text-red-600 dark:text-red-400 font-bold">
                  {resource.phoneNumber}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="overflow-x-auto border-b border-[#E8E4DF] dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex gap-1 p-2 min-w-max">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === 'all'
                ? 'bg-[#6B9080]/10 text-[#6B9080] dark:bg-[#6B9080]/15 dark:text-primary'
                : 'text-[#5A6B7A] dark:text-slate-400 hover:bg-[#EDF4F7] dark:hover:bg-slate-700'
            }`}
          >
            All
          </button>
          {(Object.keys(CATEGORY_INFO) as CrisisResource['category'][]).map((category) => {
            const info = CATEGORY_INFO[category];
            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeCategory === category
                    ? 'bg-[#6B9080]/10 text-[#6B9080] dark:bg-[#6B9080]/15 dark:text-primary'
                    : 'text-[#5A6B7A] dark:text-slate-400 hover:bg-[#EDF4F7] dark:hover:bg-slate-700'
                }`}
              >
                <info.icon className="w-4 h-4" />
                {info.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Resources List */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#132F43] dark:text-white">All crisis supports</h2>
            <p className="text-sm text-[#5A6B7A] dark:text-slate-300">
              Browse hotlines, calming supports, safety planning, and parent self-care resources.
            </p>
          </div>
        </div>
        {filteredResources.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#5A6B7A] dark:text-slate-400">
              No resources found for "{searchQuery}"
            </p>
          </div>
        ) : (
          filteredResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              isExpanded={expandedResource === resource.id}
              onToggle={() =>
                setExpandedResource(
                  expandedResource === resource.id ? null : resource.id
                )
              }
            />
          ))
        )}
      </div>

      {/* Offline Notice */}
      {!online && (
        <div className="fixed bottom-0 left-0 right-0 bg-amber-500 text-white px-4 py-3 text-center text-sm">
          <WifiOff className="w-4 h-4 inline mr-2" />
          You're offline. These resources are available without internet.
        </div>
      )}
    </div>
  );
}

interface ResourceCardProps {
  resource: CrisisResource;
  isExpanded: boolean;
  onToggle: () => void;
}

function ResourceCard({ resource, isExpanded, onToggle }: ResourceCardProps) {
  const categoryInfo = CATEGORY_INFO[resource.category];
  const Icon = categoryInfo.icon;

  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 text-left flex items-start gap-3"
      >
        <div className={`w-10 h-10 rounded-lg ${categoryInfo.color} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#132F43] dark:text-white">
            {resource.title}
          </h3>
          <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
            {resource.description}
          </p>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-[#E8E4DF] dark:border-slate-700">
              <div className="pt-4 prose prose-sm dark:prose-invert max-w-none">
                {resource.content.split('\n').map((paragraph, i) => {
                  // Handle markdown-style headers
                  if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                    return (
                      <h4 key={i} className="font-bold text-[#132F43] dark:text-white mt-4 mb-2">
                        {paragraph.replace(/\*\*/g, '')}
                      </h4>
                    );
                  }
                  // Handle list items
                  if (paragraph.startsWith('- ')) {
                    return (
                      <li key={i} className="text-[#5A6B7A] dark:text-slate-300">
                        {paragraph.substring(2)}
                      </li>
                    );
                  }
                  // Handle numbered items
                  if (/^\d+\.\s/.test(paragraph)) {
                    return (
                      <li key={i} className="text-[#5A6B7A] dark:text-slate-300 list-decimal ml-4">
                        {paragraph.replace(/^\d+\.\s/, '')}
                      </li>
                    );
                  }
                  // Regular paragraph
                  if (paragraph.trim()) {
                    return (
                      <p key={i} className="text-[#5A6B7A] dark:text-slate-300 mb-2">
                        {paragraph}
                      </p>
                    );
                  }
                  return null;
                })}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-4">
                {resource.phoneNumber && (
                  <a
                    href={`tel:${resource.phoneNumber}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call {resource.phoneNumber}
                  </a>
                )}
                {resource.phoneNumber && resource.category === 'hotline' && (
                  <a
                    href={`sms:${resource.phoneNumber}${resource.phoneNumber === '741741' ? '?body=HOME' : ''}`}
                    className="inline-flex items-center justify-center gap-2 bg-[#E8E4DF] hover:bg-[#E8E4DF] dark:bg-slate-700 dark:hover:bg-slate-600 text-[#3A4A57] dark:text-slate-200 px-4 py-2.5 rounded-lg font-medium transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Text
                  </a>
                )}
                {resource.url && (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-[#E8E4DF] hover:bg-[#E8E4DF] dark:bg-slate-700 dark:hover:bg-slate-600 text-[#3A4A57] dark:text-slate-200 px-4 py-2.5 rounded-lg font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Learn More
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default CrisisResources;
