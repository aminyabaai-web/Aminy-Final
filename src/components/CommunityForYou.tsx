import React from 'react';
import { BookOpen, Save, Share2, EyeOff } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface CommunityPost {
  id: string;
  title: string;
  summary: string;
  whyForYou: string;
  readTime: number;
}

interface CommunityForYouProps {
  posts: CommunityPost[];
  onSave: (postId: string) => void;
  onShare: (postId: string) => void;
  onHide: (postId: string) => void;
}

export function CommunityForYou({ posts, onSave, onShare, onHide }: CommunityForYouProps) {
  // Empty state when no posts
  if (!posts || posts.length === 0) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-lg font-semibold">For you</h3>
        <Card className="p-6 sm:p-8 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <h4 className="font-medium text-slate-900 dark:text-white mb-2">
            Personalized content coming soon
          </h4>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            As you use Aminy, we'll curate articles and resources tailored to your family's journey.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <h3 className="text-lg font-semibold">For you</h3>

      {posts.map((post) => (
        <Card key={post.id} className="p-3 sm:p-4">
          <div className="flex items-start gap-3 mb-3">
            <BookOpen className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{post.title}</h4>
              <p className="text-sm text-muted-foreground mb-2">{post.summary}</p>
              <p className="text-xs text-accent italic">
                Why this for you: {post.whyForYou}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{post.readTime} min read</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSave(post.id)}
              aria-label={`Save article: ${post.title}`}
              className="min-h-[44px] hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <Save className="w-4 h-4 mr-2" aria-hidden="true" />
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onShare(post.id)}
              aria-label={`Share article: ${post.title}`}
              className="min-h-[44px] hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <Share2 className="w-4 h-4 mr-2" aria-hidden="true" />
              Share
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onHide(post.id)}
              aria-label={`Hide similar articles to: ${post.title}`}
              className="min-h-[44px] hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <EyeOff className="w-4 h-4 mr-2" aria-hidden="true" />
              Hide similar
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
