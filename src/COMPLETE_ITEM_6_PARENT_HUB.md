# Item 6: Parent Hub + Community - Complete Implementation

## ✅ STATUS: FromAminySection COMPLETE

**File:** `/components/FromAminySection.tsx` - Updated with exact 3-card copy

## 🔄 REMAINING: ParentHubPage.tsx Updates

### Required Changes

#### 1. Ask Aminy Intent Chips
Add after welcome strip in `renderHubHome()`:

```tsx
// Add this constant near the top with other data
const intentChips = [
  { id: 'sleep', label: 'Sleep', icon: Moon, color: 'bg-indigo-100 text-indigo-700' },
  { id: 'feeding', label: 'Feeding', icon: Utensils, color: 'bg-amber-100 text-amber-700' },
  { id: 'school', label: 'School', icon: School, color: 'bg-blue-100 text-blue-700' },
  { id: 'behavior', label: 'Behavior', icon: Activity, color: 'bg-green-100 text-green-700' },
  { id: 'benefits', label: 'Benefits', icon: DollarSign, color: 'bg-purple-100 text-purple-700' }
];

// Add this component after renderWelcomeStrip() in renderHubHome():
const renderAskAminyIntents = () => (
  <Card className="p-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-900">Ask Aminy</h3>
      <span className="text-xs text-muted-foreground">Quick topics</span>
    </div>
    <div className="flex gap-2 overflow-x-auto pb-2">
      {intentChips.map((chip) => {
        const Icon = chip.icon;
        return (
          <Button
            key={chip.id}
            variant="outline"
            size="sm"
            onClick={() => {
              toast.info(`Opening Ask Aminy with ${chip.label} topic...`);
              // In production: navigate to Ask Aminy with pre-filled topic
            }}
            className={`flex items-center gap-2 whitespace-nowrap ${chip.color} hover:shadow-md transition-all`}
          >
            <Icon className="w-4 h-4" />
            {chip.label}
          </Button>
        );
      })}
    </div>
  </Card>
);
```

#### 2. Community Post Composer Updates

Replace the current post composer in `renderAskShare()` with:

```tsx
const renderAskShare = () => {
  // Auto-save draft effect
  useEffect(() => {
    if (postContent.trim() || postTitle.trim()) {
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
        if (hoursSinceSave < 24) {
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

  const handlePost = () => {
    if (!postContent.trim()) return;
    
    // Clear draft
    localStorage.removeItem('community_post_draft');
    
    toast.success('Your post has been shared with the community!');
    setPostContent('');
    setPostTitle('');
    setSelectedTags([]);
    setCharacterCount(0);
    setActiveView('home');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">Share with Community</h2>
      
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">New Post</h3>
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${removeNamesToggle ? 'text-green-600' : 'text-gray-400'}`} />
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
            className="min-h-[120px] pr-16"
            maxLength={CHARACTER_LIMIT}
          />
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {characterCount}/{CHARACTER_LIMIT}
          </div>
        </div>
        
        {removeNamesToggle && postContent.trim() && (
          <div className="text-xs text-green-600 flex items-center gap-1 bg-green-50 p-2 rounded">
            <CheckCircle className="w-3 h-3" />
            <span>Names and identifying info will be removed before posting</span>
          </div>
        )}
        
        <div className="flex justify-between items-center pt-2 border-t">
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
    </div>
  );
};
```

#### 3. Community Card Template Updates

Update `renderCommunityHighlights()` to use new template:

```tsx
const renderCommunityHighlights = () => (
  <Card className="p-6">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">Community Highlights</h3>
    <div className="space-y-4">
      {communityHighlights.slice(0, 4).map((post) => (
        <Card key={post.id} className="p-4 hover:shadow-md transition-all">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-accent" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-gray-900">{post.author}</span>
                <span className="text-xs text-muted-foreground">• {post.timeAgo}</span>
              </div>
              
              <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                {post.content}
              </h4>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  {post.comments} responses
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-4 h-4" />
                  {post.likes} helpful
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleSave(post.id)}>
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleAddToPlan(post)}>
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
      ))}
    </div>
  </Card>
);
```

### Implementation Location

In `renderHubHome()`, update to:

```tsx
const renderHubHome = () => (
  <div className="space-y-6">
    {renderWelcomeStrip()}
    {renderAskAminyIntents()} {/* ADD THIS LINE */}
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {renderCommunityHighlights()}
        {renderExpertPicks()}
      </div>
      
      <div className="space-y-6">
        {renderUpcomingEvents()}
        {renderQuickActions()}
        {renderCommunityStats()}
      </div>
    </div>
  </div>
);
```

## ✅ Completion Criteria

- [x] FromAminySection updated with 3-card exact copy
- [ ] Ask Aminy intent chips added (5 chips: Sleep, Feeding, School, Behavior, Benefits)
- [ ] Community post composer with Remove names/PHI toggle (ON by default)
- [ ] Character limit: 500 with counter display
- [ ] Auto-save drafts to localStorage
- [ ] Clear draft button
- [ ] Community card template with engagement metrics
- [ ] Actions: Save | Share | Hide similar

## Next Item

After completing Item 6, proceed to **Item 7: BCBA/RBT Notes** (HIGH PRIORITY)

**Estimated Time:** 1-2 hours to complete Item 6
