import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../../app/api/admin/users/route';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('/api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const request = new NextRequest('http://localhost/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not admin or moderator', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'user' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest('http://localhost/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return user list with pagination for admin user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
      });

      const mockUserData = {
        data: { role: 'admin' },
      };

      const mockUsers = [
        {
          id: 'user-1',
          email: 'test@example.com',
          display_name: 'Test User',
          role: 'user',
          created_at: '2023-01-01T00:00:00Z',
          is_banned: false,
          email_confirmed_at: '2023-01-01T00:00:00Z',
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockUserData),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
      };

      // Mock the main query that returns users
      mockQuery.select.mockImplementation((fields) => {
        if (fields.includes('count')) {
          return {
            ...mockQuery,
            range: vi.fn().mockResolvedValue({
              data: mockUsers,
              count: 1,
            }),
          };
        }
        return mockQuery;
      });

      // Mock count queries for statistics
      const mockCountQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
      };

      mockCountQuery.select.mockResolvedValue({ count: 1 });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return mockQuery;
        }
        return mockCountQuery;
      });

      // First call returns user role, subsequent calls return statistics
      mockSupabase.from
        .mockReturnValueOnce(mockQuery) // For role check
        .mockReturnValueOnce(mockQuery) // For main users query
        .mockReturnValueOnce(mockCountQuery) // For total users count
        .mockReturnValueOnce(mockCountQuery) // For active users count
        .mockReturnValueOnce(mockCountQuery) // For banned users count
        .mockReturnValueOnce(mockCountQuery) // For unverified users count
        .mockReturnValueOnce(mockCountQuery) // For admin users count
        .mockReturnValueOnce(mockCountQuery); // For moderator users count

      const request = new NextRequest(
        'http://localhost/api/admin/users?page=1&limit=50'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('users');
      expect(data).toHaveProperty('pagination');
      expect(data).toHaveProperty('statistics');
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(50);
    });

    it('should apply search filters correctly', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' } }),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest(
        'http://localhost/api/admin/users?search=test&role=moderator&status=active'
      );
      const response = await GET(request);

      expect(mockQuery.or).toHaveBeenCalledWith(
        'email.ilike.%test%,display_name.ilike.%test%,username.ilike.%test%'
      );
      expect(mockQuery.eq).toHaveBeenCalledWith('role', 'moderator');
    });
  });
});
