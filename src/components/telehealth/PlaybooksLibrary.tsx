// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Evidence-Based Playbooks Library
 *
 * Curated content packs/playbooks tied to top concerns
 * with attribution/citations where appropriate.
 *
 * MVP Features:
 * - Searchable playbook library
 * - Category filtering (tied to concerns)
 * - Evidence citations
 * - Bookmark/save functionality
 */

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  BookOpen,
  Star,
  Clock,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  CheckCircle,
  Info,
  Filter
} from 'lucide-react';
import { isDemoMode } from '../../lib/demo-seed';

// ============================================================================
// Types
// ============================================================================

export interface Playbook {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: PlaybookCategory;
  concernIds: string[]; // Links to telehealth concerns
  // Content
  readTimeMinutes: number;
  sections: PlaybookSection[];
  // Evidence
  evidenceLevel: 'research-backed' | 'clinician-informed' | 'parent-tested';
  citations?: Citation[];
  // Metadata
  updatedAt: string;
  authorName: string;
  authorCredentials: string;
  // User state
  isBookmarked?: boolean;
  isCompleted?: boolean;
  progress?: number; // 0-100
}

export interface PlaybookSection {
  id: string;
  title: string;
  type: 'overview' | 'strategy' | 'example' | 'checklist' | 'tip' | 'warning';
  content: string;
  bulletPoints?: string[];
}

export interface Citation {
  id: string;
  title: string;
  authors: string;
  journal?: string;
  year: number;
  url?: string;
}

export type PlaybookCategory =
  | 'behavior'
  | 'communication'
  | 'sensory'
  | 'daily-living'
  | 'social-emotional'
  | 'school-advocacy'
  | 'caregiver-wellness';

const CATEGORY_LABELS: Record<PlaybookCategory, string> = {
  'behavior': 'Behavior',
  'communication': 'Communication',
  'sensory': 'Sensory',
  'daily-living': 'Daily Living',
  'social-emotional': 'Social & Emotional',
  'school-advocacy': 'School & Advocacy',
  'caregiver-wellness': 'Caregiver Wellness'
};

