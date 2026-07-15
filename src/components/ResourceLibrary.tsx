// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Resource Library — BCBA-authored guides, printables, and strategies.
 * Crushes Answers Now's resource section by combining:
 *   - Better content (plain language, BCBA-authored, evidence-based)
 *   - AI personalization (recommends based on child's recent behavior logs)
 *   - Live links to relevant group sessions on the same topic
 *   - "Ask Your BCBA Team" CTA at the bottom of every article
 */

import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { Search, BookOpen, FileText, CheckSquare, Scroll, Lock, Sparkles, Users, ChevronRight, X, Clock, ArrowLeft, ExternalLink } from 'lucide-react';
import { ScreenHeader } from './ui/ScreenHeader';
import {
  RESOURCES,
  RESOURCE_CATEGORIES,
  getResourcesByCategory,
  searchResources,
  getRecommendedResources,
  type Resource,
} from '../lib/resource-content';

interface ResourceLibraryProps {
  onBack?: () => void;
  userId?: string;
  childName?: string;
  tier?: string;
  /** Recent behavior categories from logs, used for AI recommendations */
  recentBehaviorCategories?: string[];
  /** Child's condition tags, used for AI recommendations */
  childConditions?: string[];
  onNavigate?: (screen: string) => void;
}

const TYPE_ICONS: Record<Resource['type'], React.ReactNode> = {
  guide:     <BookOpen className="w-3.5 h-3.5" />,
  printable: <FileText className="w-3.5 h-3.5" />,
  checklist: <CheckSquare className="w-3.5 h-3.5" />,
  script:    <Scroll className="w-3.5 h-3.5" />,
  video:     <span className="text-sm">▶</span>,
};

const TYPE_LABELS: Record<Resource['type'], string> = {
  guide:     'Guide',
  printable: 'Printable',
  checklist: 'Checklist',
  script:    'Script',
  video:     'Video',
};

export function ResourceLibrary({
  onBack,
  userId,
  childName,
  tier = 'core',
  recentBehaviorCategories = [],
  childConditions = [],
  onNavigate,
}: ResourceLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openResource, setOpenResource] = useState<Resource | null>(null);

  const isProPlus = tier === 'proplus' || tier === 'pro_plus';

  const recommended = useMemo(() =>
    getRecommendedResources(childConditions, recentBehaviorCategories, 3),
    [childConditions, recentBehaviorCategories]
  );

  const filteredResources = useMemo(() => {
    if (searchQuery.trim()) return searchResources(searchQuery);
    const list = getResourcesByCategory(selectedCategory);
    // The "Recommended for you" strip is visible in this exact state — exclude
    // its items from the main list so the first cards aren't duplicated.
    if (selectedCategory === 'all' && recommended.length > 0) {
      const recommendedIds = new Set(recommended.map(r => r.id));
      return list.filter(r => !recommendedIds.has(r.id));
    }
    return list;
  }, [selectedCategory, searchQuery, recommended]);

  if (openResource) {
    return (
      <ArticleView
        resource={openResource}
        onBack={() => setOpenResource(null)}
        childName={childName}
        isProPlus={isProPlus}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="min-h-screen bg-mist pb-20">
      <ScreenHeader
        title="Resource Library"
        subtitle="Expert guides, evidence-based"
        icon={<BookOpen className="w-6 h-6" />}
        onBack={onBack}
        variant="flat"
      />

      {/* Search */}
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSelectedCategory('all'); }}
            placeholder="Search guides, topics, strategies…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#E8E4DF] rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-[#6B9080]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category chips */}
      {!searchQuery && (
        <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1 scrollbar-none">
          {RESOURCE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className="flex items-center gap-1.5 whitespace-nowrap text-xs px-3 py-1.5 rounded-full border transition-all shrink-0"
              style={selectedCategory === cat.id
                ? { background: '#2A7D9915', borderColor: '#2A7D99', color: '#2A7D99', fontWeight: 600 }
                : { background: 'white', borderColor: '#e2e8f0', color: '#64748b' }}
            >
              <span>{cat.emoji}</span>{cat.label}
            </button>
          ))}
          {/* Trailing spacer: px-4 right padding collapses inside a scroll
              container, which clipped the last pill flush to the edge. */}
          <div className="shrink-0 w-2" aria-hidden="true" />
        </div>
      )}

      {/* AI Recommendations — shown when we have context */}
      {!searchQuery && selectedCategory === 'all' && recommended.length > 0 && (
        <div className="mx-4 mt-4 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #2A7D9912 0%, #21698212 100%)', border: '1px solid #2A7D9930' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#6B9080]" />
            <p className="text-xs font-semibold text-[#6B9080] uppercase tracking-wide">
              {childName ? `Most relevant for ${childName} right now` : 'Recommended for you'}
            </p>
          </div>
          <div className="space-y-2">
            {recommended.map(r => (
              <ResourceCard key={r.id} resource={r} onOpen={setOpenResource} compact />
            ))}
          </div>
        </div>
      )}

      {/* Resource list */}
      <div className="px-4 mt-4">
        {searchQuery && (
          <p className="text-sm text-[#5A6B7A] mb-3">
            {filteredResources.length} result{filteredResources.length !== 1 ? 's' : ''} for "{searchQuery}"
          </p>
        )}
        {filteredResources.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-dashed border-[#E8E4DF] p-6 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-[#5A6B7A]">No guides found. Try a different search or category.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredResources.map(r => (
              <ResourceCard key={r.id} resource={r} onOpen={setOpenResource} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom CTA — Ask BCBA team */}
      <div className="mx-4 mt-6 rounded-2xl border border-[#E8E4DF] bg-white dark:bg-slate-800 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2A7D99 0%, #216982 100%)' }}>
          <span className="text-white text-base">?</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#132F43]">Still have questions?</p>
          <p className="text-sm text-[#5A6B7A]">Ask your behavior specialist team — instant AI draft, clinician-reviewed within 24h.</p>
        </div>
        <button
          onClick={() => onNavigate?.('ask-bcba')}
          aria-label="Ask your behavior specialist"
          className="text-[#2A7D99] shrink-0"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ── Resource card (list view) ───────────────────────────────────────────────

function ResourceCard({ resource: r, onOpen, compact = false }: { resource: Resource; onOpen: (r: Resource) => void; compact?: boolean }) {
  return (
    <button
      onClick={() => onOpen(r)}
      className={`w-full text-left bg-white dark:bg-slate-800 border border-[#E8E4DF] rounded-2xl hover:border-[#6B9080]/30 transition-colors ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <TypeBadge type={r.type} />
            {r.isPremium && <PremiumBadge />}
            <span className="text-sm text-slate-400 flex items-center gap-0.5">
              <Clock className="w-3 h-3" />{r.readTimeMinutes} min
            </span>
            {r.ageRange && <span className="text-sm text-slate-400">· {r.ageRange}</span>}
          </div>
          <p className={`font-semibold text-[#132F43] leading-snug ${compact ? 'text-sm' : 'text-sm'}`}>{r.title}</p>
          {!compact && <p className="text-sm text-[#5A6B7A] mt-0.5 line-clamp-2">{r.subtitle}</p>}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
      </div>
    </button>
  );
}

// ── Article full view ───────────────────────────────────────────────────────

function ArticleView({
  resource: r,
  onBack,
  childName,
  isProPlus,
  onNavigate,
}: {
  resource: Resource;
  onBack: () => void;
  childName?: string;
  isProPlus: boolean;
  onNavigate?: (screen: string) => void;
}) {
  const isLocked = r.isPremium && !isProPlus;
  const bodyLines = r.body.split('\n');
  // Premium resources show first ~40% of content, then blur/lock
  const previewLineCount = isLocked ? Math.floor(bodyLines.length * 0.4) : bodyLines.length;

  // Real upcoming group sessions matching this article's topics — turns the
  // static "browse sessions" card into bookable inventory with dates & spots.
  const [liveSessions, setLiveSessions] = useState<{
    id: string; topic: string; session_date: string;
    price_per_family_cents: number; max_families: number; enrolled_count: number;
    provider_name: string | null;
  }[]>([]);
  useEffect(() => {
    if (isLocked || !r.relatedGroupTopics?.length) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('group_sessions')
          .select('id, topic, session_date, price_per_family_cents, max_families, enrolled_count, provider_name')
          .in('topic_category', r.relatedGroupTopics!)
          .in('status', ['open', 'confirmed'])
          .gte('session_date', new Date().toISOString())
          .order('session_date', { ascending: true })
          .limit(2);
        if (!cancelled && data) setLiveSessions(data);
      } catch { /* table may not exist in dev — static card still renders */ }
    })();
    return () => { cancelled = true; };
  }, [r.id, isLocked]);

  return (
    <div className="min-h-screen bg-mist pb-24">
      {/* Back header */}
      <div className="sticky top-0 z-10 bg-[#F6FBFB] border-b border-[#E8E4DF] px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-[#E8E4DF]">
          <ArrowLeft className="w-4 h-4 text-[#132F43]" />
        </button>
        <span className="text-sm font-medium text-[#132F43] truncate flex-1">{r.title}</span>
      </div>

      <div className="px-4 pt-5">
        {/* Type + metadata row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <TypeBadge type={r.type} />
          {r.isPremium && <PremiumBadge />}
          <span className="text-sm text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />{r.readTimeMinutes} min read
          </span>
          {r.ageRange && <span className="text-sm text-slate-400">· Ages {r.ageRange}</span>}
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-[#132F43] leading-snug">{r.title}</h1>
        <p className="text-sm text-[#5A6B7A] mt-1">{r.subtitle}</p>

        {/* Author */}
        {r.author && (
          <div className="flex items-center gap-2 mt-3 pb-3 border-b border-[#E8E4DF]">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs shrink-0" style={{ background: 'linear-gradient(135deg, #2A7D99 0%, #216982 100%)' }}>A</div>
            <div>
              <p className="text-sm font-medium text-[#132F43]">{r.author}</p>
              {r.authorCredentials && <p className="text-sm text-[#5A6B7A]">{r.authorCredentials}</p>}
            </div>
          </div>
        )}

        {/* Body */}
        <div className={`mt-4 relative ${isLocked ? 'overflow-hidden' : ''}`}>
          <ArticleBody lines={bodyLines.slice(0, previewLineCount)} />
          {isLocked && (
            <>
              {/* Fade overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F6FBFB] to-transparent pointer-events-none" />
              {/* Lock CTA */}
              <div className="mt-2 rounded-2xl bg-white dark:bg-slate-800 border border-[#E8E4DF] p-5 text-center space-y-3">
                <Lock className="w-8 h-8 text-slate-300 mx-auto" />
                <div>
                  <p className="text-sm font-semibold text-[#132F43]">Pro+ resource</p>
                  <p className="text-sm text-[#5A6B7A] mt-1">Upgrade to Pro+ Family to unlock all premium guides, printables, and 10 behavior specialist questions/month.</p>
                </div>
                <button
                  onClick={() => onNavigate?.('paywall')}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #2A7D99 0%, #216982 100%)' }}
                >
                  Upgrade to Pro+ — $49.99/mo
                </button>
              </div>
            </>
          )}
        </div>

        {/* Related questions */}
        {!isLocked && r.relatedQuestions && r.relatedQuestions.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white dark:bg-slate-800 border border-[#E8E4DF] p-4">
            <p className="text-xs font-semibold text-[#5A6B7A] uppercase tracking-wide mb-3">Common questions from families</p>
            <div className="space-y-2">
              {r.relatedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate?.('ask-bcba')}
                  className="w-full text-left text-sm text-[#3A4A57] bg-[#F8F8F6] rounded-xl px-3 py-2.5 flex items-center gap-2 hover:bg-[#EDF4F7] transition-colors"
                >
                  <span className="flex-1">"{q}"</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Related group sessions */}
        {!isLocked && r.relatedGroupTopics && r.relatedGroupTopics.length > 0 && (
          <div className="mt-4 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #2A7D9912 0%, #21698212 100%)', border: '1px solid #2A7D9930' }}>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[#6B9080]" />
              <p className="text-sm font-semibold text-[#6B9080]">Live group sessions on this topic</p>
            </div>
            {liveSessions.length > 0 ? (
              <div className="space-y-2 mb-3">
                {liveSessions.map((s) => {
                  const spotsLeft = Math.max(0, s.max_families - s.enrolled_count);
                  return (
                    <button
                      key={s.id}
                      onClick={() => onNavigate?.('group-sessions')}
                      className="w-full text-left bg-white dark:bg-slate-800 rounded-xl px-3 py-2.5 border border-[#E8E4DF] flex items-center gap-2 hover:bg-[#F8F8F6] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#132F43] truncate">{s.topic}</p>
                        <p className="text-sm text-[#5A6B7A]">
                          {new Date(s.session_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          {s.provider_name ? ` · ${s.provider_name}` : ''}
                          {' · '}${(s.price_per_family_cents / 100).toFixed(0)}/family
                        </p>
                      </div>
                      <span className={`text-sm font-semibold shrink-0 ${spotsLeft <= 1 ? 'text-[#E07A5F]' : 'text-[#2A7D99]'}`}>
                        {spotsLeft === 0 ? 'Waitlist' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#3A4A57] mb-3">
                Behavior specialists host group training sessions on {r.relatedGroupTopics.join(', ')}. Up to 4 families — $50/family — live Q&A.
              </p>
            )}
            <button
              onClick={() => onNavigate?.('group-sessions')}
              className="flex items-center gap-2 text-sm font-semibold text-[#2A7D99]"
            >
              Browse all group sessions <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Ask BCBA CTA */}
        {!isLocked && (
          <div className="mt-4 rounded-2xl border border-[#E8E4DF] bg-white dark:bg-slate-800 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2A7D99 0%, #216982 100%)' }}>
              <span className="text-white text-base">?</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#132F43]">
                {childName ? `Questions about ${childName}?` : 'Have follow-up questions?'}
              </p>
              <p className="text-sm text-[#5A6B7A]">Ask your behavior specialist team — instant AI draft, reviewed within 24h.</p>
            </div>
            <button
              onClick={() => onNavigate?.('ask-bcba')}
              aria-label="Ask your behavior specialist"
              className="text-[#2A7D99] shrink-0"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Article body renderer ───────────────────────────────────────────────────

function ArticleBody({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-3 text-sm text-[#132F43] leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        // Bold headers: **text**
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-bold text-[#132F43] mt-4">{line.replace(/\*\*/g, '')}</p>;
        }
        // Bullet points
        if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') && !line.startsWith('**')) {
          const text = line.replace(/^[•\-\*]\s*/, '');
          return (
            <div key={i} className="flex gap-2">
              <span className="text-[#6B9080] mt-1 shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: parseBold(text) }} />
            </div>
          );
        }
        // Numbered list
        if (/^\d+\./.test(line)) {
          const num = line.match(/^(\d+)\./)?.[1];
          const text = line.replace(/^\d+\.\s*/, '');
          return (
            <div key={i} className="flex gap-2">
              <span className="text-[#6B9080] font-semibold shrink-0 w-4">{num}.</span>
              <span dangerouslySetInnerHTML={{ __html: parseBold(text) }} />
            </div>
          );
        }
        // Regular paragraph
        return <p key={i} dangerouslySetInnerHTML={{ __html: parseBold(line) }} />;
      })}
    </div>
  );
}

function parseBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
}

// ── Small reusable badges ───────────────────────────────────────────────────

function TypeBadge({ type }: { type: Resource['type'] }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-[#EDF4F7] text-[#5A6B7A] px-2 py-0.5 rounded-full">
      {TYPE_ICONS[type]}{TYPE_LABELS[type]}
    </span>
  );
}

function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
      <Lock className="w-2.5 h-2.5" />Pro+
    </span>
  );
}

export default ResourceLibrary;
