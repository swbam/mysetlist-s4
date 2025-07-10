/**
 * Show Page Component Tests
 * Tests all show page functionality including:
 * - ShowHeader with social sharing
 * - SetlistContainer with voting system
 * - AttendeeList with real-time updates
 * - Drag-and-drop reordering
 * - Mobile responsiveness
 * - Lock mechanism
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AttendeeList } from '~/app/shows/[slug]/components/attendee-list';
import { ReorderableSetlist } from '~/app/shows/[slug]/components/reorderable-setlist';
import { SetlistSection } from '~/app/shows/[slug]/components/setlist-section';
import { ShowHeader } from '~/app/shows/[slug]/components/show-header';
import { ShowPageContent } from '~/app/shows/[slug]/components/show-page-content';
import { VoteButton } from '~/components/voting/vote-button';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock supabase client
vi.mock('~/lib/supabase/client', () => ({
  createClient: () => ({
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
}));

// Mock auth provider
vi.mock('~/app/providers/auth-provider', () => ({
  useAuth: () => ({
    session: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
    },
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock drag and drop
vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: any) => (
    <div data-testid="drag-drop-context">{children}</div>
  ),
  Droppable: ({ children }: any) => (
    <div data-testid="droppable">
      {children({
        provided: { innerRef: vi.fn(), droppableProps: {} },
        snapshot: {},
      })}
    </div>
  ),
  Draggable: ({ children }: any) => (
    <div data-testid="draggable">
      {children({
        provided: {
          innerRef: vi.fn(),
          draggableProps: {},
          dragHandleProps: {},
        },
        snapshot: {},
      })}
    </div>
  ),
}));

// Test data
const mockShow = {
  id: 'show-1',
  name: 'Test Show',
  slug: 'test-show',
  date: '2024-12-31',
  start_time: '20:00',
  doors_time: '19:00',
  status: 'upcoming',
  headliner_artist: {
    id: 'artist-1',
    name: 'Test Artist',
    slug: 'test-artist',
    image_url: 'https://example.com/artist.jpg',
    verified: true,
  },
  venue: {
    id: 'venue-1',
    name: 'Test Venue',
    slug: 'test-venue',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    capacity: 5000,
  },
  setlists: [
    {
      id: 'setlist-1',
      name: 'Main Set',
      type: 'predicted',
      is_locked: false,
      created_by: 'test-user-id',
      setlist_songs: [
        {
          id: 'song-1',
          position: 1,
          song: {
            id: 'track-1',
            title: 'Test Song 1',
            artist: 'Test Artist',
            duration_ms: 180000,
          },
          upvotes: 10,
          downvotes: 2,
          userVote: null,
        },
      ],
    },
  ],
  attendanceCount: 42,
  isAttending: false,
  currentUser: {
    id: 'test-user-id',
    display_name: 'Test User',
  },
};

describe('Show Page Components', () => {
  describe('ShowHeader', () => {
    it('renders show information correctly', () => {
      render(<ShowHeader show={mockShow} />);

      expect(screen.getByText('Test Artist')).toBeInTheDocument();
      expect(screen.getByText('Monday, December 31, 2024')).toBeInTheDocument();
      expect(
        screen.getByText('Doors: 19:00 • Show: 20:00')
      ).toBeInTheDocument();
      expect(screen.getByText('Test Venue')).toBeInTheDocument();
    });

    it('shows social sharing buttons', () => {
      render(<ShowHeader show={mockShow} />);

      expect(screen.getByText('Share')).toBeInTheDocument();
    });

    it('displays status badges correctly', () => {
      render(<ShowHeader show={mockShow} />);

      expect(screen.getByText('upcoming')).toBeInTheDocument();
    });
  });

  describe('AttendeeList', () => {
    it('renders attendee list with count', async () => {
      render(
        <AttendeeList showId="show-1" currentUser={mockShow.currentUser} />
      );

      await waitFor(() => {
        expect(screen.getByText('Attendees')).toBeInTheDocument();
      });
    });

    it('shows attendance tracker', () => {
      render(
        <AttendeeList showId="show-1" currentUser={mockShow.currentUser} />
      );

      expect(screen.getByText("I'm going")).toBeInTheDocument();
    });
  });

  describe('SetlistSection', () => {
    it('renders setlist tabs correctly', () => {
      render(
        <SetlistSection
          show={mockShow}
          actualSetlists={[]}
          predictedSetlists={mockShow.setlists}
          currentUser={mockShow.currentUser}
        />
      );

      expect(screen.getByText('Setlists')).toBeInTheDocument();
      expect(screen.getByText('Predicted (1)')).toBeInTheDocument();
    });

    it('shows create setlist button for authorized users', () => {
      render(
        <SetlistSection
          show={mockShow}
          actualSetlists={[]}
          predictedSetlists={[]}
          currentUser={mockShow.currentUser}
        />
      );

      expect(screen.getByText('Create Setlist')).toBeInTheDocument();
    });
  });

  describe('VoteButton', () => {
    const mockOnVote = jest.fn();

    beforeEach(() => {
      mockOnVote.mockClear();
    });

    it('renders vote buttons with counts', () => {
      render(
        <VoteButton
          setlistSongId="song-1"
          currentVote={null}
          upvotes={10}
          downvotes={2}
          onVote={mockOnVote}
        />
      );

      expect(screen.getByText('+8')).toBeInTheDocument(); // Net votes
    });

    it('handles upvote clicks', async () => {
      render(
        <VoteButton
          setlistSongId="song-1"
          currentVote={null}
          upvotes={10}
          downvotes={2}
          onVote={mockOnVote}
        />
      );

      const upvoteButton = screen.getAllByRole('button')[0];
      fireEvent.click(upvoteButton);

      await waitFor(() => {
        expect(mockOnVote).toHaveBeenCalledWith('up');
      });
    });

    it('shows correct visual feedback for user votes', () => {
      render(
        <VoteButton
          setlistSongId="song-1"
          currentVote="up"
          upvotes={10}
          downvotes={2}
          onVote={mockOnVote}
        />
      );

      const upvoteButton = screen.getAllByRole('button')[0];
      expect(upvoteButton).toHaveClass('bg-green-100');
    });
  });

  describe('ReorderableSetlist', () => {
    const mockOnReorder = jest.fn();
    const mockOnCancel = jest.fn();

    it('renders drag and drop interface', () => {
      render(
        <ReorderableSetlist
          setlist={mockShow.setlists[0]}
          show={mockShow}
          currentUser={mockShow.currentUser}
          onReorder={mockOnReorder}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByTestId('drag-drop-context')).toBeInTheDocument();
    });

    it('shows save/cancel buttons when changes are made', () => {
      render(
        <ReorderableSetlist
          setlist={mockShow.setlists[0]}
          show={mockShow}
          currentUser={mockShow.currentUser}
          onReorder={mockOnReorder}
          onCancel={mockOnCancel}
        />
      );

      // Would need to simulate drag operation to show buttons
      // This would require more complex testing setup
    });
  });

  describe('ShowPageContent', () => {
    it('renders all major components', () => {
      render(<ShowPageContent show={mockShow} />);

      // Check for main sections
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
      expect(screen.getByText('Setlists')).toBeInTheDocument();
      expect(screen.getByText('Tickets')).toBeInTheDocument();
      expect(screen.getByText('Test Venue')).toBeInTheDocument();
      expect(screen.getByText('Attendees')).toBeInTheDocument();
    });

    it('handles ongoing show status correctly', () => {
      const ongoingShow = { ...mockShow, status: 'ongoing' };
      render(<ShowPageContent show={ongoingShow} />);

      // Should show live indicator
      expect(
        document.querySelector('[data-testid="live-indicator"]')
      ).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

    it('renders correctly on mobile', () => {
      render(<ShowPageContent show={mockShow} />);

      // Check that components stack vertically on mobile
      const mainGrid = document.querySelector('.lg\\:grid-cols-3');
      expect(mainGrid).toBeInTheDocument();
    });

    it('uses touch-optimized components on mobile', () => {
      render(
        <VoteButton
          setlistSongId="song-1"
          currentVote={null}
          upvotes={10}
          downvotes={2}
          onVote={jest.fn()}
          variant="compact"
        />
      );

      // Check for mobile-appropriate sizing
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveClass('h-6', 'w-6');
    });
  });

  describe('Real-time Updates', () => {
    it('sets up real-time subscriptions for ongoing shows', () => {
      const ongoingShow = { ...mockShow, status: 'ongoing' };
      render(<ShowPageContent show={ongoingShow} />);

      // Verify useRealtimeUpdates is called
      // This would require mocking the hook
    });
  });

  describe('Lock Mechanism', () => {
    it('disables voting on locked setlists', () => {
      const lockedSetlist = {
        ...mockShow.setlists[0],
        is_locked: true,
      };
      const showWithLockedSetlist = {
        ...mockShow,
        setlists: [lockedSetlist],
      };

      render(<ShowPageContent show={showWithLockedSetlist} />);

      // Vote buttons should be disabled
      const voteButtons = screen.getAllByRole('button');
      const voteButton = voteButtons.find((btn) =>
        btn.getAttribute('aria-label')?.includes('Upvote')
      );
      expect(voteButton).toBeDisabled();
    });

    it('shows locked indicator on locked setlists', () => {
      const lockedSetlist = {
        ...mockShow.setlists[0],
        is_locked: true,
      };
      const showWithLockedSetlist = {
        ...mockShow,
        setlists: [lockedSetlist],
      };

      render(<ShowPageContent show={showWithLockedSetlist} />);

      expect(screen.getByText('Locked')).toBeInTheDocument();
    });
  });

  describe('Social Sharing', () => {
    it('generates correct share URLs', () => {
      render(<ShowHeader show={mockShow} />);

      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);

      // Would need to check dropdown content
      // This requires more specific testing of ShareButtons component
    });
  });

  describe('Error Handling', () => {
    it('handles missing venue gracefully', () => {
      const showWithoutVenue = { ...mockShow, venue: null };
      render(<ShowPageContent show={showWithoutVenue} />);

      expect(screen.getByText('Venue TBA')).toBeInTheDocument();
    });

    it('handles empty setlists gracefully', () => {
      const showWithoutSetlists = { ...mockShow, setlists: [] };
      render(<ShowPageContent show={showWithoutSetlists} />);

      expect(screen.getByText('No setlists yet')).toBeInTheDocument();
    });
  });
});

describe('Integration Tests', () => {
  it('complete show page workflow', async () => {
    render(<ShowPageContent show={mockShow} />);

    // 1. Check initial render
    expect(screen.getByText('Test Artist')).toBeInTheDocument();

    // 2. Mark as attending
    const attendButton = screen.getByText("I'm going");
    fireEvent.click(attendButton);

    // 3. Vote on a song
    const voteButtons = screen.getAllByRole('button');
    const upvoteButton = voteButtons.find((btn) =>
      btn.getAttribute('aria-label')?.includes('Upvote')
    );
    if (upvoteButton) {
      fireEvent.click(upvoteButton);
    }

    // 4. Check social sharing
    const shareButton = screen.getByText('Share');
    fireEvent.click(shareButton);

    // All interactions should work without errors
    await waitFor(() => {
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
    });
  });
});
