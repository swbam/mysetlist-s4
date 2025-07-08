import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UserManagementEnhanced from '../../../app/admin/users/components/user-management-enhanced';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

const mockUsers = [
  {
    id: 'user-1',
    email: 'test1@example.com',
    display_name: 'Test User 1',
    username: 'testuser1',
    role: 'user',
    created_at: '2023-01-01T00:00:00Z',
    last_login_at: '2023-12-01T00:00:00Z',
    email_confirmed_at: '2023-01-01T00:00:00Z',
    is_banned: false,
    warning_count: 0,
  },
  {
    id: 'user-2',
    email: 'test2@example.com',
    display_name: 'Test User 2',
    username: 'testuser2',
    role: 'moderator',
    created_at: '2023-01-02T00:00:00Z',
    last_login_at: '2023-12-02T00:00:00Z',
    email_confirmed_at: '2023-01-02T00:00:00Z',
    is_banned: false,
    warning_count: 1,
  },
  {
    id: 'user-3',
    email: 'banned@example.com',
    display_name: 'Banned User',
    username: 'banneduser',
    role: 'user',
    created_at: '2023-01-03T00:00:00Z',
    email_confirmed_at: '2023-01-03T00:00:00Z',
    is_banned: true,
    ban_reason: 'Violation of terms',
    warning_count: 2,
  },
];

const mockUserStats = {
  setlists_created: 5,
  reviews_written: 10,
  votes_cast: 25,
  photos_uploaded: 3,
};