const CATEGORY_ICONS: Record<PlaybookCategory, string> = {
  'behavior': '🧠',
  'communication': '💬',
  'sensory': '🎧',
  'daily-living': '🏠',
  'social-emotional': '💚',
  'school-advocacy': '🏫',
  'caregiver-wellness': '🌿'
};

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_PLAYBOOKS: Playbook[] = [
  {
    id: 'pb-1',
    title: 'Preventing Meltdowns',
    subtitle: 'Proactive Strategies That Work',
    description: 'Learn evidence-based approaches to identify triggers and implement antecedent strategies that reduce meltdown frequency.',
    category: 'behavior',
    concernIds: ['meltdowns-aggression', 'transitions'],
    readTimeMinutes: 12,
    sections: [
      {
        id: 's1',
        title: 'Understanding Meltdowns vs Tantrums',
        type: 'overview',
        content: 'A meltdown is a response to overwhelm, not a behavior choice. Understanding this distinction is the first step to supporting your child effectively.',
        bulletPoints: [
          'Meltdowns are involuntary responses to sensory or emotional overload',
          'Tantrums typically have a goal (getting something)',
          'Meltdowns require co-regulation; tantrums may respond to ignoring',
          'Recovery time varies - allow space and patience'
        ]
      },
      {
        id: 's2',
        title: 'Antecedent Strategies',
        type: 'strategy',
        content: 'Antecedent strategies are proactive approaches that prevent triggers from escalating. These are more effective than reactive interventions.',
        bulletPoints: [
          'Visual schedules: Show whats coming next',
          'Transition warnings: 5 minutes, 2 minutes, 1 minute',
          'First-Then language: "First shoes, then playground"',
          'Sensory breaks: Schedule before overwhelm hits',
          'Choice-making: Offer 2 acceptable options'
        ]
      },
      {
        id: 's3',
        title: 'Creating a Calm-Down Kit',
        type: 'tip',
        content: 'Prepare a portable kit with items that help your child regulate. Involve them in choosing items when calm.',
        bulletPoints: [
          'Noise-canceling headphones',
          'Fidget toys or stress balls',
          'Comfort object or weighted lap pad',
          'Visual calm-down cards',
          'Favorite snack (if food-motivated)'
        ]
      }
    ],
    evidenceLevel: 'research-backed',
    citations: [
      {
        id: 'c1',
        title: 'Antecedent Interventions for Challenging Behavior',
        authors: 'Smith, R. G., et al.',
        journal: 'Journal of Applied Behavior Analysis',
        year: 2022,
        url: 'https://doi.org/example'
      },
      {
        id: 'c2',
        title: 'Visual Supports in Early Childhood Education',
        authors: 'Johnson, M. & Williams, K.',
        journal: 'Topics in Early Childhood Special Education',
        year: 2021
      }
    ],
    updatedAt: '2025-12-15',
    authorName: 'Sarah Chen',
    authorCredentials: 'BCBA, LBA',
    isBookmarked: true,
    progress: 45
  },
  {
    id: 'pb-2',
    title: 'Visual Schedules 101',
    subtitle: 'Creating Structure That Works',
    description: 'Step-by-step guide to creating and implementing visual schedules that reduce anxiety and increase independence.',
    category: 'daily-living',
    concernIds: ['transitions', 'routine-building'],
    readTimeMinutes: 8,
    sections: [
      {
        id: 's1',
        title: 'Why Visual Schedules Work',
        type: 'overview',
        content: 'Visual schedules provide predictability and reduce the cognitive load of remembering whats next. They work because they make the abstract concept of time concrete and visible.'
      },
      {
        id: 's2',
        title: 'Types of Visual Schedules',
        type: 'strategy',
        content: 'Choose the format that matches your childs developmental level:',
        bulletPoints: [
          'Object schedules: Real objects for very young children',
          'Photo schedules: Pictures of actual routines',
          'Icon schedules: Simple drawings or symbols',
          'Written schedules: Words for readers',
          'Digital schedules: Apps with timers and sounds'
        ]
      }
    ],
    evidenceLevel: 'research-backed',
    citations: [
      {
        id: 'c1',
        title: 'Effects of Visual Activity Schedules on Independent Task Engagement',
        authors: 'MacDuff, G. S., et al.',
        journal: 'Journal of Applied Behavior Analysis',
        year: 2019
      }
    ],
    updatedAt: '2025-11-20',
    authorName: 'Lisa Park',
    authorCredentials: 'Certified Parent Coach',
    isBookmarked: false,
    isCompleted: true
  },
  {
    id: 'pb-3',
    title: 'Building Communication at Home',
    subtitle: 'Strategies for Every Level',
    description: 'Practical approaches to support language development and communication skills in daily routines.',
    category: 'communication',
    concernIds: ['communication-support'],
    readTimeMinutes: 15,
    sections: [
      {
        id: 's1',
        title: 'Creating Communication Opportunities',
        type: 'strategy',
        content: 'The key to building communication is creating situations where your child needs to communicate.',
        bulletPoints: [
          'Keep preferred items visible but out of reach',
          'Give small portions so they request more',
          'Pause during familiar routines',
          'Offer choices between two items',
          'Pretend to forget something obvious'
        ]
      },
      {
        id: 's2',
        title: 'Language Modeling',
        type: 'tip',
        content: 'Model language slightly above your childs current level. If they use single words, model 2-word phrases. Always acknowledge their communication attempts.'
      }
    ],
    evidenceLevel: 'clinician-informed',
    updatedAt: '2025-10-01',
    authorName: 'James Wilson',
    authorCredentials: 'MS, CCC-SLP',
    isBookmarked: false
  },
  {
    id: 'pb-4',
    title: 'Sensory-Friendly Home Environment',
    subtitle: 'Simple Modifications That Help',
    description: 'Learn how to modify your home environment to reduce sensory triggers and create calming spaces.',
    category: 'sensory',
    concernIds: ['sensory-overload'],
    readTimeMinutes: 10,
    sections: [
      {
        id: 's1',
        title: 'Auditory Environment',
        type: 'strategy',
        content: 'Sound can be a significant trigger for sensory-sensitive children.',
        bulletPoints: [
          'Identify and reduce unexpected noises',
          'Use white noise machines or soft music',
          'Provide noise-canceling headphones',
          'Create a quiet retreat space',
          'Warn before loud activities (blender, vacuum)'
        ]
      },
      {
        id: 's2',
        title: 'Visual Environment',
        type: 'strategy',
        content: 'Visual clutter and lighting can contribute to overwhelm.',
        bulletPoints: [
          'Reduce visual clutter on walls',
          'Use dim or natural lighting when possible',
          'Avoid fluorescent lights if sensitive',
          'Organize toys in covered bins',
          'Create defined spaces for activities'
        ]
      }
    ],
    evidenceLevel: 'clinician-informed',
    updatedAt: '2025-09-15',
    authorName: 'David Kim',
    authorCredentials: 'OTR/L'
  },
  {
    id: 'pb-5',
    title: 'IEP Meeting Preparation',
    subtitle: 'Advocate With Confidence',
    description: 'Everything you need to prepare for, participate in, and follow up after IEP meetings.',
    category: 'school-advocacy',
    concernIds: ['school-iep-stress'],
    readTimeMinutes: 20,
    sections: [
      {
        id: 's1',
        title: 'Before the Meeting',
        type: 'checklist',
        content: 'Preparation is key to successful advocacy.',
        bulletPoints: [
          'Request records 2 weeks before meeting',
          'Review current IEP and progress reports',
          'Write down your top 3 priorities',
          'Prepare questions in advance',
          'Consider bringing a support person'
        ]
      },
      {
        id: 's2',
        title: 'Your Rights as a Parent',
        type: 'overview',
        content: 'Know your rights under IDEA:',
        bulletPoints: [
          'You are an equal member of the IEP team',
          'You can request meetings at any time',
          'You can invite outside experts',
          'You have access to all educational records',
          'You can disagree and request mediation'
        ]
      },
      {
        id: 's3',
        title: 'Important Warning',
        type: 'warning',
        content: 'Never sign the IEP at the meeting if youre unsure. You have the right to take it home, review it, and return it within 10 days.'
      }
    ],
    evidenceLevel: 'parent-tested',
    updatedAt: '2025-08-01',
    authorName: 'Maria Rodriguez',
    authorCredentials: 'Special Education Advocate'
  },
  {
    id: 'pb-6',
    title: 'Managing Parent Burnout',
    subtitle: 'Self-Care Isnt Selfish',
    description: 'Recognize the signs of caregiver burnout and learn sustainable strategies to protect your wellbeing.',
    category: 'caregiver-wellness',
    concernIds: ['parent-burnout'],
    readTimeMinutes: 12,
    sections: [
      {
        id: 's1',
        title: 'Recognizing Burnout',
        type: 'overview',
        content: 'Burnout is a state of chronic stress that leads to physical and emotional exhaustion.',
        bulletPoints: [
          'Constant exhaustion, even after rest',
          'Feeling detached or cynical',
          'Decreased sense of accomplishment',
          'Physical symptoms: headaches, illness',
          'Irritability or emotional numbness'
        ]
      },
      {
        id: 's2',
        title: 'Micro Self-Care',
        type: 'strategy',
        content: 'When you cant find an hour, find 5 minutes. Small moments of self-care add up.',
        bulletPoints: [
          '5 deep breaths before responding to stress',
          'Step outside for 2 minutes of fresh air',
          'Put on a favorite song while doing dishes',
          'Text a friend something youre grateful for',
          'Stretch while waiting for the microwave'
        ]
      }
    ],
    evidenceLevel: 'clinician-informed',
    updatedAt: '2025-07-20',
    authorName: 'Emily Thompson',
    authorCredentials: 'LCSW',
    isBookmarked: true
  }
];

