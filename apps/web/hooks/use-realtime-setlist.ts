'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/app/providers/auth-provider';

interface VoteUpdate {
  songId: string;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  userVote?: 'up' | 'down' | null;
}

interface SetlistSong {
  id: string;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  userVote?: 'up' | 'down' | null;
  [key: string]: any;
}

interface UseRealtimeSetlistProps {
  setlistId: string;
  initialSongs: SetlistSong[];
}

export function useRealtimeSetlist({ setlistId, initialSongs }: UseRealtimeSetlistProps) {
  const { user } = useAuth();
  const [songs, setSongs] = useState<SetlistSong[]>(initialSongs);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!user || !setlistId) return;

    try {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new EventSource connection
      const eventSource = new EventSource(
        `/api/votes/realtime?setlistId=${encodeURIComponent(setlistId)}`
      );

      eventSource.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        console.log('Real-time connection established');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'connected':
              console.log('Connected to setlist:', data.setlistId);
              break;

            case 'vote_update':
              // Update vote counts for specific song
              setSongs(prev => prev.map(song => {
                if (song.id === data.payload.setlist_song_id) {
                  return {
                    ...song,
                    upvotes: data.payload.upvotes || song.upvotes,
                    downvotes: data.payload.downvotes || song.downvotes,
                    netVotes: (data.payload.upvotes || song.upvotes) - (data.payload.downvotes || song.downvotes),
                    userVote: data.payload.user_id === user.id ? data.payload.vote_type : song.userVote
                  };
                }
                return song;
              }));
              break;

            case 'setlist_update':
              // Handle setlist changes (songs added/removed/reordered)
              console.log('Setlist updated:', data.payload);
              // You could refetch the full setlist here if needed
              break;

            case 'ping':
              // Keep-alive ping, no action needed
              break;

            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          
          setConnectionError(`Connection lost. Reconnecting in ${delay / 1000}s... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setConnectionError('Unable to establish real-time connection. Please refresh the page.');
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('Error creating EventSource:', error);
      setConnectionError('Failed to connect to real-time updates');
    }
  }, [user, setlistId]);

  // Connect when component mounts or dependencies change
  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  // Optimistically update votes locally before server confirms
  const optimisticVote = useCallback((songId: string, voteType: 'up' | 'down' | null) => {
    setSongs(prev => prev.map(song => {
      if (song.id === songId) {
        const currentVote = song.userVote;
        let newUpvotes = song.upvotes;
        let newDownvotes = song.downvotes;

        // Remove previous vote
        if (currentVote === 'up') {
          newUpvotes--;
        } else if (currentVote === 'down') {
          newDownvotes--;
        }

        // Add new vote
        if (voteType === 'up') {
          newUpvotes++;
        } else if (voteType === 'down') {
          newDownvotes++;
        }

        return {
          ...song,
          upvotes: Math.max(0, newUpvotes),
          downvotes: Math.max(0, newDownvotes),
          netVotes: newUpvotes - newDownvotes,
          userVote: voteType
        };
      }
      return song;
    }));
  }, []);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setConnectionError(null);
    connect();
  }, [connect]);

  return {
    songs,
    isConnected,
    connectionError,
    optimisticVote,
    reconnect
  };
}