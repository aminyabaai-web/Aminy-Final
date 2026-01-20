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
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">For you</h3>
      
      {posts.map((post) => (
        <Card key={post.id} className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <BookOpen className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900 mb-1">{post.title}</h4>
              <p className="text-sm text-muted-foreground mb-2">{post.summary}</p>
              <p className="text-xs text-accent italic">
                Why this for you: {post.whyForYou}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => onSave(post.id)}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => onShare(post.id)}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onHide(post.id)}>
              <EyeOff className="w-4 h-4 mr-2" />
              Hide similar
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
