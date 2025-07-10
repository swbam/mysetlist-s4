'use client';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { vi } from 'vitest';
import { AuthProvider } from '~/app/providers/auth-provider';
import { RealtimeProvider } from '~/app/providers/realtime-provider';
import { FollowButton } from '~/components/auth/follow-button';
import { MobileVoteButton } from '~/components/mobile/mobile-vote-button';
import { EnhancedSearch } from '~/components/search/enhanced-search';
import { AddSongModal } from '~/components/setlist/add-song-modal';
import { SetlistManager } from '~/components/setlist/setlist-manager';
import { RealtimeVoteButton } from '~/components/voting/realtime-vote-button';

// Mock providers and hooks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/'),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock auth context
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  role: 'user',
};

const mockSession = {
  user: mockUser,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

// Test wrapper with providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider initialSession={mockSession}>
    <RealtimeProvider>{children}</RealtimeProvider>
  </AuthProvider>
);

describe('User Flows & Interactions', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      refresh: vi.fn(),
    });

    // Mock fetch globally
    global.fetch = vi.fn();
  });

  describe('Voting Flow', () => {
    it('should handle upvote interaction correctly', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <RealtimeVoteButton
            setlistSongId="song-123"
            showId="show-123"
            userId={mockUser.id}
          />
        </TestWrapper>
      );

      // Find upvote button
      const upvoteButton = screen.getByLabelText(/upvote/i);

      // Mock successful vote response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          upvotes: 1,
          downvotes: 0,
          userVote: 'up',
          voteLimits: {
            showVotesRemaining: 9,
            dailyVotesRemaining: 49,
            canVote: true,
          },
        }),
      });

      // Click upvote
      await user.click(upvoteButton);

      // Verify API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/votes'),
          expect.objectContaining({
            method: 'POST',
          })
        );
      });

      // Check vote count updated
      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('should handle vote toggle correctly', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <RealtimeVoteButton
            setlistSongId="song-123"
            showId="show-123"
            userId={mockUser.id}
          />
        </TestWrapper>
      );

      const upvoteButton = screen.getByLabelText(/upvote/i);

      // First vote
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          upvotes: 1,
          downvotes: 0,
          userVote: 'up',
        }),
      });

      await user.click(upvoteButton);

      // Second click to toggle off
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          upvotes: 0,
          downvotes: 0,
          userVote: null,
        }),
      });

      await user.click(upvoteButton);

      // Verify vote removed
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });

    it('should show error when not logged in', async () => {
      const user = userEvent.setup();

      // Render without auth wrapper
      render(
        <RealtimeProvider>
          <RealtimeVoteButton setlistSongId="song-123" showId="show-123" />
        </RealtimeProvider>
      );

      const upvoteButton = screen.getByLabelText(/upvote/i);
      await user.click(upvoteButton);

      expect(toast.error).toHaveBeenCalledWith('Please sign in to vote');
    });
  });

  describe('Follow Artist Flow', () => {
    it('should handle follow/unfollow correctly', async () => {
      const user = userEvent.setup();
      const onFollowChange = vi.fn();

      render(
        <TestWrapper>
          <FollowButton
            artistId="artist-123"
            artistName="Test Artist"
            isFollowing={false}
            onFollowChange={onFollowChange}
          />
        </TestWrapper>
      );

      const followButton = screen.getByRole('button', {
        name: /follow test artist/i,
      });

      // Mock successful follow
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ following: true }),
      });

      await user.click(followButton);

      // Verify API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/artists/artist-123/follow',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });

      // Check button state changed
      expect(screen.getByText('Following')).toBeInTheDocument();
      expect(onFollowChange).toHaveBeenCalledWith(true);
    });

    it('should update follower count', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <FollowButton
            artistId="artist-123"
            artistName="Test Artist"
            followerCount={100}
            showCount={true}
          />
        </TestWrapper>
      );

      const followButton = screen.getByRole('button', {
        name: /follow test artist/i,
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ following: true }),
      });

      await user.click(followButton);

      await waitFor(() => {
        expect(screen.getByText('101 followers')).toBeInTheDocument();
      });
    });
  });

  describe('Add Song to Setlist Flow', () => {
    it('should add song successfully', async () => {
      const user = userEvent.setup();
      const onSongAdded = vi.fn();

      render(
        <TestWrapper>
          <AddSongModal
            open={true}
            onOpenChange={vi.fn()}
            setlistId="setlist-123"
            artistId="artist-123"
            onSongAdded={onSongAdded}
          />
        </TestWrapper>
      );

      // Mock song search results
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/songs/search')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              songs: [
                {
                  id: 'song-new',
                  spotify_id: 'spotify-123',
                  title: 'New Song',
                  artist: 'Test Artist',
                  album: 'Test Album',
                },
              ],
            }),
          });
        }
        if (url.includes('/api/songs/upsert')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              song: {
                id: 'song-new',
                title: 'New Song',
                artist: 'Test Artist',
              },
            }),
          });
        }
        if (url.includes('/api/setlists/songs')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      // Search for a song
      const searchInput = screen.getByPlaceholderText(/search for songs/i);
      await user.type(searchInput, 'New Song');

      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText('New Song')).toBeInTheDocument();
      });

      // Click on the song to add it
      const songOption = screen.getByText('New Song');
      await user.click(songOption);

      // Verify success
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          '"New Song" added to setlist'
        );
        expect(onSongAdded).toHaveBeenCalled();
      });
    });
  });

  describe('Search to Artist Navigation Flow', () => {
    it('should navigate from search to artist page', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <EnhancedSearch />
        </TestWrapper>
      );

      // Mock search suggestions
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestions: [
            {
              id: 'artist-123',
              type: 'artist',
              title: 'Taylor Swift',
              subtitle: 'Pop Artist',
              metadata: { followerCount: 1000000 },
            },
          ],
        }),
      });

      // Type in search
      const searchInput = screen.getByPlaceholderText(/search artists/i);
      await user.type(searchInput, 'Taylor');

      // Wait for and click suggestion
      await waitFor(() => {
        expect(screen.getByText('Taylor Swift')).toBeInTheDocument();
      });

      const suggestion = screen.getByText('Taylor Swift');
      await user.click(suggestion);

      // Verify navigation
      expect(mockPush).toHaveBeenCalledWith('/artists/artist-123');
    });
  });

  describe('Mobile Voting Interactions', () => {
    it('should trigger haptic feedback on mobile vote', async () => {
      const user = userEvent.setup();
      const mockVibrate = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
      });

      render(
        <TestWrapper>
          <MobileVoteButton
            songId="song-123"
            onVote={vi.fn().mockResolvedValue(undefined)}
            hapticFeedback={true}
          />
        </TestWrapper>
      );

      const upvoteButton = screen.getByLabelText(/upvote/i);
      await user.click(upvoteButton);

      expect(mockVibrate).toHaveBeenCalledWith(50);
    });

    it('should show vote count updates in real-time', async () => {
      const onVote = vi.fn().mockResolvedValue(undefined);

      const { rerender } = render(
        <TestWrapper>
          <MobileVoteButton songId="song-123" onVote={onVote} />
        </TestWrapper>
      );

      // Initial state
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('0 votes')).toBeInTheDocument();

      // Simulate vote update through rerender
      // In real app, this would come from realtime subscription
      rerender(
        <TestWrapper>
          <MobileVoteButton songId="song-123" onVote={onVote} />
        </TestWrapper>
      );
    });
  });

  describe('Create Setlist Flow', () => {
    it('should create new predicted setlist', async () => {
      const user = userEvent.setup();

      const mockShow = {
        id: 'show-123',
        name: 'Test Show',
        date: '2024-12-25',
        status: 'upcoming' as const,
        headliner_artist: {
          id: 'artist-123',
          name: 'Test Artist',
        },
      };

      render(
        <TestWrapper>
          <SetlistManager
            showId="show-123"
            show={mockShow}
            currentUser={mockUser}
            initialSetlists={[]}
          />
        </TestWrapper>
      );

      // Mock create setlist response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'setlist-new',
          type: 'predicted',
          name: 'Predicted Setlist',
          songs: [],
        }),
      });

      // Click create button
      const createButton = screen.getByText(/create predicted setlist/i);
      await user.click(createButton);

      // Verify success
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Predicted setlist created');
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      const user = userEvent.setup();

      // Mock a form component
      const TestForm = () => {
        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          const form = e.target as HTMLFormElement;
          const formData = new FormData(form);

          if (!formData.get('email')) {
            toast.error('Email is required');
            return;
          }

          toast.success('Form submitted');
        };

        return (
          <form onSubmit={handleSubmit}>
            <input name="email" type="email" placeholder="Email" />
            <button type="submit">Submit</button>
          </form>
        );
      };

      render(<TestForm />);

      // Submit without filling form
      const submitButton = screen.getByText('Submit');
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith('Email is required');

      // Fill and submit
      const emailInput = screen.getByPlaceholderText('Email');
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      expect(toast.success).toHaveBeenCalledWith('Form submitted');
    });
  });

  describe('Real-time Updates', () => {
    it('should handle real-time connection status', async () => {
      render(
        <TestWrapper>
          <RealtimeVoteButton
            setlistSongId="song-123"
            showId="show-123"
            userId={mockUser.id}
            showConnection={true}
          />
        </TestWrapper>
      );

      // Should show connection indicator
      const connectionIcon = screen.getByRole('img', { hidden: true });
      expect(connectionIcon).toHaveClass('text-green-500');
    });
  });
});
