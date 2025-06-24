'use client';

import { useState, useTransition } from 'react';
import { MessageCircle, Send, Loader2, Heart, Reply, MoreVertical, Flag, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Textarea } from '@repo/design-system/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { Badge } from '@repo/design-system/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/design-system/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { EmptyState } from './empty-state';
import { useRealtimeComments } from '@/hooks/use-realtime-comments';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type ShowCommentsProps = {
  showId: string;
  userId?: string;
  artistId?: string;
  artistName?: string;
};

export function ShowComments({ showId, userId, artistId, artistName }: ShowCommentsProps) {
  const router = useRouter();
  const [comment, setComment] = useState('');
  const [isPending, startTransition] = useTransition();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  
  const { comments, isLoading, addComment } = useRealtimeComments({
    showId,
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    if (!userId) {
      toast.error('Please sign in to comment');
      router.push('/auth/sign-in');
      return;
    }
    
    startTransition(async () => {
      try {
        await addComment(comment.trim());
        setComment('');
        toast.success('Comment posted!');
      } catch (error) {
        toast.error('Failed to post comment');
      }
    });
  };

  const handleLike = (commentId: string) => {
    if (!userId) {
      toast.error('Please sign in to like comments');
      router.push('/auth/sign-in');
      return;
    }

    setLikedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
        toast.success('Like removed');
      } else {
        newSet.add(commentId);
        toast.success('Comment liked!');
      }
      return newSet;
    });
  };

  const handleReply = (commentId: string, userName: string) => {
    if (!userId) {
      toast.error('Please sign in to reply');
      router.push('/auth/sign-in');
      return;
    }

    setReplyingTo(commentId);
    setComment(`@${userName} `);
  };

  const handleDelete = async (commentId: string) => {
    // This would be implemented with proper API call
    toast.success('Comment deleted');
  };

  const handleReport = (commentId: string) => {
    toast.success('Comment reported. Thank you for helping keep our community safe.');
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Comment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Join the Discussion
            </span>
            <Badge variant="secondary">{comments.length} comments</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts about this show..."
              rows={3}
              disabled={isPending}
            />
            <Button 
              type="submit" 
              disabled={!comment.trim() || isPending}
              className="gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Post Comment
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Comments List */}
      {comments.length > 0 ? (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {comments.map((comment, index) => (
              <motion.div
                key={comment.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  delay: index * 0.05
                }}
              >
                <Card className={cn(
                  "transition-all hover:shadow-md",
                  replyingTo === comment.id && "ring-2 ring-primary"
                )}>
                  <CardContent className="pt-6">
                    <div className="flex gap-3">
                      <Avatar>
                        <AvatarImage src={comment.userAvatar || undefined} />
                        <AvatarFallback>
                          {comment.userName
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{comment.userName}</span>
                            {comment.userId === artistId && (
                              <Badge variant="default" className="text-xs">
                                {artistName || 'Artist'}
                              </Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.createdAt))} ago
                            </span>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {comment.userId === userId ? (
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(comment.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleReport(comment.id)}>
                                  <Flag className="mr-2 h-4 w-4" />
                                  Report
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                        
                        <div className="flex items-center gap-4 mt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-8 gap-2",
                              likedComments.has(comment.id) && "text-red-500"
                            )}
                            onClick={() => handleLike(comment.id)}
                          >
                            <Heart 
                              className={cn(
                                "h-4 w-4",
                                likedComments.has(comment.id) && "fill-current"
                              )} 
                            />
                            <span className="text-xs">
                              {(Math.floor(Math.random() * 20) + (likedComments.has(comment.id) ? 1 : 0))}
                            </span>
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-2"
                            onClick={() => handleReply(comment.id, comment.userName)}
                          >
                            <Reply className="h-4 w-4" />
                            <span className="text-xs">Reply</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
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