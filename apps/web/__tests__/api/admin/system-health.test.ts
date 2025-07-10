import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../../app/api/admin/system-health/route';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('~/lib/api/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Mock fetch for external API health checks
global.fetch = vi.fn();

describe('/api/admin/system-health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const request = new NextRequest(
        'http://localhost/api/admin/system-health'
      );
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

      const request = new NextRequest(
        'http://localhost/api/admin/system-health'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return system health status for admin user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin' },
        }),
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Mock external API responses
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('ticketmaster')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: 'ok' }),
          });
        }
        if (url.includes('setlist.fm')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: 'ok' }),
          });
        }
        if (url.includes('spotify')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: 'ok' }),
          });
        }
        return Promise.resolve({
          ok: false,
          status: 500,
        });
      });

      // Mock database health check
      mockQuery.select.mockResolvedValueOnce({ data: [{}], error: null });

      const request = new NextRequest(
        'http://localhost/api/admin/system-health'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('database');
      expect(data).toHaveProperty('external_apis');
      expect(data).toHaveProperty('overall_status');
      expect(data).toHaveProperty('timestamp');

      expect(data.database.status).toBe('healthy');
      expect(data.external_apis.ticketmaster.status).toBe('healthy');
      expect(data.external_apis.setlistfm.status).toBe('healthy');
      expect(data.external_apis.spotify.status).toBe('healthy');
    });

    it('should handle database connection failures', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin' },
        }),
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      };

      // Mock database error
      mockQuery.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection failed' },
      });

      mockSupabase.from.mockReturnValue(mockQuery);

      // Mock external APIs as healthy
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'ok' }),
      });

      const request = new NextRequest(
        'http://localhost/api/admin/system-health'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.database.status).toBe('unhealthy');
      expect(data.database.error).toBe('Connection failed');
      expect(data.overall_status).toBe('degraded');
    });

    it('should handle external API failures', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin' },
        }),
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      };

      // Mock database as healthy
      mockQuery.select.mockResolvedValueOnce({ data: [{}], error: null });

      mockSupabase.from.mockReturnValue(mockQuery);

      // Mock external API failures
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('ticketmaster')) {
          return Promise.resolve({
            ok: false,
            status: 500,
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'ok' }),
        });
      });

      const request = new NextRequest(
        'http://localhost/api/admin/system-health'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.database.status).toBe('healthy');
      expect(data.external_apis.ticketmaster.status).toBe('unhealthy');
      expect(data.overall_status).toBe('degraded');
    });

    it('should calculate response times correctly', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin' },
        }),
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Mock delayed response
      (global.fetch as any).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ data: 'ok' }),
            });
          }, 100);
        });
      });

      const request = new NextRequest(
        'http://localhost/api/admin/system-health'
      );

      // Start the request and advance timers
      const responsePromise = GET(request);
      vi.advanceTimersByTime(100);

      const response = await responsePromise;
      const data = await response.json();

      expect(response.status).toBe(200);
      // Response times should be present and positive numbers
      expect(data.external_apis.ticketmaster.response_time).toBeGreaterThan(0);
    });
  });
});
