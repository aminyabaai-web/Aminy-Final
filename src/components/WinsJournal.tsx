// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Wins Journal
 * 1-tap save calm moments + weekly wins auto-summary + sharing
 */

import React, { useState, useEffect } from 'react';
import { Heart, Share2, Download, Sparkles, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { trackEvent, trackSpecificEvents } from '../lib/analytics-tracker';
import { shareWinCard } from '../lib/share-win-card';

interface WinMoment {
  id: string;
  userId: string;
  timestamp: string;
  content: string;
  context?: string;
  mood?: string;
  tags?: string[];
}

interface WeeklyWinsSummary {
  week: string;
  moments: WinMoment[];
  highlights: string[];
  generatedSummary: string;
}

export function WinsJournal({ userId }: { userId: string }) {
  const [moments, setMoments] = useState<WinMoment[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklyWinsSummary | null>(null);
  const [newMomentContent, setNewMomentContent] = useState('');
  const [isAddingMoment, setIsAddingMoment] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWins();
  }, [userId]);

  async function loadWins() {
    setLoading(true);
    // Safety: abort after 6s so a stalled network request can never leave the
    // celebration screen hanging on the loading skeleton — we fall through to
    // the (empty) journal instead. `finally` guarantees loading always resolves.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/wins/load?userId=${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          signal: controller.signal,
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMoments(data.moments || []);
        setWeeklySummary(data.weeklySummary || null);
      }
    } catch (error) {
      console.error('Error loading wins:', error);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  async function saveCalmMoment() {
    if (!newMomentContent.trim()) {
      toast.error('Please write something about this moment');
      return;
    }

    try {
      const moment: WinMoment = {
        id: `win_${Date.now()}`,
        userId,
        timestamp: new Date().toISOString(),
        content: newMomentContent.trim(),
        context: getCurrentContext(),
        mood: 'positive',
        tags: extractTags(newMomentContent),
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/wins/save`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ userId, moment }),
        }
      );

      if (response.ok) {
        toast.success('Moment saved 💙');
        setNewMomentContent('');
        setIsAddingMoment(false);
        
        // Track analytics
        trackSpecificEvents.calmMomentSaved(moment.context || 'general', moment.mood || 'positive');
        
        // Reload wins
        await loadWins();
      } else {
        toast.error('Failed to save moment');
      }
    } catch (error) {
      console.error('Error saving calm moment:', error);
      toast.error('Failed to save moment');
    }
  }

  function getCurrentContext(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'bedtime';
  }

  function extractTags(content: string): string[] {
    const tags: string[] = [];
    const lowerContent = content.toLowerCase();

    const tagMap: Record<string, string[]> = {
      'transition': ['transition', 'change', 'move'],
      'communication': ['talk', 'speak', 'say', 'told', 'asked'],
      'social': ['friend', 'play', 'share', 'together'],
      'emotion': ['calm', 'happy', 'proud', 'felt', 'feeling'],
      'routine': ['routine', 'schedule', 'habit', 'bedtime', 'morning'],
    };

    Object.entries(tagMap).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        tags.push(tag);
      }
    });

    return tags;
  }

  async function shareWeeklySummary(target: 'family' | 'coach' | 'school') {
    if (!weeklySummary) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/wins/share`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            userId,
            summary: weeklySummary,
            target,
          }),
        }
      );

      if (response.ok) {
        toast.success(`Shared with ${target} ✨`);
        trackSpecificEvents.winShared(target);
      } else {
        toast.error('Failed to share');
      }
    } catch (error) {
      console.error('Error sharing wins:', error);
      toast.error('Failed to share');
    }
  }

  async function downloadWeeklySummary() {
    if (!weeklySummary) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/wins/export`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            userId,
            summary: weeklySummary,
          }),
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wins-${weeklySummary.week}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Downloaded summary 📄');
      } else {
        toast.error('Failed to download');
      }
    } catch (error) {
      console.error('Error downloading summary:', error);
      toast.error('Failed to download');
    }
  }

  /**
   * Consecutive calendar days (ending at the most recent saved win) with at
   * least one win. Used for the share card's "N days of calmer moments"
   * header — celebration only, never shown as a broken/missed streak.
   */
  function computeStreakDays(allMoments: WinMoment[]): number {
    if (allMoments.length === 0) return 0;
    const dayKeys = new Set(
      allMoments.map((m) => new Date(m.timestamp).toDateString())
    );
    const latest = allMoments.reduce((max, m) =>
      new Date(m.timestamp).getTime() > new Date(max.timestamp).getTime() ? m : max
    );
    let streak = 0;
    const cursor = new Date(latest.timestamp);
    while (dayKeys.has(cursor.toDateString())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  const [sharingMomentId, setSharingMomentId] = useState<string | null>(null);

  async function shareMomentCard(moment: WinMoment) {
    setSharingMomentId(moment.id);
    try {
      // PRIVACY: the card contains only the win text as the parent wrote it
      // (first names only) + the streak count. No last names, no photos,
      // no clinical data — see src/lib/share-win-card.ts.
      const result = await shareWinCard({
        winText: moment.content,
        streakDays: computeStreakDays(moments),
      });
      if (result === 'downloaded') {
        toast.success('Win card saved — caption copied, ready to post 💙');
      } else {
        toast.success('Win shared ✨');
      }
      trackEvent('win_shared', {
        shareTarget: 'social-card',
        method: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error sharing win card:', error);
      toast.error("We couldn't create the share card. Please try again.");
    } finally {
      setSharingMomentId(null);
    }
  }

  function getRelativeTime(timestamp: string): string {
    const now = Date.now();
    const momentTime = new Date(timestamp).getTime();
    const diffMs = now - momentTime;
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  if (loading) {
    // Visible skeleton: two pulsing win-card placeholders instead of an
    // invisible spinner inside a blank white card.
    return (
      <div className="space-y-3 sm:space-y-4" aria-busy="true" aria-label="Loading your wins">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6 pb-6 animate-pulse space-y-3">
              <div className="h-4 w-1/3 rounded bg-slate-200" />
              <div className="h-3 w-2/3 rounded bg-slate-100" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Quick Add Calm Moment */}
      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="pt-6">
          <Dialog open={isAddingMoment} onOpenChange={setIsAddingMoment}>
            <DialogTrigger asChild>
              <Button className="w-full" size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Save This Calm Moment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>What made this moment special?</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 sm:space-y-4">
                <Textarea
                  value={newMomentContent}
                  onChange={(e) => setNewMomentContent(e.target.value)}
                  placeholder="Example: She asked for help instead of getting upset. Such progress! 💙"
                  className="min-h-[120px]"
                />
                <div className="flex gap-2">
                  <Button onClick={saveCalmMoment} className="flex-1">
                    Save Moment
                  </Button>
                  <Button
                    onClick={() => {
                      setIsAddingMoment(false);
                      setNewMomentContent('');
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Weekly Wins Summary */}
      {weeklySummary && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  This Week's Wins
                </CardTitle>
                <CardDescription>
                  {weeklySummary.week} • {weeklySummary.moments.length} moments
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadWeeklySummary}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="p-4 bg-[#F6FBFB] rounded-lg">
              <p className="text-sm text-[#3A4A57] leading-relaxed">
                {weeklySummary.generatedSummary}
              </p>
            </div>

            {weeklySummary.highlights.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[#132F43] mb-2">Key Highlights:</h4>
                <ul className="space-y-1">
                  {weeklySummary.highlights.map((highlight, index) => (
                    <li key={index} className="text-sm text-[#3A4A57] flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareWeeklySummary('coach')}
                className="flex-1"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share with Coach
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareWeeklySummary('school')}
                className="flex-1"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share with School
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Moments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Recent Moments
          </CardTitle>
          <CardDescription>
            Your collection of calm and progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          {moments.length === 0 ? (
            <div className="text-center py-8 text-[#5A6B7A]">
              <p>No moments saved yet.</p>
              <p className="text-sm mt-1">Start capturing your journey! 💙</p>
            </div>
          ) : (
            <div className="space-y-3">
              {moments.slice(0, 10).map((moment) => (
                <div
                  key={moment.id}
                  className="p-4 bg-[#F6FBFB] rounded-lg hover:bg-[#EDF4F7] transition-colors"
                >
                  <p className="text-sm text-[#3A4A57] leading-relaxed mb-2">
                    {moment.content}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#5A6B7A]">
                      {getRelativeTime(moment.timestamp)}
                    </span>
                    <div className="flex items-center gap-1">
                      {moment.tags && moment.tags.length > 0 && (
                        <div className="flex gap-1">
                          {moment.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-sm">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#2A7D99] hover:text-[#1F6080] px-2"
                        onClick={() => shareMomentCard(moment)}
                        disabled={sharingMomentId === moment.id}
                        aria-label="Share this win as an image"
                      >
                        <Share2 className="w-4 h-4 mr-1" />
                        {sharingMomentId === moment.id ? 'Sharing…' : 'Share'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
