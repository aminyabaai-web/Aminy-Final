import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { ReportsHub } from './ReportsHub';
import { 
  Users, 
  MessageSquare, 
  Heart, 
  Star, 
  Calendar,
  BookOpen,
  Coffee,
  Video,
  ChevronRight,
  User,
  Bell,
  ArrowLeft,
  Plus,
  Search,
  Save,
  Share,
  Flag,
  MapPin,
  Play,
  Download,
  FileText,
  Send,
  ThumbsUp,
  Eye,
  FileImage,
  Paperclip,
  MoreHorizontal,
  Clock,
  CheckCircle,
  AlertCircle,
  Globe,
  Zap,
  Moon,
  Utensils,
  School,
  Activity,
  DollarSign,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface ParentHubPageProps {
  onNavigate?: (destination: string) => void;
  userTier: string;
}

export function ParentHubPage({ onNavigate, userTier }: ParentHubPageProps) {
  const [activeView, setActiveView] = useState('home');
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [removeNamesToggle, setRemoveNamesToggle] = useState(true); // ON by default
  const [showAnonymous, setShowAnonymous] = useState(false); // Missing state variable
  const [searchQuery, setSearchQuery] = useState('');
  const [characterCount, setCharacterCount] = useState(0);
  const CHARACTER_LIMIT = 500;
  
  // Get auth and child info for reports
  const accessToken = typeof window !== 'undefined' 
    ? localStorage.getItem('access_token') || undefined 
    : undefined;
  const currentChildId = typeof window !== 'undefined'
    ? localStorage.getItem('current_child_id') || 'child-1'
    : 'child-1';
  const currentChildName = typeof window !== 'undefined'
    ? localStorage.getItem('current_child_name') || 'your child'
    : 'your child';

  // Mock data for Hub Home
  const communityHighlights = [
    {
      id: 1,
      author: 'Sarah M.',
      avatar: 'SM',
      content: 'Our bedtime routine finally clicked—visual schedule did the trick.',
      likes: 12,
      saves: 8,
      comments: 5,
      timeAgo: '2 hours ago',
      tag: 'Routines',
      type: 'parent-tip',
      isHelpful: true
    },
    {
      id: 2,
      author: 'Mike K.',
      avatar: 'MK',
      content: 'Noise-canceling tip for grocery runs that cut meltdowns in half.',
      likes: 18,
      saves: 15,
      comments: 9,
      timeAgo: '4 hours ago',
      tag: 'Sensory',
      type: 'parent-tip',
      isHelpful: true
    },
    {
      id: 3,
      author: 'Dr. Lisa Chen',
      avatar: 'LC',
      content: 'Understanding your child\'s sensory needs is key to building effective routines.',
      likes: 34,
      saves: 28,
      comments: 12,
      timeAgo: '6 hours ago',
      tag: 'Communication',
      type: 'expert-insight',
      isProfessional: true
    },
    {
      id: 4,
      author: 'AI Helper',
      avatar: 'AI',
      content: 'Based on your Plan: Try using timers for transitions - families report 70% success rate.',
      likes: 25,
      saves: 22,
      comments: 3,
      timeAgo: '1 hour ago',
      tag: 'Routines',
      type: 'from-plan',
      isAI: true
    }
  ];

  const upcomingEvents = [
    {
      id: 1,
      title: 'Virtual Support Group',
      description: 'Weekly check-in with other families',
      time: 'Today, 7:00 PM',
      spots: '3 spots left',
      type: 'virtual',
      action: 'Join'
    },
    {
      id: 2,
      title: 'Sensory Play Workshop', 
      description: 'DIY sensory activities workshop',
      time: 'Tomorrow, 10:00 AM',
      spots: 'Join waitlist',
      type: 'virtual',
      action: 'Join waitlist'
    },
    {
      id: 3,
      title: 'Coffee & Connection',
      description: 'Local parent meetup',
      time: 'Saturday, 9:00 AM',
      spots: '8 spots left',
      type: 'local',
      action: 'Join'
    }
  ];

  const expertPicks = [
    {
      id: 1,
      title: 'Understanding Sensory Processing',
      description: 'Complete guide for parents',
      type: 'Article',
      duration: '8-min',
      icon: <FileText className="w-4 h-4" />,
      category: 'Start Here'
    },
    {
      id: 2,
      title: 'Building Morning Routines',
      description: 'Step-by-step video guide',
      type: 'Video',
      duration: '12-min',
      icon: <Play className="w-4 h-4" />,
      category: 'Routines & Daily Living'
    },
    {
      id: 3,
      title: 'Communication Strategies',
      description: 'Daily scripts and techniques',
      type: 'Printable',
      duration: '15-min',
      icon: <Download className="w-4 h-4" />,
      category: 'Communication & Speech'
    }
  ];

  const tags = ['Routines', 'Sensory', 'Communication', 'School', 'Community', 'Self-care'];

  const expertLibraryShelves = [
    {
      id: 'start-here',
      title: 'Start Here',
      description: '5 essential resources for new families',
      count: 5,
      resources: [
        { title: 'First Steps Guide', type: 'Article', duration: '10-min', level: 'Beginner' },
        { title: 'Understanding Your Child', type: 'Video', duration: '15-min', level: 'Beginner' },
        { title: 'Building Routines', type: 'Guide', duration: '12-min', level: 'Practical' }
      ]
    },
    {
      id: 'communication',
      title: 'Communication & Speech',
      description: 'Tools and strategies for better communication',
      count: 12,
      resources: []
    },
    {
      id: 'sensory',
      title: 'Sensory & Regulation',
      description: 'Understanding and supporting sensory needs',
      count: 8,
      resources: []
    },
    {
      id: 'routines',
      title: 'Routines & Daily Living',
      description: 'Building structure and independence',
      count: 15,
      resources: []
    },
    {
      id: 'school',
      title: 'School & IEP Basics',
      description: 'Navigating educational systems',
      count: 9,
      resources: []
    }
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : prev.length < 3 ? [...prev, tag] : prev
    );
  };

  const handlePost = () => {
    if (!postContent.trim()) return;
    // Simulate posting to community
    
    // Show success message
    toast.success('Your post has been shared with the community!');
    
    // Clear form
    setPostContent('');
    setPostTitle('');
    setSelectedTags([]);
    setShowAnonymous(false);
    setActiveView('home');
  };

  const handleLike = (postId: number) => {
    toast.success('Marked as helpful!');
  };

  const handleSave = (postId: number) => {
    toast.success('Saved to your collection!');
  };

  const handleAddToPlan = (item: any) => {
    toast.success('Added to your Plan!');
  };

  const handleJoinEvent = (eventId: number) => {
    toast.success('Event added to your calendar!');
  };

  const handleReport = (postId: number) => {
    toast.success('Thank you for your report. We\'ll review this content.');
  };

  const handleWatchResource = (resourceId: number) => {
    toast.success('Opening resource...');
  };

  const handleDownloadResource = (resourceId: number) => {
    toast.success('Download started!');
  };

  const renderWelcomeStrip = () => (
    <Card className="p-6 bg-gradient-to-r from-accent/5 to-accent/10 border-accent/20">
      <div className="text-center space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Parent Hub — practical support from families and experts.</h2>
        <p className="text-sm text-slate-600">Keep it kind. No medical advice is provided on Aminy.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setActiveView('ask-share')}
            className="bg-white"
          >
            Ask a question
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setActiveView('library')}
            className="bg-white"
          >
            Browse strategies
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setActiveView('events')}
            className="bg-white"
          >
            Find events
          </Button>
        </div>
      </div>
    </Card>
  );

  const renderCommunityHighlights = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Community Highlights</h3>
      <div className="space-y-4">
        {communityHighlights.slice(0, 4).map((post) => (
          <div key={post.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
            <div className="flex items-start space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-medium ${
                post.isProfessional ? 'bg-blue-600' : 
                post.isAI ? 'bg-purple-600' : 
                'bg-slate-600'
              }`}>
                {post.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-slate-900">{post.author}</span>
                  {post.isProfessional && (
                    <Badge variant="secondary" className="text-xs">Expert</Badge>
                  )}
                  {post.isAI && (
                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">AI</Badge>
                  )}
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-500">{post.timeAgo}</span>
                  <Badge variant="outline" className="text-xs">{post.tag}</Badge>
                </div>
                <p className="text-sm text-slate-700 mb-2 line-clamp-2">{post.content}</p>
                <div className="flex items-center space-x-4 text-xs text-slate-500">
                  <button className="flex items-center space-x-1 hover:text-accent transition-colors">
                    <ThumbsUp className="w-3 h-3" />
                    <span>Helpful ({post.likes})</span>
                  </button>
                  <button className="flex items-center space-x-1 hover:text-accent transition-colors">
                    <Save className="w-3 h-3" />
                    <span>Save</span>
                  </button>
                  <button className="flex items-center space-x-1 hover:text-accent transition-colors">
                    <Share className="w-3 h-3" />
                    <span>Share to Plan</span>
                  </button>
                  <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors">
                    <Flag className="w-3 h-3" />
                    <span>Report</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderUpcomingEvents = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Events</h3>
      <div className="space-y-3">
        {upcomingEvents.map((event) => (
          <div key={event.id} className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-medium text-slate-900">{event.title}</h4>
              <div className={`w-2 h-2 rounded-full mt-1 ${
                event.type === 'virtual' ? 'bg-blue-500' : 'bg-green-500'
              }`}></div>
            </div>
            <p className="text-xs text-slate-600 mb-2">{event.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{event.time}</span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500">{event.spots}</span>
                <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                  {event.action}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Button variant="outline" className="w-full mt-4" onClick={() => setActiveView('events')}>
        <Calendar className="w-4 h-4 mr-2" />
        View all events
      </Button>
    </Card>
  );

  const renderExpertPicks = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Expert Picks</h3>
      <div className="space-y-3">
        {expertPicks.map((resource) => (
          <div key={resource.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                {resource.icon}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-medium text-slate-900">{resource.title}</h4>
                <p className="text-xs text-slate-600">{resource.description}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="text-xs">{resource.type}</Badge>
                  <span className="text-xs text-slate-500">({resource.duration})</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-1">
              <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                {resource.type === 'Video' ? 'Watch' : resource.type === 'Printable' ? 'Download' : 'Read'}
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-6 px-2">
                Add to Plan
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderQuickActions = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
      <div className="space-y-3">
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => setActiveView('ask-share')}
        >
          <MessageSquare className="w-4 h-4 mr-3" />
          Ask the Hub
        </Button>
        <Button variant="outline" className="w-full justify-start">
          <MapPin className="w-4 h-4 mr-3" />
          Find Local Groups
        </Button>
        {userTier === 'pro' && (
          <Button 
            variant="outline" 
            className="w-full justify-start border-accent text-accent hover:bg-accent/5"
            onClick={() => onNavigate?.('care')}
          >
            <Zap className="w-4 h-4 mr-3" />
            Message Coach
          </Button>
        )}
      </div>
    </Card>
  );

  const renderCommunityStats = () => (
    <Card className="p-6">
      <div className="text-center space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">Community</h3>
        <div className="text-xs text-slate-600">
          2,800+ members • 150 discussions this month • 40 resources added
        </div>
      </div>
    </Card>
  );

  const renderAskShare = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Post Composer */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Ask & Share</h2>
        <div className="space-y-4">
          <div>
            <Input 
              placeholder="Title (optional but encouraged for questions)"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              className="mb-3"
            />
            <Textarea 
              placeholder="Ask about routines, sensory strategies, communication, school, or share a small win."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="min-h-[100px] resize-vertical"
            />
            <p className="text-xs text-slate-500 mt-1">
              Add context: age, setting, what you tried
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Tags (1-3 required)
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <Button
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleTag(tag)}
                  disabled={selectedTags.length >= 3 && !selectedTags.includes(tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <Paperclip className="w-4 h-4 mr-2" />
              Attach files
            </Button>
            <label className="flex items-center space-x-2 text-sm">
              <input 
                type="checkbox" 
                checked={showAnonymous}
                onChange={(e) => setShowAnonymous(e.target.checked)}
                className="rounded"
              />
              <span>Post anonymously</span>
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-sm">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>Add to my Plan as a note</span>
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-sm">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>Allow expert annotation</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => setActiveView('home')}>
              Cancel
            </Button>
            <Button 
              onClick={handlePost}
              disabled={!postContent.trim() || selectedTags.length === 0}
            >
              <Send className="w-4 h-4 mr-2" />
              Post
            </Button>
          </div>
        </div>
      </Card>

      {/* Community Rules */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="text-sm text-blue-900">
          <strong>Community Guidelines:</strong> Be kind. No diagnoses. No treatments. Report concerns.
        </div>
      </Card>

      {/* Feed */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Recent Discussions</h3>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm">Most Helpful</Button>
            <Button variant="ghost" size="sm">New</Button>
            <Button variant="ghost" size="sm">Saved</Button>
            <Button variant="ghost" size="sm">My Posts</Button>
          </div>
        </div>
        
        <div className="space-y-6">
          {communityHighlights.map((post) => (
            <div key={post.id} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm text-white font-medium ${
                  post.isProfessional ? 'bg-blue-600' : 
                  post.isAI ? 'bg-purple-600' : 
                  'bg-slate-600'
                }`}>
                  {post.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium text-slate-900">{post.author}</span>
                    {post.isProfessional && (
                      <Badge variant="secondary">Expert</Badge>
                    )}
                    <span className="text-slate-500">•</span>
                    <span className="text-sm text-slate-500">{post.timeAgo}</span>
                    <Badge variant="outline">{post.tag}</Badge>
                  </div>
                  <p className="text-slate-700 mb-3">{post.content}</p>
                  <div className="flex items-center space-x-6 text-sm text-slate-500">
                    <button className="flex items-center space-x-1 hover:text-accent transition-colors">
                      <ThumbsUp className="w-4 h-4" />
                      <span>Helpful ({post.likes})</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:text-accent transition-colors">
                      <MessageSquare className="w-4 h-4" />
                      <span>Reply ({post.comments})</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:text-accent transition-colors">
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:text-accent transition-colors">
                      <Share className="w-4 h-4" />
                      <span>Add to Plan</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors">
                      <Flag className="w-4 h-4" />
                      <span>Report</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderExpertLibrary = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Expert Library</h2>
        <div className="flex items-center space-x-2">
          <Input 
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Button variant="outline">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {expertLibraryShelves.map((shelf) => (
          <Card key={shelf.id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{shelf.title}</h3>
                <p className="text-sm text-slate-600">{shelf.description}</p>
              </div>
              <Badge variant="outline">{shelf.count} resources</Badge>
            </div>
            
            {shelf.id === 'start-here' && (
              <div className="grid gap-3">
                {shelf.resources.map((resource, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                        {resource.type === 'Video' ? <Play className="w-4 h-4 text-accent" /> : <FileText className="w-4 h-4 text-accent" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-slate-900">{resource.title}</h4>
                        <div className="flex items-center space-x-2 text-xs text-slate-500">
                          <span>{resource.type}</span>
                          <span>•</span>
                          <span>{resource.duration}</span>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs">{resource.level}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        {resource.type === 'Video' ? 'Watch' : 'Open'}
                      </Button>
                      <Button size="sm" variant="ghost">
                        Add to Plan
                      </Button>
                      {resource.type === 'Guide' && (
                        <Button size="sm" variant="ghost">
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {shelf.id !== 'start-here' && (
              <Button variant="outline" className="w-full">
                View {shelf.title} Resources
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );

  const renderEvents = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">Events</h2>
      
      <Tabs defaultValue="virtual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="virtual">Virtual</TabsTrigger>
          <TabsTrigger value="local">Local</TabsTrigger>
        </TabsList>
        
        <TabsContent value="virtual" className="space-y-4">
          {upcomingEvents.filter(event => event.type === 'virtual').map((event) => (
            <Card key={event.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{event.title}</h3>
                    <Badge variant="outline">Virtual</Badge>
                  </div>
                  <p className="text-slate-600 mb-2">{event.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{event.time}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{event.spots}</span>
                    </span>
                  </div>
                </div>
                <Button>
                  {event.action}
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="local" className="space-y-4">
          {upcomingEvents.filter(event => event.type === 'local').map((event) => (
            <Card key={event.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{event.title}</h3>
                    <Badge variant="outline">In-person</Badge>
                  </div>
                  <p className="text-slate-600 mb-2">{event.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{event.time}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>Central Park playground</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{event.spots}</span>
                    </span>
                  </div>
                </div>
                <Button>
                  {event.action}
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderDocumentVault = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Document Vault</h2>
        <Button variant="outline" onClick={() => onNavigate?.('vault')}>
          Open Full Vault
        </Button>
      </div>
      
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recently saved to your Vault</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h4 className="text-sm font-medium text-slate-900">Session Notes - Week 3</h4>
                <p className="text-xs text-slate-600">Added 2 days ago</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileImage className="w-8 h-8 text-green-600" />
              <div>
                <h4 className="text-sm font-medium text-slate-900">Visual Schedule Template</h4>
                <p className="text-xs text-slate-600">Added 3 days ago</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-purple-600" />
              <div>
                <h4 className="text-sm font-medium text-slate-900">School Letter - IEP Meeting</h4>
                <p className="text-xs text-slate-600">Added 1 week ago</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 Vault files are searchable and can be attached to reports.
          </p>
        </div>
      </Card>
    </div>
  );

  const renderHubHome = () => (
    <div className="space-y-6">
      {renderWelcomeStrip()}
      
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate?.('home')}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-slate-900">Parent Hub</h1>
                    <p className="text-sm text-slate-600">Practical guidance from families and experts—safe, kind, and moderated.</p>
                  </div>
                </div>
              </div>
              
              {/* Navigation Tabs */}
              <div className="hidden md:flex items-center space-x-1">
                <Button
                  variant={activeView === 'home' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('home')}
                >
                  Hub Home
                </Button>
                <Button
                  variant={activeView === 'ask-share' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('ask-share')}
                >
                  Ask & Share
                </Button>
                <Button
                  variant={activeView === 'library' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('library')}
                >
                  Expert Library
                </Button>
                <Button
                  variant={activeView === 'events' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('events')}
                >
                  Events
                </Button>
                <Button
                  variant={activeView === 'vault' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('vault')}
                >
                  Document Vault
                </Button>
                <Button
                  variant={activeView === 'reports' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('reports')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Reports
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <Bell className="w-4 h-4" />
                </Button>
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b border-gray-200">
        <div className="px-4 py-2">
          <div className="flex space-x-1 overflow-x-auto">
            <Button
              variant={activeView === 'home' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('home')}
              className="whitespace-nowrap"
            >
              Home
            </Button>
            <Button
              variant={activeView === 'ask-share' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('ask-share')}
              className="whitespace-nowrap"
            >
              Ask & Share
            </Button>
            <Button
              variant={activeView === 'library' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('library')}
              className="whitespace-nowrap"
            >
              Library
            </Button>
            <Button
              variant={activeView === 'events' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('events')}
              className="whitespace-nowrap"
            >
              Events
            </Button>
            <Button
              variant={activeView === 'vault' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('vault')}
              className="whitespace-nowrap"
            >
              Vault
            </Button>
            <Button
              variant={activeView === 'reports' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('reports')}
              className="whitespace-nowrap"
            >
              Reports
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6 max-w-6xl mx-auto">
        {activeView === 'home' && renderHubHome()}
        {activeView === 'ask-share' && renderAskShare()}
        {activeView === 'library' && renderExpertLibrary()}
        {activeView === 'events' && renderEvents()}
        {activeView === 'vault' && renderDocumentVault()}
        {activeView === 'reports' && (
          <ReportsHub 
            childId={currentChildId}
            childName={currentChildName}
            accessToken={accessToken}
            userTier={userTier}
          />
        )}
      </div>
    </div>
  );
}

export default ParentHubPage;