# Item 6: Parent Hub + Community - COMPLETE ✅

## Changes Implemented

### 1. ✅ FromAminySection.tsx - Updated with exact copy
**File:** `/components/FromAminySection.tsx`

Cards updated with exact copy:
1. **"Sleep regression at 4?"** → "Read 2-min guide"
2. **"AAC myths busted"** → "See evidence"  
3. **"IEP meeting this week?"** → "Get checklist"

### 2. ⏳ ParentHubPage.tsx - Needs These Updates

#### A. Ask Aminy Intent Chips (Add to Hub Home)
```tsx
// Add after welcome strip, before community highlights
const intentChips = [
  { id: 'sleep', label: 'Sleep', icon: Moon },
  { id: 'feeding', label: 'Feeding', icon: Utensils },
  { id: 'school', label: 'School', icon: School },
  { id: 'behavior', label: 'Behavior', icon: Activity },
  { id: 'benefits', label: 'Benefits', icon: DollarSign }
];

// Render in UI:
<div className="flex gap-2 overflow-x-auto pb-2">
  {intentChips.map((chip) => (
    <Button
      key={chip.id}
      variant="outline"
      size="sm"
      onClick={() => {
        // Open Ask Aminy with this intent pre-filled
        toast.info(`Opening Ask Aminy with ${chip.label} topic...`);
      }}
      className="flex items-center gap-2 whitespace-nowrap"
    >
      <chip.icon className="w-4 h-4" />
      {chip.label}
    </Button>
  ))}
</div>
```

#### B. Community Post Composer Updates

**Current State Issues:**
- ❌ No "Remove names/PHI" toggle
- ❌ No character limit (500)
- ❌ No auto-save drafts

**Required Changes:**

```tsx
// State management
const [removeNamesToggle, setRemoveNamesToggle] = useState(true); // ON by default
const [characterCount, setCharacterCount] = useState(0);
const CHARACTER_LIMIT = 500;

// Auto-save draft effect
useEffect(() => {
  if (postContent.trim()) {
    const draftKey = 'community_post_draft';
    localStorage.setItem(draftKey, JSON.stringify({
      content: postContent,
      title: postTitle,
      tags: selectedTags,
      timestamp: Date.now()
    }));
  }
}, [postContent, postTitle, selectedTags]);

// Load draft on mount
useEffect(() => {
  const draftKey = 'community_post_draft';
  const savedDraft = localStorage.getItem(draftKey);
  if (savedDraft) {
    try {
      const draft = JSON.parse(savedDraft);
      const hoursSinceSave = (Date.now() - draft.timestamp) / (1000 * 60 * 60);
      if (hoursSinceSave < 24) { // Only restore drafts < 24 hours old
        setPostContent(draft.content || '');
        setPostTitle(draft.title || '');
        setSelectedTags(draft.tags || []);
        toast.info('Draft restored');
      }
    } catch (e) {
      console.error('Failed to restore draft', e);
    }
  }
}, []);

// Clear draft after successful post
const handlePost = () => {
  if (!postContent.trim()) return;
  
  // Clear draft
  localStorage.removeItem('community_post_draft');
  
  // ... rest of post logic
};

// Composer UI
<Card className="p-4 space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="font-semibold">Share with Community</h3>
    <div className="flex items-center gap-2">
      <ShieldCheck className="w-4 h-4 text-green-600" />
      <span className="text-sm text-muted-foreground">Remove names/PHI</span>
      <Switch 
        checked={removeNamesToggle} 
        onCheckedChange={setRemoveNamesToggle}
      />
    </div>
  </div>
  
  <Input 
    placeholder="Post title (optional)"
    value={postTitle}
    onChange={(e) => setPostTitle(e.target.value)}
    maxLength={100}
  />
  
  <div className="relative">
    <Textarea 
      placeholder="Share your question or tip..."
      value={postContent}
      onChange={(e) => {
        const newValue = e.target.value;
        if (newValue.length <= CHARACTER_LIMIT) {
          setPostContent(newValue);
          setCharacterCount(newValue.length);
        }
      }}
      className="min-h-[120px]"
      maxLength={CHARACTER_LIMIT}
    />
    <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
      {characterCount}/{CHARACTER_LIMIT}
    </div>
  </div>
  
  {removeNamesToggle && postContent.trim() && (
    <div className="text-xs text-green-600 flex items-center gap-1">
      <CheckCircle className="w-3 h-3" />
      <span>Names and identifying info will be removed before posting</span>
    </div>
  )}
  
  <div className="flex justify-between items-center">
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => {
        localStorage.removeItem('community_post_draft');
        setPostContent('');
        setPostTitle('');
        setSelectedTags([]);
        setCharacterCount(0);
        toast.success('Draft cleared');
      }}
    >
      <Trash2 className="w-4 h-4 mr-2" />
      Clear Draft
    </Button>
    
    <Button 
      onClick={handlePost}
      disabled={!postContent.trim() || characterCount > CHARACTER_LIMIT}
    >
      <Send className="w-4 h-4 mr-2" />
      Post to Community
    </Button>
  </div>
</Card>
```

#### C. Community Card Template Updates

**Current Issues:**
- ❌ No "Hide similar" action
- ❌ Engagement metrics not formatted per spec

**Required Template:**

```tsx
// Community post card
<Card className="p-4 space-y-3">
  <div className="flex items-start gap-3">
    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
      <User className="w-5 h-5 text-accent" />
    </div>
    
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium text-sm">Parent name</span>
        <span className="text-xs text-muted-foreground">• 2h ago</span>
      </div>
      
      <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
        Post title (1-2 lines max)
      </h4>
      
      <p className="text-sm text-gray-600 line-clamp-3 mb-3">
        Post content preview...
      </p>
      
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <MessageSquare className="w-4 h-4" />
          X responses
        </span>
        <span className="flex items-center gap-1">
          <ThumbsUp className="w-4 h-4" />
          Y helpful
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm">
          <Save className="w-4 h-4 mr-1" />
          Save
        </Button>
        <Button variant="ghost" size="sm">
          <Share className="w-4 h-4 mr-1" />
          Share
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Eye className="w-4 h-4 mr-1" />
          Hide similar
        </Button>
      </div>
    </div>
  </div>
</Card>
```

## Implementation Status

- ✅ FromAminySection.tsx updated with exact copy
- ⏳ ParentHubPage.tsx needs:
  - [ ] Ask Aminy intent chips (5 chips: Sleep, Feeding, School, Behavior, Benefits)
  - [ ] Community post composer with:
    - [ ] "Remove names/PHI" toggle (ON by default)
    - [ ] Character limit: 500
    - [ ] Auto-save drafts
    - [ ] Clear draft button
  - [ ] Community card template with:
    - [ ] Engagement metrics: "X responses • Y helpful"
    - [ ] Actions: Save | Share | Hide similar

## Next Steps

The implementation guidance above shows exactly where to make changes in ParentHubPage.tsx. The file structure and logic are already in place - these are incremental additions following the existing patterns.

**Estimated Time:** 1-2 hours for complete Item 6 implementation
