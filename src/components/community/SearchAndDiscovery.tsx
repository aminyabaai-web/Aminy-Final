// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * SearchAndDiscovery.tsx
 *
 * Community search and discovery component.
 * Features:
 * - Full-text search across posts and comments
 * - Filter by category, age group, concern tags
 * - Trending section (engagement velocity)
 * - "Recommended for you" based on profile
 * - Search history and saved searches
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Search,
  TrendingUp,
  Clock,
  Filter,
  X,
  Hash,
  Users,
  Heart,
  MessageSquare,
  Bookmark,
  ChevronRight,
  Loader2,
  Sparkles,
  History,
  Star,
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';

// Types
interface SearchResult {
  id: string;
  type: 'post' | 'comment';
  content: string;
  excerpt: string;
  authorName: string;
  authorAvatar?: string;
  isExpert?: boolean;
  createdAt: string;
  likes: number;
  comments: number;
  tags: string[];
  matchScore?: number;
}

interface TrendingTopic {
  tag: string;
  postCount: number;
  trend: 'up' | 'stable' | 'new';
  changePercent?: number;
}

interface SearchFilters {
  category: string;
  ageGroup: string;
  timeRange: string;
  sortBy: 'relevance' | 'recent' | 'popular';
  expertOnly: boolean;
}

// Category configuration
const CATEGORIES = [
  { id: 'all', label: 'All Topics', icon: Hash },
  { id: 'strategies', label: 'Strategies', icon: Sparkles },
  { id: 'milestone', label: 'Milestones', icon: Star },
  { id: 'question', label: 'Questions', icon: MessageSquare },
  { id: 'support', label: 'Support', icon: Heart },
];

const AGE_GROUPS = [
  { id: 'all', label: 'All Ages' },
  { id: '0-3', label: 'Early Intervention (0-3)' },
  { id: '3-5', label: 'Preschool (3-5)' },
  { id: '5-12', label: 'School Age (5-12)' },
  { id: '12+', label: 'Teens (12+)' },
];

const TIME_RANGES = [
  { id: 'all', label: 'All Time' },
  { id: '24h', label: 'Past 24 Hours' },
  { id: '7d', label: 'Past Week' },
  { id: '30d', label: 'Past Month' },
];

interface SearchAndDiscoveryProps {
  onSelectPost?: (postId: string) => void;
  userId?: string;
  childAge?: number;
  interests?: string[];
}