// ============================================================================
// Main Component
// ============================================================================

interface PlaybooksLibraryProps {
  onBack: () => void;
  onSelectPlaybook?: (playbook: Playbook) => void;
  onBookmark?: (playbookId: string, bookmarked: boolean) => void;
}

export function PlaybooksLibrary({
  onBack,
  onSelectPlaybook,
  onBookmark
}: PlaybooksLibraryProps) {
  // Real users start with an empty library (a friendly empty state renders until
  // curated content is published). The sample playbooks — with their illustrative
  // author names and citations — are DEMO MODE ONLY so prospect walkthroughs look
  // complete. Never present invented authors/citations to a real caregiver as real.
  const [playbooks, setPlaybooks] = useState<Playbook[]>(isDemoMode() ? MOCK_PLAYBOOKS : []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PlaybookCategory | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const categories = Object.keys(CATEGORY_LABELS) as PlaybookCategory[];

  const filteredPlaybooks = useMemo(() => {
    return playbooks.filter(pb => {
      const matchesSearch = searchQuery === '' ||
        pb.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pb.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || pb.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [playbooks, searchQuery, selectedCategory]);

  const handleToggleBookmark = (playbookId: string) => {
    setPlaybooks(prev => prev.map(pb =>
      pb.id === playbookId ? { ...pb, isBookmarked: !pb.isBookmarked } : pb
    ));
    const pb = playbooks.find(p => p.id === playbookId);
    if (pb) {
      onBookmark?.(playbookId, !pb.isBookmarked);
    }
  };

  const bookmarkedCount = playbooks.filter(pb => pb.isBookmarked).length;

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E8E4DF] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-[#F0EDE8] transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-[#3A4A57]" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-[#1B2733]">Evidence-Based Playbooks</h1>
            <p className="text-sm text-[#5A6B7A]">Strategies & guidance from experts</p>
          </div>
        </div>
      </header>

      {/* Search & Filter */}
      <div className="bg-white border-b border-[#E8E4DF] px-4 py-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8A9BA8]" />
          <input
            type="text"
            placeholder="Search playbooks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#E8E4DF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-primary text-white'
                : 'bg-[#F0EDE8] text-[#5A6B7A] hover:bg-[#E8E4DF]'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                selectedCategory === cat
                  ? 'bg-primary text-white'
                  : 'bg-[#F0EDE8] text-[#5A6B7A] hover:bg-[#E8E4DF]'
              }`}
            >
              <span>{CATEGORY_ICONS[cat]}</span>
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Bookmarked Quick Access */}
        {bookmarkedCount > 0 && (
          <button className="flex items-center gap-2 text-sm text-[#6B9080] hover:underline">
            <BookmarkCheck className="w-4 h-4" />
            {bookmarkedCount} bookmarked
          </button>
        )}
      </div>

      {/* Playbook List */}
      <div className="px-4 py-6 pb-24 space-y-3 sm:space-y-4">
        {filteredPlaybooks.length > 0 ? (
          filteredPlaybooks.map(playbook => (
            <PlaybookCard
              key={playbook.id}
              playbook={playbook}
              onSelect={() => onSelectPlaybook?.(playbook)}
              onToggleBookmark={() => handleToggleBookmark(playbook.id)}
            />
          ))
        ) : playbooks.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-[#5A6B7A] font-medium">Playbooks are on the way</p>
            <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
              Evidence-based guides from our clinical team will appear here. Ask your provider for strategies in the meantime.
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-[#5A6B7A]">No playbooks found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Playbook Card
// ============================================================================

interface PlaybookCardProps {
  playbook: Playbook;
  onSelect: () => void;
  onToggleBookmark: () => void;
}

function PlaybookCard({ playbook, onSelect, onToggleBookmark }: PlaybookCardProps) {
  const evidenceBadgeColors = {
    'research-backed': 'bg-green-100 text-green-700',
    'clinician-informed': 'bg-blue-100 text-blue-700',
    'parent-tested': 'bg-purple-100 text-purple-700'
  };

  const evidenceLabels = {
    'research-backed': 'Research-Backed',
    'clinician-informed': 'Clinician-Informed',
    'parent-tested': 'Parent-Tested'
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8E4DF] overflow-hidden">
      <button
        onClick={onSelect}
        className="w-full p-4 text-left hover:bg-[#FAF7F2] transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Category & Evidence */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{CATEGORY_ICONS[playbook.category]}</span>
              <span className="text-sm text-[#5A6B7A]">{CATEGORY_LABELS[playbook.category]}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${evidenceBadgeColors[playbook.evidenceLevel]}`}>
                {evidenceLabels[playbook.evidenceLevel]}
              </span>
            </div>

            {/* Title & Subtitle */}
            <h3 className="font-semibold text-[#1B2733] mb-1">{playbook.title}</h3>
            <p className="text-sm text-[#6B9080] mb-2">{playbook.subtitle}</p>

            {/* Description */}
            <p className="text-sm text-[#5A6B7A] line-clamp-2 mb-3">{playbook.description}</p>

            {/* Meta */}
            <div className="flex items-center gap-3 sm:gap-4 text-sm text-[#5A6B7A]">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {playbook.readTimeMinutes} min read
              </div>
              <div className="flex items-center gap-1">
                <span>By {playbook.authorName}, {playbook.authorCredentials}</span>
              </div>
            </div>

            {/* Progress (if started) */}
            {playbook.progress !== undefined && playbook.progress > 0 && !playbook.isCompleted && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-[#5A6B7A]">Progress</span>
                  <span className="text-[#6B9080] font-medium">{playbook.progress}%</span>
                </div>
                <div className="h-1.5 bg-[#F0EDE8] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#6B9080] rounded-full transition-all"
                    style={{ width: `${playbook.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Completed Badge */}
            {playbook.isCompleted && (
              <div className="mt-3 flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Completed
              </div>
            )}
          </div>

          <ChevronRight className="w-5 h-5 text-[#8A9BA8] flex-shrink-0" />
        </div>
      </button>

      {/* Bookmark Button */}
      <div className="px-4 pb-4 flex items-center justify-between border-t border-[#E8E4DF] pt-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark();
          }}
          className={`flex items-center gap-2 text-sm ${
            playbook.isBookmarked ? 'text-[#6B9080]' : 'text-[#5A6B7A] hover:text-[#3A4A57]'
          }`}
        >
          {playbook.isBookmarked ? (
            <BookmarkCheck className="w-4 h-4" />
          ) : (
            <Bookmark className="w-4 h-4" />
          )}
          {playbook.isBookmarked ? 'Saved' : 'Save for later'}
        </button>

        {playbook.citations && playbook.citations.length > 0 && (
          <span className="text-sm text-[#8A9BA8] flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            {playbook.citations.length} citations
          </span>
        )}
      </div>
    </div>
  );
}

export default PlaybooksLibrary;
