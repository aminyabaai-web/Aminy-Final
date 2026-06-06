// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { 
  Brain, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff,
  Clock,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Shield,
  Pause,
  Play,
  X,
  Check,
  Info
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Memory {
  id: string;
  key: string;
  value: string | object;
  scope: 'child' | 'parent' | 'family';
  confidence: number;
  created_at: string;
  last_used_at: string | null;
  salience: number;
  why_saved: string;
  decay_days: number;
  metadata?: {
    child_name?: string;
    source?: string;
  };
}

interface MemorySettingsPageProps {
  userId: string;
  onClose?: () => void;
}

export const MemorySettingsPage: React.FC<MemorySettingsPageProps> = ({ userId, onClose }) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'child' | 'parent' | 'family'>('all');
  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Load memories and settings
  useEffect(() => {
    loadMemories();
    loadSettings();
  }, [userId]);

  const loadMemories = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/memory/list/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load memories');
      }

      const data = await response.json();
      setMemories(data.memories || []);
    } catch (error) {
      console.error('Error loading memories:', error);
      toast.error('Failed to load memories');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/memory/settings/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMemoryEnabled(data.settings?.memory_enabled ?? true);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const toggleMemoryEnabled = async (enabled: boolean) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/memory/settings/${userId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ memory_enabled: enabled }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      setMemoryEnabled(enabled);
      toast.success(enabled ? 'Memory saving enabled' : 'Memory saving paused');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  };

  const deleteMemory = async (memoryId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/memory/delete`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, memoryId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete memory');
      }

      setMemories(prev => prev.filter(m => m.id !== memoryId));
      toast.success('Memory deleted');
    } catch (error) {
      console.error('Error deleting memory:', error);
      toast.error('Failed to delete memory');
    }
  };

  const updateMemory = async (memoryId: string, newValue: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/memory/update`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, memoryId, value: newValue }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update memory');
      }

      setMemories(prev => 
        prev.map(m => m.id === memoryId ? { ...m, value: newValue } : m)
      );
      setEditingMemoryId(null);
      setEditValue('');
      toast.success('Memory updated');
    } catch (error) {
      console.error('Error updating memory:', error);
      toast.error('Failed to update memory');
    }
  };

  const startEdit = (memory: Memory) => {
    setEditingMemoryId(memory.id);
    setEditValue(typeof memory.value === 'string' ? memory.value : JSON.stringify(memory.value, null, 2));
  };

  const cancelEdit = () => {
    setEditingMemoryId(null);
    setEditValue('');
  };

  // Filter memories
  const filteredMemories = memories.filter(memory => {
    const matchesSearch = searchQuery === '' || 
      memory.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof memory.value === 'string' && memory.value.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesScope = scopeFilter === 'all' || memory.scope === scopeFilter;
    
    return matchesSearch && matchesScope;
  });

  // Group by scope
  const groupedMemories = {
    child: filteredMemories.filter(m => m.scope === 'child'),
    parent: filteredMemories.filter(m => m.scope === 'parent'),
    family: filteredMemories.filter(m => m.scope === 'family'),
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'child': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'parent': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'family': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-[#F0EDE8] text-gray-700 border-gray-200';
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return { label: 'Very High', color: 'bg-green-100 text-green-700' };
    if (confidence >= 0.8) return { label: 'High', color: 'bg-green-100 text-green-700' };
    if (confidence >= 0.7) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Low', color: 'bg-orange-100 text-orange-700' };
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never used';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const renderMemory = (memory: Memory) => {
    const isExpanded = expandedMemoryId === memory.id;
    const isEditing = editingMemoryId === memory.id;
    const confidenceBadge = getConfidenceBadge(memory.confidence);

    return (
      <div 
        key={memory.id}
        className="border border-slate-200 rounded-lg bg-white hover:shadow-md transition-shadow"
      >
        {/* Memory Header */}
        <div 
          className="p-4 cursor-pointer"
          onClick={() => setExpandedMemoryId(isExpanded ? null : memory.id)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                <h4 className="font-medium truncate">
                  {memory.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h4>
              </div>
              
              <p className="text-sm text-muted-foreground truncate ml-6">
                {typeof memory.value === 'string' ? memory.value : JSON.stringify(memory.value)}
              </p>

              <div className="flex items-center gap-2 mt-2 ml-6 flex-wrap">
                <Badge variant="outline" className={`text-xs ${getScopeColor(memory.scope)}`}>
                  {memory.scope}
                </Badge>
                <Badge variant="outline" className={`text-xs ${confidenceBadge.color}`}>
                  {confidenceBadge.label}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(memory.last_used_at || memory.created_at)}
                </span>
                {memory.salience > 0.8 && (
                  <Badge variant="outline" className="text-xs bg-accent/10 text-accent border-accent/20">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    High importance
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Edit memory"
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(memory);
                }}
                className="h-8 w-8 p-0"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete memory"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this memory? This cannot be undone.')) {
                    deleteMemory(memory.id);
                  }
                }}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-3">
            {/* Why Saved */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Why this was saved
              </p>
              <p className="text-sm">{memory.why_saved || 'Helps personalize Aminy\'s guidance'}</p>
            </div>

            {/* Full Value (if editing) */}
            {isEditing ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Edit value</p>
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={3}
                  className="text-sm mb-2"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateMemory(memory.id, editValue)}
                    className="gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelEdit}
                    className="gap-1"
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Full value</p>
                <div className="bg-white border border-slate-200 rounded p-2">
                  <pre className="text-xs whitespace-pre-wrap">
                    {typeof memory.value === 'string' 
                      ? memory.value 
                      : JSON.stringify(memory.value, null, 2)
                    }
                  </pre>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{formatDate(memory.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last used</p>
                <p className="font-medium">{formatDate(memory.last_used_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Confidence</p>
                <p className="font-medium">{(memory.confidence * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Salience</p>
                <p className="font-medium">{(memory.salience * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Memory & Privacy</h1>
                <p className="text-sm text-muted-foreground">
                  {memories.length} {memories.length === 1 ? 'memory' : 'memories'} saved
                </p>
              </div>
            </div>
            {onClose && (
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            )}
          </div>

          {/* Memory Toggle */}
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {memoryEnabled ? (
                  <Play className="w-5 h-5 text-accent" />
                ) : (
                  <Pause className="w-5 h-5 text-orange-600" />
                )}
                <div>
                  <p className="font-medium">
                    {memoryEnabled ? 'Memory saving is on' : 'Memory saving is paused'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {memoryEnabled 
                      ? 'Aminy is learning from your conversations'
                      : 'Aminy won\'t save new information until you turn this back on'
                    }
                  </p>
                </div>
              </div>
              <Switch
                checked={memoryEnabled}
                onCheckedChange={toggleMemoryEnabled}
              />
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'child', 'parent', 'family'] as const).map(scope => (
                <Button
                  key={scope}
                  variant={scopeFilter === scope ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScopeFilter(scope)}
                  className="capitalize"
                >
                  {scope}
                  {scope !== 'all' && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {groupedMemories[scope].length}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Memory List */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-accent border-t-transparent"></div>
            <p className="text-sm text-muted-foreground mt-3">Loading memories...</p>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">
              {searchQuery || scopeFilter !== 'all' 
                ? 'No memories match your filters' 
                : 'No memories saved yet'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Child Memories */}
            {groupedMemories.child.length > 0 && (scopeFilter === 'all' || scopeFilter === 'child') && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                    Child
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {groupedMemories.child.length} {groupedMemories.child.length === 1 ? 'memory' : 'memories'}
                  </span>
                </h3>
                <div className="space-y-2">
                  {groupedMemories.child.map(renderMemory)}
                </div>
              </div>
            )}

            {/* Parent Memories */}
            {groupedMemories.parent.length > 0 && (scopeFilter === 'all' || scopeFilter === 'parent') && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                    Parent
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {groupedMemories.parent.length} {groupedMemories.parent.length === 1 ? 'memory' : 'memories'}
                  </span>
                </h3>
                <div className="space-y-2">
                  {groupedMemories.parent.map(renderMemory)}
                </div>
              </div>
            )}

            {/* Family Memories */}
            {groupedMemories.family.length > 0 && (scopeFilter === 'all' || scopeFilter === 'family') && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                    Family
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {groupedMemories.family.length} {groupedMemories.family.length === 1 ? 'memory' : 'memories'}
                  </span>
                </h3>
                <div className="space-y-2">
                  {groupedMemories.family.map(renderMemory)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Privacy Notice */}
        <div className="mt-8 bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold mb-2">Your privacy is protected</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Memories are stored securely and never shared with third parties</li>
                <li>• Medical diagnoses, addresses, and sensitive personal information are never saved</li>
                <li>• Old, unused memories are automatically cleaned up after {memories[0]?.decay_days || 30} days</li>
                <li>• You can edit or delete any memory at any time</li>
                <li>• All memory operations are logged in your audit trail</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