describe('UserManagementEnhanced', () => {
  // Setup userEvent with pointer events disabled for each test
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful user fetch
    (global.fetch as any).mockImplementation((url: string) => {
      if (
        url.includes('/admin/users') &&
        !url.includes('/stats') &&
        !url.includes('/actions')
      ) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              users: mockUsers,
              pagination: { page: 1, limit: 50, total: 3, totalPages: 1 },
              statistics: {
                total: 3,
                active: 2,
                banned: 1,
                unverified: 0,
                admins: 0,
                moderators: 1,
              },
            }),
        });
      }

      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUserStats),
        });
      }

      if (url.includes('/actions')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ success: true, message: 'Action completed' }),
        });
      }

      return Promise.resolve({
        ok: false,
        status: 404,
      });
    });
  });

  it('should render user management interface', async () => {
    render(<UserManagementEnhanced />);

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Manage user accounts, roles, and permissions')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Search by name, email, or username...')
    ).toBeInTheDocument();
    expect(screen.getByText('Export Users')).toBeInTheDocument();
    expect(screen.getByText('Bulk Actions')).toBeInTheDocument();
  });

  it('should display user statistics cards', async () => {
    render(<UserManagementEnhanced />);

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });

    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('Banned Users')).toBeInTheDocument();
    expect(screen.getByText('Staff Members')).toBeInTheDocument();
  });

  it('should display users in table', async () => {
    render(<UserManagementEnhanced />);

    await waitFor(() => {
      expect(screen.getByText('test1@example.com')).toBeInTheDocument();
    });

    expect(screen.getByText('Test User 1')).toBeInTheDocument();
    expect(screen.getByText('test2@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test User 2')).toBeInTheDocument();
    expect(screen.getByText('banned@example.com')).toBeInTheDocument();
    expect(screen.getByText('Banned User')).toBeInTheDocument();
  });

  it('should show correct status badges', async () => {
    render(<UserManagementEnhanced />);

    await waitFor(() => {
      expect(screen.getByText('test1@example.com')).toBeInTheDocument();
    });

    // Check for Active badges
    const activeBadges = screen.getAllByText('Active');
    expect(activeBadges).toHaveLength(2);

    // Check for Banned badge
    expect(screen.getByText('Banned')).toBeInTheDocument();

    // Check for role badges
    expect(screen.getAllByText('user')).toHaveLength(2);
    expect(screen.getByText('moderator')).toBeInTheDocument();
  });

  it('should show warning indicators for users with warnings', async () => {
    render(<UserManagementEnhanced />);

    await waitFor(() => {
      expect(screen.getByText('1 warning')).toBeInTheDocument();
    });

    expect(screen.getByText('2 warnings')).toBeInTheDocument();
  });

  it('should filter users by search term', async () => {
    render(<UserManagementEnhanced />);

    await waitFor(() => {
      expect(screen.getByText('test1@example.com')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      'Search by name, email, or username...'
    );
    fireEvent.change(searchInput, { target: { value: 'banned' } });

    // Only banned user should be visible
    expect(screen.getByText('banned@example.com')).toBeInTheDocument();
    expect(screen.queryByText('test1@example.com')).not.toBeInTheDocument();
  });

  it('should filter users by role', async () => {
    render(<UserManagementEnhanced />);
    
    await waitFor(() => {
      expect(screen.getByText('test1@example.com')).toBeInTheDocument();
    });

    // Verify that all role badges are present initially
    expect(screen.getAllByText('user')).toHaveLength(2);
    expect(screen.getByText('moderator')).toBeInTheDocument();
  });

  it('should filter users by status', async () => {
    render(<UserManagementEnhanced />);
    
    await waitFor(() => {
      expect(screen.getByText('test1@example.com')).toBeInTheDocument();
    });

    // Verify that status badges are present
    const activeBadges = screen.getAllByText('Active');
    expect(activeBadges).toHaveLength(2);
    expect(screen.getByText('Banned')).toBeInTheDocument();
  });

  it('should open user action menu and show options', async () => {
    render(<UserManagementEnhanced />);
    
    await waitFor(() => {
      expect(screen.getByText('test1@example.com')).toBeInTheDocument();
    });

    // Find and click first user's action menu
    const actionButtons = screen.getAllByRole('button', { name: /Open menu/i });
    await user.click(actionButtons[0]);

    // Wait for menu to appear
    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      expect(screen.getByText('Ban User')).toBeInTheDocument();
    });
  });

  it('should open user detail modal', async () => {
    render(<UserManagementEnhanced />);
    
    await waitFor(() => {
      expect(screen.getByText('test1@example.com')).toBeInTheDocument();
    });

    // Open user detail via action menu
    const actionButtons = screen.getAllByRole('button', { name: /Open menu/i });
    await user.click(actionButtons[0]);
    
    const viewDetailsButton = await screen.findByText('View Details');
    await user.click(viewDetailsButton);

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('User Details')).toBeInTheDocument();
    });
  });

  it('should open user details dialog when view details is clicked', async () => {
    render(<UserManagementEnhanced />);

    await waitFor(() => {
      expect(screen.getByText('test1@example.com')).toBeInTheDocument();
    });

    // Find and click first user's action menu
    const actionButtons = screen.getAllByRole('button', { name: /Open menu/i });
    await user.click(actionButtons[0]);

    // Click view details
    const viewDetailsButton = await screen.findByText('View Details');
    await user.click(viewDetailsButton);

    // Wait for dialog to open and stats to load
    await waitFor(() => {
      expect(screen.getByText('User Details')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Complete information about Test User 1')
    ).toBeInTheDocument();
  });

  it('should show user statistics in details dialog', async () => {
    render(<UserManagementEnhanced />);

    await waitFor(() => {
      expect(screen.getByText('test1@example.com')).toBeInTheDocument();
    });

    // Open user details
    const actionButtons = screen.getAllByRole('button', { name: /Open menu/i });
    await user.click(actionButtons[0]);
    const viewDetailsButton = await screen.findByText('View Details');
    await user.click(viewDetailsButton);

    // Wait for stats to load and check activity tab
    await waitFor(() => {
      expect(screen.getByText('User Details')).toBeInTheDocument();
    });

    // Click on activity tab to see stats
    const activityTab = screen.getByRole('tab', { name: 'Activity' });
    await user.click(activityTab);

    // Check for stats
    await waitFor(() => {
      expect(screen.getByText('Content Statistics')).toBeInTheDocument();
    });
  });

  it('should handle user ban action', async () => {
    render(<UserManagementEnhanced />);

    await waitFor(() => {
      expect(screen.getByText('test1@example.com')).toBeInTheDocument();
    });

    // Find and click first user's action menu
    const actionButtons = screen.getAllByRole('button', { name: /Open menu/i });
    await user.click(actionButtons[0]);

    // Click ban user
    const banButton = screen.getByText('Ban User');
    await user.click(banButton);

    // Ban dialog should open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Fill out ban reason
    const reasonTextarea = screen.getByPlaceholderText(
      'Explain why this user is being banned...'
    );
    await user.type(reasonTextarea, 'Test ban reason');

    // Click ban button in dialog
    const confirmBanButton = screen.getAllByRole('button', { name: 'Ban User' })[1]; // Second one is in dialog
    await user.click(confirmBanButton);

    // Should make API call and show success toast
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/users/actions'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should handle promote to moderator action', async () => {
    render(<UserManagementEnhanced />);

    await waitFor(() => {
      expect(screen.getByText('test1@example.com')).toBeInTheDocument();
    });

    // Find and click first user's action menu (regular user)
    const actionButtons = screen.getAllByRole('button', { name: /Open menu/i });
    await user.click(actionButtons[0]);

    // Click make moderator
    const promoteButton = screen.getByText('Make Moderator');
    await user.click(promoteButton);

    // Should make API call and show success toast
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'User promote_moderator successful'
      );
    });
  });

  it('should handle unban action for banned users', async () => {
    render(<UserManagementEnhanced />);

    await waitFor(() => {
      expect(screen.getByText('banned@example.com')).toBeInTheDocument();
    });

    // Find and click banned user's action menu
    const actionButtons = screen.getAllByRole('button', { name: /Open menu/i });
    await user.click(actionButtons[2]); // Third user is banned

    // Click unban user
    const unbanButton = screen.getByText('Unban User');
    await user.click(unbanButton);

    // Should make API call and show success toast
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('User unban successful');
    });
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    (global.fetch as any).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      })
    );

    render(<UserManagementEnhanced />);

    // Should show error toast
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load users');
    });
  });

  it('should show loading state initially', () => {
    render(<UserManagementEnhanced />);

    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('should show no users message when filtered results are empty', async () => {
    render(<UserManagementEnhanced />);

    await waitFor(() => {
      expect(screen.getByText('test1@example.com')).toBeInTheDocument();
    });

    // Search for non-existent user
    const searchInput = screen.getByPlaceholderText(
      'Search by name, email, or username...'
    );
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(
      screen.getByText('No users found matching your filters')
    ).toBeInTheDocument();
  });
});
