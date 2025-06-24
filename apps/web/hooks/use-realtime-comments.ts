'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  showId: string;
  userName: string;
  userAvatar: string | null;
}

interface UseRealtimeCommentsOptions {
  showId: string;
  onCommentAdded?: (comment: Comment) => void;
  onCommentDeleted?: (commentId: string) => void;
}

export function useRealtimeComments({ 
  showId,
  onCommentAdded,
  onCommentDeleted
}: UseRealtimeCommentsOptions) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/comments?showId=${showId}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [showId]);

  // Add comment
  const addComment = useCallback(async (content: string) => {
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ showId, content }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.comment;
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }, [showId]);

  useEffect(() => {
    // Initial fetch
    fetchComments();

    // Subscribe to comment changes
    const channel = supabase
      .channel(`show-comments-${showId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'show_comments',
          filter: `show_id=eq.${showId}`,
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            // Fetch user info for the new comment
            const { data: userData } = await supabase
              .from('users')
              .select('name, avatar_url')
              .eq('id', payload.new.user_id)
              .single();

            const newComment: Comment = {
              id: payload.new.id,
              content: payload.new.content,
              createdAt: payload.new.created_at,
              userId: payload.new.user_id,
              showId: payload.new.show_id,
              userName: userData?.name || 'Unknown User',
              userAvatar: userData?.avatar_url || null,
            };

            setComments(prev => [newComment, ...prev]);
            onCommentAdded?.(newComment);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setComments(prev => prev.filter(comment => comment.id !== payload.old.id));
            onCommentDeleted?.(payload.old.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showId, supabase, fetchComments, onCommentAdded, onCommentDeleted]);

  return {
    comments,
    isLoading,
    addComment,
    refetch: fetchComments,
  };
}