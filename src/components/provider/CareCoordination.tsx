/**
 * CareCoordination.tsx
 *
 * Care coordination tools for providers to collaborate with
 * other providers, parents, and care team members.
 *
 * Features:
 * - Shared care plans
 * - Provider-to-provider communication
 * - Parent messaging and updates
 * - Session notes sharing
 * - Care team overview
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  FileText,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Share2,
  UserPlus,
  Bell,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  Lock,
  Unlock,
  X,
  Plus,
  Paperclip,
  Phone,
  Video,
  Mail,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';

interface CareTeamMember {
  id: string;
  name: string;
  role: string;
  credentials?: string;
  specialty?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status: 'active' | 'pending' | 'inactive';
  lastActive?: string;
  accessLevel: 'full' | 'limited' | 'none';
}

interface SharedNote {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  type: 'progress' | 'concern' | 'update' | 'recommendation';
  sharedWith: string[];
  createdAt: string;
  reactions?: { emoji: string; userId: string }[];
}

interface CarePlanItem {
  id: string;
  category: string;
  goal: string;
  interventions: string[];
  assignedTo: string[];
  status: 'active' | 'completed' | 'paused';
  progress: number;
  dueDate?: string;
  notes?: string;
}

interface CareCoordinationProps {
  providerId: string;
  patientId: string;
  patientName: string;
  parentName: string;
  parentId: string;
}

export function CareCoordination({
  providerId,
  patientId,
  patientName,
  parentName,
  parentId,
}: CareCoordinationProps) {
  const [activeTab, setActiveTab] = useState<'team' | 'notes' | 'plan' | 'messages'>('team');
  const [careTeam, setCareTeam] = useState<CareTeamMember[]>([]);
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [carePlan, setCarePlan] = useState<CarePlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [newNoteType, setNewNoteType] = useState<SharedNote['type']>('update');
  const [showAddTeamMember, setShowAddTeamMember] = useState(false);
  const [expandedPlanItem, setExpandedPlanItem] = useState<string | null>(null);

  useEffect(() => {
    loadCareCoordinationData();
  }, [patientId]);

  const loadCareCoordinationData = async () => {
    setIsLoading(true);

    // Simulated data - in production, fetch from Supabase
    await new Promise(resolve => setTimeout(resolve, 800));

    setCareTeam([
      {
        id: 'parent-1',
        name: parentName,
        role: 'Parent',
        email: 'parent@example.com',
        phone: '(555) 123-4567',
        status: 'active',
        lastActive: new Date().toISOString(),
        accessLevel: 'full',
      },
      {
        id: 'bcba-1',
        name: 'Dr. Sarah Mitchell',
        role: 'BCBA',
        credentials: 'BCBA-D',
        specialty: 'Early intervention',
        email: 'sarah@example.com',
        status: 'active',
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        accessLevel: 'full',
      },
      {
        id: 'slp-1',
        name: 'Jessica Chen',
        role: 'Speech Therapist',
        credentials: 'SLP-CCC',
        specialty: 'AAC, feeding',
        email: 'jessica@example.com',
        status: 'active',
        lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        accessLevel: 'limited',
      },
      {
        id: 'ot-1',
        name: 'Michael Rodriguez',
        role: 'Occupational Therapist',
        credentials: 'OTR/L',
        specialty: 'Sensory integration',
        status: 'pending',
        accessLevel: 'none',
      },
    ]);

    setSharedNotes([
      {
        id: 'note-1',
        authorId: 'bcba-1',
        authorName: 'Dr. Sarah Mitchell',
        authorRole: 'BCBA',
        content: `Great progress in today's session! ${patientName} used the visual schedule independently for the first time and completed 3 transitions without prompting. Recommending we continue this approach and consider fading prompts further next week.`,
        type: 'progress',
        sharedWith: ['parent-1', 'slp-1'],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        reactions: [{ emoji: '👏', userId: 'parent-1' }],
      },
      {
        id: 'note-2',
        authorId: 'slp-1',
        authorName: 'Jessica Chen',
        authorRole: 'SLP',
        content: `Noticed increased frustration during speech exercises when hungry. Suggesting we schedule sessions after snack time. Also, the AAC device vocabulary needs updating - will coordinate with parent on new words to add.`,
        type: 'recommendation',
        sharedWith: ['parent-1', 'bcba-1'],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'note-3',
        authorId: 'parent-1',
        authorName: parentName,
        authorRole: 'Parent',
        content: `${patientName} has been having difficulty sleeping this week - might affect therapy sessions. Also wanted to share that the morning routine strategies from last week are working great at home!`,
        type: 'update',
        sharedWith: ['bcba-1', 'slp-1'],
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      },
    ]);

    setCarePlan([
      {
        id: 'plan-1',
        category: 'Communication',
        goal: 'Increase spontaneous verbal requests to 20 per day',
        interventions: [
          'Use wait time of 5-7 seconds before prompting',
          'Model target phrases during preferred activities',
          'Reinforce any verbal attempt with enthusiasm',
        ],
        assignedTo: ['bcba-1', 'slp-1', 'parent-1'],
        status: 'active',
        progress: 65,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'plan-2',
        category: 'Self-Regulation',
        goal: 'Use calming strategies independently in 4/5 opportunities',
        interventions: [
          'Practice deep breathing with visual supports',
          'Provide sensory break options when signs of dysregulation',
          'Use emotion check-in cards at transition points',
        ],
        assignedTo: ['bcba-1', 'parent-1'],
        status: 'active',
        progress: 45,
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'plan-3',
        category: 'Motor Skills',
        goal: 'Complete dressing routine independently',
        interventions: [
          'Break down steps with visual task analysis',
          'Practice with clothing modifications (larger buttons)',
          'Reinforce each step completed independently',
        ],
        assignedTo: ['ot-1', 'parent-1'],
        status: 'paused',
        progress: 30,
        notes: 'Waiting for OT to join care team',
      },
    ]);

    setIsLoading(false);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    const note: SharedNote = {
      id: `note-${Date.now()}`,
      authorId: providerId,
      authorName: 'You',
      authorRole: 'Provider',
      content: newNote,
      type: newNoteType,
      sharedWith: ['parent-1'],
      createdAt: new Date().toISOString(),
    };

    setSharedNotes([note, ...sharedNotes]);
    setNewNote('');
  };

  const getNoteTypeColor = (type: SharedNote['type']) => {
    switch (type) {
      case 'progress': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'concern': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      case 'recommendation': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-neutral-100 text-neutral-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'paused': return 'bg-neutral-100 text-neutral-600';
      default: return 'bg-neutral-100 text-neutral-600';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-neutral-600 dark:text-slate-400">Loading care coordination...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            Care Team for {patientName}
          </h2>
          <p className="text-neutral-500 dark:text-slate-400 text-sm">
            {careTeam.filter(m => m.status === 'active').length} active team members
          </p>
        </div>
        <Button onClick={() => setShowAddTeamMember(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Provider
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-slate-700">
        {[
          { id: 'team', label: 'Care Team', icon: Users },
          { id: 'notes', label: 'Shared Notes', icon: MessageSquare },
          { id: 'plan', label: 'Care Plan', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-teal-600 text-teal-600 bg-teal-50/50 dark:bg-teal-900/20'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Care Team Tab */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          {careTeam.map((member) => (
            <Card key={member.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30 flex items-center justify-center">
                    <span className="text-lg font-semibold text-teal-700 dark:text-teal-400">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-neutral-900 dark:text-white">
                        {member.name}
                      </h4>
                      {member.credentials && (
                        <Badge variant="secondary" className="text-xs">
                          {member.credentials}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-slate-400">
                      {member.role}
                      {member.specialty && ` • ${member.specialty}`}
                    </p>
                    {member.lastActive && (
                      <p className="text-xs text-neutral-400 dark:text-slate-500 mt-1">
                        Active {formatTimeAgo(member.lastActive)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(member.status)}>
                    {member.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {member.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                    {member.status}
                  </Badge>

                  <div className="flex gap-1 ml-2">
                    {member.email && (
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                        <Mail className="w-4 h-4 text-neutral-500" />
                      </Button>
                    )}
                    {member.phone && (
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                        <Phone className="w-4 h-4 text-neutral-500" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                      <Video className="w-4 h-4 text-neutral-500" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Access Level */}
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  {member.accessLevel === 'full' ? (
                    <>
                      <Unlock className="w-4 h-4 text-green-600" />
                      <span className="text-green-600 dark:text-green-400">Full profile access</span>
                    </>
                  ) : member.accessLevel === 'limited' ? (
                    <>
                      <Eye className="w-4 h-4 text-amber-600" />
                      <span className="text-amber-600 dark:text-amber-400">Limited access</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-neutral-400" />
                      <span className="text-neutral-500">No access yet</span>
                    </>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="text-xs">
                  Manage Access
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Shared Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {/* Add Note */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">Add Note:</span>
              <div className="flex gap-1">
                {(['update', 'progress', 'recommendation', 'concern'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setNewNoteType(type)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      newNoteType === type
                        ? getNoteTypeColor(type)
                        : 'bg-neutral-100 text-neutral-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              placeholder={`Share an update about ${patientName}...`}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              className="mb-3"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Share2 className="w-4 h-4" />
                <span>Will be shared with {parentName} and care team</span>
              </div>
              <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                <Send className="w-4 h-4 mr-2" />
                Share Note
              </Button>
            </div>
          </Card>

          {/* Notes List */}
          <div className="space-y-3">
            {sharedNotes.map((note) => (
              <Card key={note.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-violet-700 dark:text-violet-400">
                      {note.authorName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {note.authorName}
                      </span>
                      <span className="text-xs text-neutral-500">•</span>
                      <span className="text-xs text-neutral-500">{note.authorRole}</span>
                      <Badge className={`text-xs ${getNoteTypeColor(note.type)}`}>
                        {note.type}
                      </Badge>
                    </div>
                    <p className="text-neutral-700 dark:text-slate-300 text-sm leading-relaxed">
                      {note.content}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-neutral-400">
                        {formatTimeAgo(note.createdAt)}
                      </span>
                      <div className="flex items-center gap-2">
                        {note.reactions?.map((reaction, idx) => (
                          <span key={idx} className="text-sm">{reaction.emoji}</span>
                        ))}
                        <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                          React
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                          Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Care Plan Tab */}
      {activeTab === 'plan' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500 dark:text-slate-400">
              {carePlan.filter(p => p.status === 'active').length} active goals
            </p>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Goal
            </Button>
          </div>

          {carePlan.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setExpandedPlanItem(expandedPlanItem === item.id ? null : item.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-neutral-900 dark:text-white">
                      {item.goal}
                    </h4>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex-1 h-2 bg-neutral-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-neutral-600 dark:text-slate-400 w-12">
                        {item.progress}%
                      </span>
                    </div>
                  </div>
                  {expandedPlanItem === item.id ? (
                    <ChevronUp className="w-5 h-5 text-neutral-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-neutral-400" />
                  )}
                </div>
              </div>

              {expandedPlanItem === item.id && (
                <div className="px-4 pb-4 pt-0 border-t border-neutral-100 dark:border-slate-700">
                  <div className="pt-4 space-y-4">
                    {/* Interventions */}
                    <div>
                      <h5 className="text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                        Interventions
                      </h5>
                      <ul className="space-y-2">
                        {item.interventions.map((intervention, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-slate-400">
                            <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                            {intervention}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Assigned To */}
                    <div>
                      <h5 className="text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                        Assigned To
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {item.assignedTo.map((memberId) => {
                          const member = careTeam.find(m => m.id === memberId);
                          return member ? (
                            <Badge key={memberId} variant="secondary" className="text-xs">
                              {member.name} ({member.role})
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>

                    {/* Due Date & Notes */}
                    {item.dueDate && (
                      <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-slate-400">
                        <Calendar className="w-4 h-4" />
                        Target: {new Date(item.dueDate).toLocaleDateString()}
                      </div>
                    )}

                    {item.notes && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                        <AlertCircle className="w-4 h-4 inline mr-2" />
                        {item.notes}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm">
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Goal
                      </Button>
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Log Progress
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Team Member Modal */}
      {showAddTeamMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Invite Provider
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddTeamMember(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                  Provider Email
                </label>
                <Input placeholder="provider@example.com" type="email" />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                  Role
                </label>
                <select className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-slate-600 bg-white dark:bg-slate-700">
                  <option>BCBA</option>
                  <option>RBT</option>
                  <option>Speech Therapist (SLP)</option>
                  <option>Occupational Therapist (OT)</option>
                  <option>Physical Therapist (PT)</option>
                  <option>Psychologist</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1.5">
                  Access Level
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-slate-600 cursor-pointer hover:bg-neutral-50 dark:hover:bg-slate-800">
                    <input type="radio" name="access" defaultChecked className="text-teal-600" />
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">Full Access</p>
                      <p className="text-xs text-neutral-500">View and contribute to all care coordination</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-slate-600 cursor-pointer hover:bg-neutral-50 dark:hover:bg-slate-800">
                    <input type="radio" name="access" className="text-teal-600" />
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">Limited Access</p>
                      <p className="text-xs text-neutral-500">View notes and care plan only</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddTeamMember(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700">
                  <Send className="w-4 h-4 mr-2" />
                  Send Invite
                </Button>
              </div>
            </div>

            <p className="text-xs text-neutral-500 dark:text-slate-400 mt-4 text-center">
              {parentName} will be notified and must approve the invitation
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

export default CareCoordination;
