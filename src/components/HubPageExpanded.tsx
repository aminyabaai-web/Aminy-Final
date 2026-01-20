import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Sparkles, 
  Heart, 
  ThumbsUp,
  MessageCircle,
  Search,
  Filter,
  BookOpen,
  Video,
  FileText,
  TrendingUp,
  Clock,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';

interface HubPageExpandedProps {
  userData: {
    parentName: string;
    childName: string;
  };
  weekProgress?: string[];
}

interface DailyTip {
  id: string;
  title: string;
  content: string;
  category: string;
  readTime: string;
}

interface ParentStory {
  id: string;
  author: string;
  content: string;
  likes: number;
  replies: number;
  timestamp: string;
  tags: string[];
}

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'printable';
  url: string;
  duration?: string;
  aiSuggested?: boolean;
}

export function HubPageExpanded({ userData, weekProgress = [] }: HubPageExpandedProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const dailyTips: DailyTip[] = [
    {
      id: '1',
      title: 'Visual Cues for Morning Success',
      content: 'Use a picture schedule to help your child anticipate each step. Place it at eye level and review together each morning. Consistency builds calm.',
      category: 'Morning Routines',
      readTime: '2 min'
    },
    {
      id: '2',
      title: 'The Power of First-Then Language',
      content: '"First brush teeth, then iPad time." This simple ABA strategy helps children understand sequence and builds motivation through clear expectations.',
      category: 'Communication',
      readTime: '1 min'
    },
    {
      id: '3',
      title: 'Transition Warnings Work',
      content: 'Give a 5-minute warning before transitions. Use a timer your child can see. This reduces surprise and helps the brain prepare for change.',
      category: 'Transitions',
      readTime: '2 min'
    },
    {
      id: '4',
      title: 'Positive Reinforcement Basics',
      content: 'Catch your child being good! Specific praise ("I love how you used gentle hands!") is more effective than general ("Good job!").',
      category: 'Behavior',
      readTime: '1 min'
    },
    {
      id: '5',
      title: 'Calm-Down Corner Setup',
      content: 'Create a designated calm space with soft lighting, sensory items, and visual emotion charts. Make it inviting, not a punishment.',
      category: 'Calm Games',
      readTime: '2 min'
    }
  ];

  const parentStories: ParentStory[] = [
    {
      id: '1',
      author: 'Sarah M.',
      content: 'We had our first successful grocery trip in months! Used the visual schedule from Aminy and gave 5-minute warnings before each aisle transition. My son stayed calm the whole time. Feeling so proud! 🎉',
      likes: 47,
      replies: 12,
      timestamp: '2 hours ago',
      tags: ['morning routines', 'success story']
    },
    {
      id: '2',
      author: 'Michael T.',
      content: 'Anyone else struggling with bedtime? We\'ve tried everything but my daughter still fights sleep every night. Open to any suggestions from this amazing community.',
      likes: 23,
      replies: 31,
      timestamp: '5 hours ago',
      tags: ['bedtime', 'seeking advice']
    },
    {
      id: '3',
      author: 'Jennifer K.',
      content: 'Just wanted to share: the "First-Then" strategy has been a game changer for us. Started using it consistently 2 weeks ago and transitions are SO much smoother. Thank you to everyone who suggested this! 💙',
      likes: 89,
      replies: 18,
      timestamp: '1 day ago',
      tags: ['communication', 'transitions', 'win']
    },
    {
      id: '4',
      author: 'David L.',
      content: 'Reminder to all parents here: Progress isn\'t linear. We had 3 amazing days, then a rough morning today. That\'s okay. We\'re learning and growing together. Keep going! 💪',
      likes: 134,
      replies: 24,
      timestamp: '1 day ago',
      tags: ['encouragement', 'mindset']
    },
    {
      id: '5',
      author: 'Emily R.',
      content: 'The Aminy Jr speech game has been incredible for my non-verbal son. He\'s attempting words he never tried before! Has anyone else seen progress with the speech activities?',
      likes: 56,
      replies: 15,
      timestamp: '2 days ago',
      tags: ['aminy jr', 'speech', 'communication']
    }
  ];

  const resources: Resource[] = [
    {
      id: '1',
      title: 'Understanding Positive Reinforcement in ABA',
      description: 'A comprehensive guide to using reinforcement effectively at home',
      type: 'article',
      url: '#',
      aiSuggested: true
    },
    {
      id: '2',
      title: 'Visual Schedule Setup Tutorial',
      description: 'Step-by-step video on creating and implementing visual schedules',
      type: 'video',
      url: '#',
      duration: '8 min',
      aiSuggested: true
    },
    {
      id: '3',
      title: 'Printable Emotion Cards',
      description: 'Free download: 20 emotion flashcards with calming strategies',
      type: 'printable',
      url: '#',
      aiSuggested: false
    },
    {
      id: '4',
      title: 'Morning Routine Checklist Template',
      description: 'Customizable checklist for building consistent morning routines',
      type: 'printable',
      url: '#',
      aiSuggested: weekProgress.includes('morning routines')
    },
    {
      id: '5',
      title: 'Managing Meltdowns: A Parent\'s Guide',
      description: 'Evidence-based strategies for de-escalating difficult moments',
      type: 'article',
      url: '#',
      aiSuggested: false
    },
    {
      id: '6',
      title: 'Bedtime Routine Success Stories',
      description: 'Real families share what worked for their bedtime struggles',
      type: 'video',
      url: '#',
      duration: '12 min',
      aiSuggested: weekProgress.includes('bedtime')
    }
  ];

  const filters = [
    'all',
    'morning routines',
    'communication',
    'calm games',
    'transitions',
    'bedtime'
  ];

  const handleLike = (storyId: string) => {
    toast.success('Thanks for the encouragement! 💙');
  };

  const handleShare = (itemTitle: string) => {
    toast.success('Link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">Hub</h1>
          <p className="text-slate-600">Connect, learn, and grow together</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* AI Nudge Banner */}
        {weekProgress.length > 0 && (
          <Card className="mb-6 p-4 bg-gradient-to-r from-accent/10 to-teal-50 border-accent/20">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-accent mt-0.5" />
              <div>
                <p className="font-medium text-slate-900 mb-1">
                  New tip based on your week's progress
                </p>
                <p className="text-sm text-slate-600">
                  We noticed you're working on {weekProgress[0]}. Check out today's tip for personalized guidance.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Search & Filter */}
        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search tips, stories, and resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-12"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="absolute right-1 top-1/2 -translate-y-1/2"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
              {filters.map(filter => (
                <Badge
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`cursor-pointer ${
                    selectedFilter === filter
                      ? 'bg-accent text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {filter}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tips" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tips">Daily Tips</TabsTrigger>
            <TabsTrigger value="stories">Parent Stories</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          {/* Daily Tips Tab */}
          <TabsContent value="tips" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-600">
                {dailyTips.length} micro-lessons available
              </p>
              <Badge variant="outline">Updated daily</Badge>
            </div>

            {dailyTips.map(tip => (
              <Card key={tip.id} className="p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-accent/10 text-accent border-accent/20">
                        {tip.category}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {tip.readTime}
                      </div>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">{tip.title}</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{tip.content}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Heart className="w-4 h-4" />
                    Helpful
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* Parent Stories Tab */}
          <TabsContent value="stories" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-600">
                Join a supportive community of parents
              </p>
              <Button size="sm" className="bg-accent hover:bg-accent/90">
                + Share Your Story
              </Button>
            </div>

            {/* Community Guidelines */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Safe, Gentle Community
                  </p>
                  <p className="text-xs text-blue-700">
                    Encourage, don't compare. Share wins and struggles. All posts are moderated for kindness.
                  </p>
                </div>
              </div>
            </Card>

            {parentStories.map(story => (
              <Card key={story.id} className="p-5 hover:shadow-md transition-all">
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-accent to-teal-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {story.author.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">{story.author}</span>
                      <span className="text-xs text-slate-500">{story.timestamp}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed mb-3">
                      {story.content}
                    </p>
                    
                    {story.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {story.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleLike(story.id)}
                        className="gap-2 h-8 px-3"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>{story.likes}</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2 h-8 px-3">
                        <MessageCircle className="w-4 h-4" />
                        <span>{story.replies}</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2 h-8 px-3">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-4">
            {/* AI Suggested Section */}
            {resources.filter(r => r.aiSuggested).length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold text-slate-900">Suggested for You</h3>
                  <Badge className="bg-accent/10 text-accent border-accent/20">
                    AI Powered
                  </Badge>
                </div>

                <div className="space-y-3">
                  {resources.filter(r => r.aiSuggested).map(resource => (
                    <ResourceCard key={resource.id} resource={resource} onShare={handleShare} />
                  ))}
                </div>
              </div>
            )}

            {/* All Resources */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">All Resources</h3>
              <div className="space-y-3">
                {resources.filter(r => !r.aiSuggested).map(resource => (
                  <ResourceCard key={resource.id} resource={resource} onShare={handleShare} />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Resource Card Component
function ResourceCard({ 
  resource, 
  onShare 
}: { 
  resource: Resource; 
  onShare: (title: string) => void;
}) {
  const getIcon = () => {
    switch (resource.type) {
      case 'article':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'video':
        return <Video className="w-5 h-5 text-purple-600" />;
      case 'printable':
        return <BookOpen className="w-5 h-5 text-green-600" />;
    }
  };

  const getTypeColor = () => {
    switch (resource.type) {
      case 'article':
        return 'bg-blue-50 border-blue-200';
      case 'video':
        return 'bg-purple-50 border-purple-200';
      case 'printable':
        return 'bg-green-50 border-green-200';
    }
  };

  return (
    <Card className={`p-4 hover:shadow-md transition-all ${resource.aiSuggested ? 'border-accent/30 bg-accent/5' : ''}`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-lg ${getTypeColor()} flex items-center justify-center flex-shrink-0`}>
          {getIcon()}
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">{resource.title}</h4>
              <p className="text-sm text-slate-600">{resource.description}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <Badge variant="outline" className="capitalize">
                {resource.type}
              </Badge>
              {resource.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {resource.duration}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onShare(resource.title)}
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button size="sm" className="bg-accent hover:bg-accent/90">
                View
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
