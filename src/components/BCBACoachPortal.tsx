import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  ArrowLeft,
  Users,
  Target,
  FileText,
  Sparkles,
  TrendingUp,
  Calendar,
  CheckCircle,
  AlertCircle,
  Search,
  Plus,
  ChevronRight,
  Activity
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Family {
  id: string;
  childName: string;
  parentName: string;
  age: string;
  activeGoals: number;
  lastVisit: string;
  status: 'active' | 'review' | 'inactive';
  progress: number;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'paused';
  progress: number;
  baseline: string;
  target: string;
  category: string;
}

interface Note {
  id: string;
  date: string;
  content: string;
  tags: string[];
}

interface BCBACoachPortalProps {
  onBack: () => void;
  coachName?: string;
}

export function BCBACoachPortal({ onBack, coachName = "Dr. Coach" }: BCBACoachPortalProps) {
  const [activeView, setActiveView] = useState<'dashboard' | 'family'>('dashboard');
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFamilies();
  }, []);

  useEffect(() => {
    if (selectedFamily) {
      loadFamilyData(selectedFamily.id);
    }
  }, [selectedFamily]);

  const loadFamilies = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/coach/families`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFamilies(data.families || []);
      } else {
        // Mock data for demonstration
        setFamilies([
          {
            id: '1',
            childName: 'Emma',
            parentName: 'Sarah Johnson',
            age: '5',
            activeGoals: 4,
            lastVisit: '2 days ago',
            status: 'active',
            progress: 78
          },
          {
            id: '2',
            childName: 'Liam',
            parentName: 'Michael Chen',
            age: '7',
            activeGoals: 3,
            lastVisit: '1 week ago',
            status: 'active',
            progress: 65
          },
          {
            id: '3',
            childName: 'Sophia',
            parentName: 'Jennifer Rodriguez',
            age: '4',
            activeGoals: 5,
            lastVisit: '3 weeks ago',
            status: 'review',
            progress: 42
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading families:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFamilyData = async (familyId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/coach/family/${familyId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setGoals(data.goals || []);
        setNotes(data.notes || []);
      } else {
        // Mock data
        setGoals([
          {
            id: '1',
            title: 'Increase eye contact during conversations',
            description: 'Maintain eye contact for 3-5 seconds during structured activities',
            status: 'active',
            progress: 75,
            baseline: '1-2 seconds',
            target: '3-5 seconds',
            category: 'Social Skills'
          },
          {
            id: '2',
            title: 'Request help independently',
            description: 'Use words or gestures to request assistance without prompting',
            status: 'active',
            progress: 60,
            baseline: '0-1 per session',
            target: '3-4 per session',
            category: 'Communication'
          }
        ]);

        setNotes([
          {
            id: '1',
            date: '2025-10-25',
            content: 'Great progress on eye contact today. Emma maintained contact for 4 seconds during puzzle activity.',
            tags: ['progress', 'social-skills']
          },
          {
            id: '2',
            date: '2025-10-20',
            content: 'Working on generalization of requesting help. Practice at home recommended.',
            tags: ['recommendation', 'communication']
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading family data:', error);
    }
  };

  const saveNote = async () => {
    if (!newNote.trim() || !selectedFamily) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/coach/note`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            familyId: selectedFamily.id,
            content: newNote,
            date: new Date().toISOString()
          })
        }
      );

      if (response.ok) {
        const savedNote = await response.json();
        setNotes([savedNote, ...notes]);
        setNewNote('');
      } else {
        // Mock save
        const note: Note = {
          id: Date.now().toString(),
          date: new Date().toISOString().split('T')[0],
          content: newNote,
          tags: []
        };
        setNotes([note, ...notes]);
        setNewNote('');
      }
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const filteredFamilies = families.filter(f =>
    f.childName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.parentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAISummary = (family: Family) => {
    if (family.progress > 70) {
      return {
        message: `${family.childName} is making excellent progress. Continue current strategies and consider advancing goals.`,
        type: 'success' as const
      };
    } else if (family.progress > 40) {
      return {
        message: `${family.childName} is progressing steadily. Review goals and adjust strategies as needed.`,
        type: 'info' as const
      };
    } else {
      return {
        message: `${family.childName} may benefit from strategy review. Schedule check-in with family.`,
        type: 'warning' as const
      };
    }
  };

  if (activeView === 'family' && selectedFamily) {
    const aiSummary = getAISummary(selectedFamily);

    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-accent/5 via-accent/8 to-accent/5 border-b border-accent/10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <button
              onClick={() => setActiveView('dashboard')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-slate-900 mb-1">{selectedFamily.childName}</h1>
                <p className="text-slate-600">Parent: {selectedFamily.parentName} • Age {selectedFamily.age}</p>
              </div>
              <Badge className={
                selectedFamily.status === 'active' 
                  ? 'bg-green-100 text-green-700' 
                  : selectedFamily.status === 'review'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-700'
              }>
                {selectedFamily.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* AI Summary */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Card className={`p-4 border-2 ${
            aiSummary.type === 'success' ? 'border-green-200 bg-green-50' :
            aiSummary.type === 'warning' ? 'border-amber-200 bg-amber-50' :
            'border-blue-200 bg-blue-50'
          }`}>
            <div className="flex items-start gap-3">
              <Sparkles className={`w-5 h-5 flex-shrink-0 ${
                aiSummary.type === 'success' ? 'text-green-600' :
                aiSummary.type === 'warning' ? 'text-amber-600' :
                'text-blue-600'
              }`} />
              <div>
                <p className="text-slate-900 mb-1">AI Insight</p>
                <p className="text-slate-700 text-sm">{aiSummary.message}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4 sm:mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3 sm:space-y-4">
              <Card className="p-4 sm:p-5 md:p-6">
                <h3 className="text-slate-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-accent" />
                  Progress Overview
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Overall Progress</span>
                      <span className="text-slate-900">{selectedFamily.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-accent h-2 rounded-full transition-all duration-300"
                        style={{ width: `${selectedFamily.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 pt-4">
                    <div className="text-center">
                      <div className="text-2xl text-slate-900 mb-1">{selectedFamily.activeGoals}</div>
                      <div className="text-xs text-slate-600">Active Goals</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl text-slate-900 mb-1">12</div>
                      <div className="text-xs text-slate-600">Sessions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl text-slate-900 mb-1">8</div>
                      <div className="text-xs text-slate-600">Weeks</div>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="goals" className="space-y-3 sm:space-y-4">
              {goals.map(goal => (
                <Card key={goal.id} className="p-4 sm:p-5 md:p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-slate-900 mb-1">{goal.title}</h4>
                      <p className="text-sm text-slate-600 mb-2">{goal.description}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <Badge variant="outline">{goal.category}</Badge>
                        <span className="text-slate-500">Baseline: {goal.baseline}</span>
                        <span className="text-slate-500">Target: {goal.target}</span>
                      </div>
                    </div>
                    <Badge className={
                      goal.status === 'active' ? 'bg-green-100 text-green-700' :
                      goal.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }>
                      {goal.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Progress</span>
                      <span className="text-slate-900">{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-accent h-2 rounded-full transition-all duration-300"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="reports" className="space-y-3 sm:space-y-4">
              <Card className="p-6 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 mb-4">Reports integration coming soon</p>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-3 sm:space-y-4">
              <Card className="p-4 sm:p-5 md:p-6">
                <h4 className="text-slate-900 mb-3">Add New Note</h4>
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Session notes, observations, recommendations..."
                  className="mb-3 min-h-[100px]"
                />
                <Button onClick={saveNote} className="bg-accent hover:bg-accent/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Save Note
                </Button>
              </Card>

              {notes.map(note => (
                <Card key={note.id} className="p-4 sm:p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">{note.date}</span>
                  </div>
                  <p className="text-slate-900">{note.content}</p>
                  {note.tags.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {note.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-accent/5 via-accent/8 to-accent/5 border-b border-accent/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-slate-900 mb-1">BCBA Coach Portal</h1>
          <p className="text-slate-600">Welcome back, {coachName}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search families..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Card className="p-3 sm:p-4">
            <div className="text-2xl text-slate-900 mb-1">{families.length}</div>
            <div className="text-sm text-slate-600">Active Families</div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="text-2xl text-slate-900 mb-1">
              {families.reduce((sum, f) => sum + f.activeGoals, 0)}
            </div>
            <div className="text-sm text-slate-600">Total Goals</div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="text-2xl text-slate-900 mb-1">
              {Math.round(families.reduce((sum, f) => sum + f.progress, 0) / families.length)}%
            </div>
            <div className="text-sm text-slate-600">Avg Progress</div>
          </Card>
        </div>

        {/* Families List */}
        <div className="space-y-3">
          <h2 className="text-slate-900 mb-3">Your Families</h2>
          {isLoading ? (
            <Card className="p-6 text-center">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            </Card>
          ) : filteredFamilies.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-slate-600">No families found</p>
            </Card>
          ) : (
            filteredFamilies.map(family => {
              const aiSummary = getAISummary(family);
              return (
                <Card
                  key={family.id}
                  className="p-6 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => {
                    setSelectedFamily(family);
                    setActiveView('family');
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-slate-900 mb-1">{family.childName}</h3>
                      <p className="text-sm text-slate-600">{family.parentName} • Age {family.age}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3 text-sm">
                    <div>
                      <span className="text-slate-600">Goals: </span>
                      <span className="text-slate-900">{family.activeGoals}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Progress: </span>
                      <span className="text-slate-900">{family.progress}%</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Last: </span>
                      <span className="text-slate-900">{family.lastVisit}</span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border ${
                    aiSummary.type === 'success' ? 'border-green-200 bg-green-50' :
                    aiSummary.type === 'warning' ? 'border-amber-200 bg-amber-50' :
                    'border-blue-200 bg-blue-50'
                  }`}>
                    <div className="flex items-start gap-2">
                      <Sparkles className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                        aiSummary.type === 'success' ? 'text-green-600' :
                        aiSummary.type === 'warning' ? 'text-amber-600' :
                        'text-blue-600'
                      }`} />
                      <p className="text-sm text-slate-700">{aiSummary.message}</p>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
