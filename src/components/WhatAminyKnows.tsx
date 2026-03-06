/**
 * What Aminy Knows Page
 * Shows users everything Aminy has learned about their child
 * Builds trust in the personalization system
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  Heart,
  Sparkles,
  Edit3,
  Plus,
  Trash2,
  Check,
  X,
  ChevronRight,
  Star,
  AlertTriangle,
  Target,
  Lightbulb,
  Calendar,
  FileText,
  MessageCircle,
  Zap,
  Shield,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { getMemoryFacts, storeMemoryFact } from '../lib/aminy-ai-brain';
import { store } from '../lib/store';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface MemoryFact {
  id: string;
  category: string;
  content: string;
  source: string;
  confidence: number;
  createdAt?: string;
}

interface CategoryInfo {
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}

const categories: Record<string, CategoryInfo> = {
  preference: {
    icon: Heart,
    label: 'Preferences',
    description: 'What they like and enjoy',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  trigger: {
    icon: AlertTriangle,
    label: 'Triggers',
    description: 'What causes difficulty',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  strength: {
    icon: Star,
    label: 'Strengths',
    description: 'What they excel at',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  challenge: {
    icon: Target,
    label: 'Challenges',
    description: 'Areas to work on',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  milestone: {
    icon: Zap,
    label: 'Milestones',
    description: 'Progress and achievements',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  strategy: {
    icon: Lightbulb,
    label: 'What Works',
    description: 'Effective strategies',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  medical: {
    icon: Shield,
    label: 'Medical',
    description: 'Health information',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  educational: {
    icon: FileText,
    label: 'Educational',
    description: 'School and learning',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
};

const sourceLabels: Record<string, string> = {
  conversation: 'From chat',
  onboarding: 'From onboarding',
  vault: 'From documents',
  provider: 'From provider',
  manual: 'Added by you',
};

interface WhatAminyKnowsProps {
  onBack?: () => void;
  childId?: string;
}

export function WhatAminyKnows({ onBack, childId }: WhatAminyKnowsProps) {
  const [memories, setMemories] = useState<MemoryFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newFact, setNewFact] = useState({ category: 'preference', content: '' });

  // Get child info from store
  const state = store.getState();
  const currentChildId = childId || state.currentChildId || state.children?.[0]?.id;
  const currentChild = state.children?.find(c => c.id === currentChildId);
  const childName = currentChild?.name || 'your child';

  useEffect(() => {
    loadMemories();
  }, [currentChildId]);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const facts = await getMemoryFacts(currentChildId || '');
      setMemories(facts as unknown as MemoryFact[]);
    } catch (error) {
      console.error('Failed to load memories:', error);
      // Use local data as fallback
      setMemories(generateLocalMemories());
    } finally {
      setLoading(false);
    }
  };

  // Generate memories from local state if backend unavailable
  const generateLocalMemories = (): MemoryFact[] => {
    const localMemories: MemoryFact[] = [];

    if (currentChild) {
      // Strengths
      ((currentChild.strengths as string[] | undefined) || []).forEach((s: string, i: number) => {
        localMemories.push({
          id: `strength-${i}`,
          category: 'strength',
          content: s,
          source: 'onboarding',
          confidence: 0.9,
        });
      });

      // Challenges
      ((currentChild.challenges as string[] | undefined) || []).forEach((c: string, i: number) => {
        localMemories.push({
          id: `challenge-${i}`,
          category: 'challenge',
          content: c,
          source: 'onboarding',
          confidence: 0.9,
        });
      });

      // Diagnoses
      (currentChild.diagnoses || []).forEach((d: string, i: number) => {
        localMemories.push({
          id: `medical-${i}`,
          category: 'medical',
          content: d,
          source: 'onboarding',
          confidence: 1.0,
        });
      });

      // Sensory profile
      const sensory = currentChild.sensoryProfile as { seekers?: string[]; avoiders?: string[] } | undefined;
      if (sensory) {
        (sensory.seekers || []).forEach((s: string, i: number) => {
          localMemories.push({
            id: `pref-seek-${i}`,
            category: 'preference',
            content: `Seeks ${s.toLowerCase()} input`,
            source: 'onboarding',
            confidence: 0.85,
          });
        });
        (sensory.avoiders || []).forEach((a: string, i: number) => {
          localMemories.push({
            id: `trigger-avoid-${i}`,
            category: 'trigger',
            content: `Avoids ${a.toLowerCase()}`,
            source: 'onboarding',
            confidence: 0.85,
          });
        });
      }
    }

    return localMemories;
  };

  const handleAddFact = async () => {
    if (!newFact.content.trim()) {
      toast.error('Please enter something to remember');
      return;
    }

    try {
      await storeMemoryFact(
        currentChildId || '',
        newFact.category as any,
        newFact.content,
        'manual',
        1.0
      );

      // Add to local state
      setMemories(prev => [
        ...prev,
        {
          id: `manual-${Date.now()}`,
          category: newFact.category,
          content: newFact.content,
          source: 'manual',
          confidence: 1.0,
          createdAt: new Date().toISOString(),
        },
      ]);

      setNewFact({ category: 'preference', content: '' });
      setIsAddingNew(false);
      toast.success(`Got it! I'll remember that about ${childName}`);
    } catch (error) {
      toast.error('Failed to save. Please try again.');
    }
  };

  const handleDeleteFact = (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
    toast.success('Removed from memory');
  };

  // Group memories by category
  const groupedMemories = memories.reduce((acc, memory) => {
    const cat = memory.category || 'preference';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(memory);
    return acc;
  }, {} as Record<string, MemoryFact[]>);

  const filteredMemories = selectedCategory
    ? { [selectedCategory]: groupedMemories[selectedCategory] || [] }
    : groupedMemories;

  const totalFacts = memories.length;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-primary flex items-center gap-2">
                <Brain className="w-5 h-5 text-accent" />
                What Aminy Knows
              </h1>
              <p className="text-sm text-muted-foreground">
                About {childName}
              </p>
            </div>
            <Button
              onClick={() => setIsAddingNew(true)}
              size="sm"
              className="bg-accent hover:bg-accent/90"
            >
              <Plus className="w-4 h-4 mr-1" />
              Teach Aminy
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6"
        >
          <Card className="p-4 bg-gradient-to-br from-accent/5 to-purple-50/50 border-accent/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Aminy has learned
                </p>
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {totalFacts} {totalFacts === 1 ? 'thing' : 'things'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  about {childName}
                </p>
              </div>
              <div className="p-3 bg-white rounded-full shadow-sm">
                <Sparkles className="w-8 h-8 text-accent" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Category Filter */}
        <div className="mb-4 sm:mb-6 overflow-x-auto pb-2 -mx-4 px-4">
          <div className="flex gap-2 min-w-max">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "rounded-full",
                selectedCategory === null && "bg-accent hover:bg-accent/90"
              )}
            >
              All
            </Button>
            {Object.entries(categories).map(([key, cat]) => {
              const count = groupedMemories[key]?.length || 0;
              if (count === 0) return null;
              const Icon = cat.icon;
              return (
                <Button
                  key={key}
                  variant={selectedCategory === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(key)}
                  className={cn(
                    "rounded-full",
                    selectedCategory === key && "bg-accent hover:bg-accent/90"
                  )}
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {cat.label}
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Brain className="w-12 h-12 text-accent/30 mx-auto mb-3 animate-pulse" />
              <p className="text-muted-foreground">Loading memories...</p>
            </div>
          </div>
        )}

        {/* Memory Categories */}
        {!loading && (
          <div className="space-y-3 sm:space-y-4 sm:space-y-6">
            <AnimatePresence mode="popLayout">
              {Object.entries(filteredMemories).map(([categoryKey, facts]) => {
                if (!facts || facts.length === 0) return null;
                const category = categories[categoryKey] || categories.preference;
                const Icon = category.icon;

                return (
                  <motion.div
                    key={categoryKey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Card className="overflow-hidden">
                      <div className={cn("p-4 border-b", category.bgColor)}>
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg bg-white shadow-sm")}>
                            <Icon className={cn("w-5 h-5", category.color)} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-primary">{category.label}</h3>
                            <p className="text-xs text-muted-foreground">
                              {category.description}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="divide-y">
                        {facts.map((fact, index) => (
                          <motion.div
                            key={fact.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 hover:bg-gray-50/50 transition-colors group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <p className="text-primary">{fact.content}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {sourceLabels[fact.source] || fact.source}
                                  </Badge>
                                  {fact.confidence < 0.8 && (
                                    <span className="text-xs text-muted-foreground">
                                      (may need verification)
                                    </span>
                                  )}
                                </div>
                              </div>
                              {fact.source === 'manual' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-red-600"
                                  onClick={() => handleDeleteFact(fact.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Empty State */}
            {Object.keys(filteredMemories).length === 0 && !loading && (
              <div className="text-center py-12">
                <Brain className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-primary mb-2">
                  No memories in this category yet
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Aminy learns from your conversations and documents
                </p>
                <Button onClick={() => setIsAddingNew(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Teach Aminy something
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Trust Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-gray-50 px-4 py-2 rounded-full">
            <Shield className="w-4 h-4 text-green-600" />
            This data is private and encrypted
          </div>
        </motion.div>
      </div>

      {/* Add New Fact Dialog */}
      <Dialog open={isAddingNew} onOpenChange={setIsAddingNew}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-accent" />
              Teach Aminy
            </DialogTitle>
            <DialogDescription>
              Tell Aminy something important about {childName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-primary mb-2 block">
                Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(categories).slice(0, 6).map(([key, cat]) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setNewFact(prev => ({ ...prev, category: key }))}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border transition-all text-left",
                        newFact.category === key
                          ? "border-accent bg-accent/5"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <Icon className={cn("w-4 h-4", cat.color)} />
                      <span className="text-sm">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-primary mb-2 block">
                What should Aminy remember?
              </label>
              <Textarea
                value={newFact.content}
                onChange={(e) => setNewFact(prev => ({ ...prev, content: e.target.value }))}
                placeholder={`e.g., "${childName} loves dinosaurs" or "${childName} gets overwhelmed by loud noises"`}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingNew(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddFact}
              className="bg-accent hover:bg-accent/90"
              disabled={!newFact.content.trim()}
            >
              <Check className="w-4 h-4 mr-2" />
              Remember This
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WhatAminyKnows;
