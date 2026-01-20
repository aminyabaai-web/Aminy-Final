import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { 
  Send, 
  AlertCircle, 
  Paperclip, 
  X,
  Save,
  FileImage
} from 'lucide-react';
import { toast } from 'sonner';

interface CommunityComposerProps {
  onPost: (content: { title: string; body: string; tags: string[]; anonymous: boolean; removeNames: boolean }) => void;
  onCancel: () => void;
}

export function CommunityComposer({ onPost, onCancel }: CommunityComposerProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [removeNames, setRemoveNames] = useState(true); // ON by default as per spec
  const [anonymous, setAnonymous] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  
  const CHARACTER_LIMIT = 500;
  
  const tags = ['Routines', 'Sensory', 'Communication', 'School', 'Community', 'Self-care'];

  // Auto-save drafts to localStorage
  useEffect(() => {
    const draftKey = 'community-draft';
    
    // Save draft every 2 seconds if there's content
    const saveDraft = () => {
      if (title || body || selectedTags.length > 0) {
        localStorage.setItem(draftKey, JSON.stringify({
          title,
          body,
          selectedTags,
          removeNames,
          anonymous,
          timestamp: Date.now()
        }));
        setHasDraft(true);
      }
    };

    const draftTimer = setTimeout(saveDraft, 2000);
    return () => clearTimeout(draftTimer);
  }, [title, body, selectedTags, removeNames, anonymous]);

  // Load draft on mount
  useEffect(() => {
    const draftKey = 'community-draft';
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        // Only load if draft is less than 24 hours old
        if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
          setHasDraft(true);
        }
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, []);

  // Character count update
  useEffect(() => {
    setCharacterCount(body.length);
  }, [body]);

  const loadDraft = () => {
    const draftKey = 'community-draft';
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setTitle(draft.title || '');
        setBody(draft.body || '');
        setSelectedTags(draft.selectedTags || []);
        setRemoveNames(draft.removeNames !== undefined ? draft.removeNames : true);
        setAnonymous(draft.anonymous || false);
        toast.success('Draft loaded');
      } catch (e) {
        toast.error("Couldn't load your draft. Starting fresh?");
      }
    }
  };

  const clearDraft = () => {
    const draftKey = 'community-draft';
    localStorage.removeItem(draftKey);
    setTitle('');
    setBody('');
    setSelectedTags([]);
    setRemoveNames(true);
    setAnonymous(false);
    setHasDraft(false);
    toast.success('Draft cleared');
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : prev.length < 3 ? [...prev, tag] : prev
    );
  };

  const handlePost = () => {
    if (!body.trim()) {
      toast.error('Your post needs some content. What would you like to share?');
      return;
    }

    if (selectedTags.length === 0) {
      toast.error('Pick at least one tag so others can find your post');
      return;
    }

    onPost({
      title,
      body,
      tags: selectedTags,
      anonymous,
      removeNames
    });

    // Clear draft after successful post
    localStorage.removeItem('community-draft');
    setHasDraft(false);
  };

  const charactersRemaining = CHARACTER_LIMIT - characterCount;
  const isOverLimit = characterCount > CHARACTER_LIMIT;
  const canPost = body.trim().length > 0 && selectedTags.length > 0 && !isOverLimit;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Share with the Community</h2>
        
        {/* Draft notification */}
        {hasDraft && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-900">You have a saved draft</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadDraft}
                className="text-blue-600 hover:text-blue-700"
              >
                Load
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearDraft}
                className="text-blue-600 hover:text-blue-700"
              >
                Clear
              </Button>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {/* Title (optional) */}
          <div>
            <Label htmlFor="post-title" className="text-sm font-medium text-slate-700 mb-2 block">
              Title (optional but encouraged for questions)
            </Label>
            <Input 
              id="post-title"
              placeholder="Give your post a clear title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Post body */}
          <div>
            <Label htmlFor="post-body" className="text-sm font-medium text-slate-700 mb-2 block">
              Your post
            </Label>
            <Textarea 
              id="post-body"
              placeholder="Ask about routines, sensory strategies, communication, school, or share a small win."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[120px] resize-vertical"
              maxLength={CHARACTER_LIMIT}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-slate-500">
                Add context: age, setting, what you tried
              </p>
              <p className={`text-xs font-medium ${
                isOverLimit ? 'text-red-600' : 
                charactersRemaining < 50 ? 'text-amber-600' : 
                'text-slate-500'
              }`}>
                {charactersRemaining} characters remaining
              </p>
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              Tags (1-3 required)
            </Label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <Button
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleTag(tag)}
                  disabled={selectedTags.length >= 3 && !selectedTags.includes(tag)}
                  className="transition-all"
                >
                  {tag}
                  {selectedTags.includes(tag) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Button>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                {selectedTags.length}/3 tags selected
              </p>
            )}
          </div>

          {/* PHI Toggle - ON by default as per spec */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor="remove-names" className="text-sm font-medium text-blue-900 cursor-pointer">
                    Remove names/PHI
                  </Label>
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                    Recommended
                  </Badge>
                </div>
                <p className="text-xs text-blue-700">
                  Automatically removes names and personal health information for privacy
                </p>
              </div>
              <Switch
                id="remove-names"
                checked={removeNames}
                onCheckedChange={setRemoveNames}
                className="ml-4"
              />
            </div>
          </div>

          {/* Additional options */}
          <div className="space-y-3 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="anonymous" className="text-sm cursor-pointer">
                Post anonymously
              </Label>
              <Switch
                id="anonymous"
                checked={anonymous}
                onCheckedChange={setAnonymous}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="add-to-plan" className="text-sm cursor-pointer">
                Add to my Plan as a note
              </Label>
              <Switch
                id="add-to-plan"
                defaultChecked
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="expert-annotation" className="text-sm cursor-pointer">
                Allow expert annotation
              </Label>
              <Switch
                id="expert-annotation"
                defaultChecked
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <Button variant="outline" size="sm">
              <Paperclip className="w-4 h-4 mr-2" />
              Attach files
            </Button>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                onClick={handlePost}
                disabled={!canPost}
              >
                <Send className="w-4 h-4 mr-2" />
                Post
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Community Guidelines */}
      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <strong className="font-semibold">Community Guidelines:</strong> Be kind. No diagnoses. No treatments. Report concerns.
          </div>
        </div>
      </Card>
    </div>
  );
}
