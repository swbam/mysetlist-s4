'use client';

import { useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Textarea } from '@repo/design-system/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { EmptyState } from './empty-state';

type ShowCommentsProps = {
  showId: string;
};

export function ShowComments({ showId }: ShowCommentsProps) {
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  
  // This would be replaced with actual comment fetching and posting
  const mockComments = [
    {
      id: '1',
      user: {
        name: 'John Doe',
        avatar_url: null,
      },
      content: 'Amazing show! The energy was incredible.',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '2',
      user: {
        name: 'Jane Smith',
        avatar_url: null,
      },
      content: 'Best concert I\'ve been to this year. The encore was perfect!',
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ];
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    // Add comment logic here
    setComment('');
  };
  
  return (
    <div className="space-y-6">
      {/* Comment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Join the Discussion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts about this show..."
              rows={3}
            />
            <Button 
              type="submit" 
              disabled={!comment.trim()}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Post Comment
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Comments List */}
      {mockComments.length > 0 ? (
        <div className="space-y-4">
          {mockComments.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Avatar>
                    <AvatarImage src={comment.user.avatar_url || undefined} />
                    <AvatarFallback>
                      {comment.user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{comment.user.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at))} ago
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={MessageCircle}
          title="No comments yet"
          description="Be the first to share your thoughts about this show"
        />
      )}
    </div>
  );
}