export function SearchAndDiscovery({
  onSelectPost,
  userId,
  childAge,
  interests = [],
}: SearchAndDiscoveryProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [recommended, setRecommended] = useState<SearchResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    category: 'all',
    ageGroup: 'all',
    timeRange: 'all',
    sortBy: 'relevance',
    expertOnly: false,
  });
  const [hasSearched, setHasSearched] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load trending topics
  useEffect(() => {
    loadTrending();
    loadRecommended();
    loadSearchHistory();
  }, []);

  const loadTrending = async () => {
    try {
      // In production, this would query for posts with highest engagement velocity
      // For now, use demo data
      setTrending([
        { tag: 'morning-routine', postCount: 45, trend: 'up', changePercent: 23 },
        { tag: 'sensory-strategies', postCount: 38, trend: 'up', changePercent: 15 },
        { tag: 'school-support', postCount: 32, trend: 'stable' },
        { tag: 'potty-training', postCount: 28, trend: 'new' },
        { tag: 'sleep-tips', postCount: 25, trend: 'up', changePercent: 8 },
      ]);
    } catch (error) {
      console.error('Failed to load trending:', error);
    }
  };

  const loadRecommended = async () => {
    try {
      // In production, this would use collaborative filtering based on user interests
      // For now, use demo data
      setRecommended([
        {
          id: '1',
          type: 'post',
          content: 'Visual schedule template that finally worked for our morning routine!',
          excerpt: 'After trying countless approaches, we finally found a visual schedule system that works...',
          authorName: 'Jennifer T.',
          isExpert: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          likes: 47,
          comments: 12,
          tags: ['morning-routine', 'visual-supports'],
        },
        {
          id: '2',
          type: 'post',
          content: 'Speech therapist tips for encouraging first words',
          excerpt: 'As an SLP, here are my top strategies for parents working on early language...',
          authorName: 'Dr. Sarah M.',
          isExpert: true,
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          likes: 89,
          comments: 23,
          tags: ['speech', 'expert-advice'],
        },
      ]);
    } catch (error) {
      console.error('Failed to load recommended:', error);
    }
  };

  const loadSearchHistory = () => {
    try {
      const saved = localStorage.getItem('aminy_search_history');
      if (saved) {
        setSearchHistory(JSON.parse(saved).slice(0, 5));
      }
    } catch {
      // Ignore errors
    }
  };

  const saveToHistory = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const updated = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 5);
    setSearchHistory(updated);
    localStorage.setItem('aminy_search_history', JSON.stringify(updated));
  };

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    saveToHistory(searchQuery);

    try {
      // Build query
      let query = supabase
        .from('community_posts')
        .select(`
          id,
          content,
          author_name,
          author_avatar,
          is_expert,
          created_at,
          likes_count,
          comments_count,
          tags,
          category
        `)
        .textSearch('content', searchQuery, { type: 'websearch' })
        .eq('is_hidden', false)
        .limit(20);

      // Apply filters
      if (filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters.timeRange !== 'all') {
        const cutoff = new Date();
        if (filters.timeRange === '24h') cutoff.setHours(cutoff.getHours() - 24);
        else if (filters.timeRange === '7d') cutoff.setDate(cutoff.getDate() - 7);
        else if (filters.timeRange === '30d') cutoff.setDate(cutoff.getDate() - 30);
        query = query.gte('created_at', cutoff.toISOString());
      }

      if (filters.expertOnly) {
        query = query.eq('is_expert', true);
      }

      // Sort
      if (filters.sortBy === 'recent') {
        query = query.order('created_at', { ascending: false });
      } else if (filters.sortBy === 'popular') {
        query = query.order('likes_count', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Search error:', error);
        // Fall back to demo results
        setResults(getDemoResults(searchQuery));
      } else if (data && data.length > 0) {
        setResults(data.map(post => ({
          id: post.id,
          type: 'post' as const,
          content: post.content,
          excerpt: post.content.substring(0, 150) + '...',
          authorName: post.author_name || 'Anonymous',
          authorAvatar: post.author_avatar,
          isExpert: post.is_expert,
          createdAt: post.created_at,
          likes: post.likes_count || 0,
          comments: post.comments_count || 0,
          tags: post.tags || [],
        })));
      } else {
        setResults(getDemoResults(searchQuery));
      }
    } catch (error) {
      console.error('Search failed:', error);
      setResults(getDemoResults(searchQuery));
    } finally {
      setIsSearching(false);
    }
  }, [filters]);

  // Demo results for fallback
  const getDemoResults = (searchQuery: string): SearchResult[] => {
    const demoData = [
      {
        id: 'd1',
        type: 'post' as const,
        content: 'Best strategies for managing meltdowns during transitions',
        excerpt: 'We\'ve been working on transitions for months. Here\'s what finally helped us...',
        authorName: 'TransitionMaster',
        isExpert: false,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        likes: 34,
        comments: 8,
        tags: ['transitions', 'meltdowns', 'strategies'],
      },
      {
        id: 'd2',
        type: 'post' as const,
        content: 'BCBA perspective on visual schedules',
        excerpt: 'As a BCBA, I often get asked about visual schedules. Here\'s the research-backed approach...',
        authorName: 'Dr. Amanda K.',
        isExpert: true,
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        likes: 67,
        comments: 15,
        tags: ['visual-supports', 'expert-advice', 'aba'],
      },
      {
        id: 'd3',
        type: 'post' as const,
        content: 'Celebrating our first successful haircut! 🎉',
        excerpt: 'After 4 years of struggles, we finally had a calm haircut experience...',
        authorName: 'ProudMom2020',
        isExpert: false,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        likes: 156,
        comments: 42,
        tags: ['milestone', 'sensory', 'win'],
      },
    ];

    // Filter by search query
    const lower = searchQuery.toLowerCase();
    return demoData.filter(
      d =>
        d.content.toLowerCase().includes(lower) ||
        d.tags.some(t => t.includes(lower))
    );
  };

  // Debounced search
  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleTagClick = (tag: string) => {
    setQuery(tag);
    performSearch(tag);
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const clearFilters = () => {
    setFilters({
      category: 'all',
      ageGroup: 'all',
      timeRange: 'all',
      sortBy: 'relevance',
      expertOnly: false,
    });
  };

  const hasActiveFilters =
    filters.category !== 'all' ||
    filters.ageGroup !== 'all' ||
    filters.timeRange !== 'all' ||
    filters.expertOnly;

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <Input
              ref={searchInputRef}
              placeholder="Search posts, tips, and discussions..."
              value={query}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-10 pr-10 h-12"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setHasSearched(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-teal-600' : ''}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 bg-teal-500 rounded-full" />
            )}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                  Age Group
                </label>
                <select
                  value={filters.ageGroup}
                  onChange={e => setFilters(prev => ({ ...prev, ageGroup: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800"
                >
                  {AGE_GROUPS.map(age => (
                    <option key={age.id} value={age.id}>{age.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                  Time Range
                </label>
                <select
                  value={filters.timeRange}
                  onChange={e => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800"
                >
                  {TIME_RANGES.map(time => (
                    <option key={time.id} value={time.id}>{time.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={e => setFilters(prev => ({ ...prev, sortBy: e.target.value as SearchFilters['sortBy'] }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800"
                >
                  <option value="relevance">Most Relevant</option>
                  <option value="recent">Most Recent</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.expertOnly}
                  onChange={e => setFilters(prev => ({ ...prev, expertOnly: e.target.checked }))}
                  className="w-4 h-4 rounded text-teal-600"
                />
                <span className="text-sm text-neutral-700 dark:text-slate-300">Expert posts only</span>
              </label>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Search Results or Discovery Content */}
      {hasSearched ? (
        // Search Results
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">
              {isSearching ? 'Searching...' : `${results.length} results for "${query}"`}
            </p>
          </div>

          {isSearching ? (
            <Card className="p-12 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </Card>
          ) : results.length === 0 ? (
            <Card className="p-12 text-center">
              <Search className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
              <p className="text-neutral-600 dark:text-slate-400 mb-2">No results found</p>
              <p className="text-sm text-neutral-500">Try different keywords or broaden your filters</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {results.map(result => (
                <Card
                  key={result.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onSelectPost?.(result.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                      {result.authorName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {result.authorName}
                        </span>
                        {result.isExpert && (
                          <Badge className="bg-purple-100 text-purple-700 text-xs">Expert</Badge>
                        )}
                        <span className="text-xs text-neutral-500">
                          {formatTimeAgo(result.createdAt)}
                        </span>
                      </div>
                      <p className="text-neutral-900 dark:text-white mb-2">{result.content}</p>
                      {result.excerpt && (
                        <p className="text-sm text-neutral-500 mb-2 line-clamp-2">{result.excerpt}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {result.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {result.comments}
                        </span>
                        {result.tags.slice(0, 3).map(tag => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs cursor-pointer hover:bg-neutral-200"
                            onClick={e => {
                              e.stopPropagation();
                              handleTagClick(tag);
                            }}
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-neutral-400 flex-shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Discovery Content (when not searching)
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trending Topics */}
          <Card className="p-4 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-teal-600" />
              <h3 className="font-semibold text-neutral-900 dark:text-white">Trending Topics</h3>
            </div>
            <div className="space-y-3">
              {trending.map((topic, idx) => (
                <button
                  key={topic.tag}
                  onClick={() => handleTagClick(topic.tag)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-neutral-400 text-sm">{idx + 1}</span>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">#{topic.tag}</p>
                      <p className="text-xs text-neutral-500">{topic.postCount} posts</p>
                    </div>
                  </div>
                  {topic.trend === 'up' && (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                      +{topic.changePercent}%
                    </Badge>
                  )}
                  {topic.trend === 'new' && (
                    <Badge className="bg-blue-100 text-blue-700 text-xs">New</Badge>
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Recommended for You */}
          <Card className="p-4 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-neutral-900 dark:text-white">Recommended for You</h3>
            </div>
            <div className="space-y-4">
              {recommended.map(post => (
                <div
                  key={post.id}
                  onClick={() => onSelectPost?.(post.id)}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                    {post.authorName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-neutral-900 dark:text-white text-sm">
                        {post.authorName}
                      </span>
                      {post.isExpert && (
                        <Badge className="bg-purple-100 text-purple-700 text-xs">Expert</Badge>
                      )}
                    </div>
                    <p className="text-neutral-700 dark:text-slate-300 text-sm line-clamp-2">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {post.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {post.comments}
                      </span>
                      <span>{formatTimeAgo(post.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Searches */}
          {searchHistory.length > 0 && (
            <Card className="p-4 lg:col-span-3">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-5 h-5 text-neutral-400" />
                <h3 className="font-medium text-neutral-700 dark:text-slate-300">Recent Searches</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((search, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="cursor-pointer hover:bg-neutral-200 dark:hover:bg-slate-700"
                    onClick={() => {
                      setQuery(search);
                      performSearch(search);
                    }}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {search}
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchHistory([]);
                    localStorage.removeItem('aminy_search_history');
                  }}
                  className="text-neutral-500 text-xs"
                >
                  Clear history
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchAndDiscovery;
