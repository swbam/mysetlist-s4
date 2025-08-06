import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../../../app/api/admin/users/actions/route";

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("~/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

describe("/api/admin/users/actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const request = new NextRequest(
        "http://localhost/api/admin/users/actions",
        {
          method: "POST",
          body: JSON.stringify({ action: "ban", userId: "user-1" }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if user is not admin", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "moderator-1" } },
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "moderator" },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest(
        "http://localhost/api/admin/users/actions",
        {
          method: "POST",
          body: JSON.stringify({ action: "ban", userId: "user-1" }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden - Admin access required");
    });

    it("should return 400 if required fields are missing", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin" },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest(
        "http://localhost/api/admin/users/actions",
        {
          method: "POST",
          body: JSON.stringify({ action: "ban" }), // Missing userId
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
    });

    it("should successfully ban a user", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      });

      const mockInsert = vi.fn().mockResolvedValue({ data: {}, error: null });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin" },
        }),
        update: mockUpdate,
        insert: mockInsert,
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const requestBody = {
        action: "ban",
        userId: "user-1",
        reason: "Violation of terms",
      };

      // Create a mock request with working json() method
      const request = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("User ban completed successfully");
      expect(mockUpdate).toHaveBeenCalledWith({
        is_banned: true,
        ban_reason: "Violation of terms",
        banned_at: expect.any(String),
        banned_by: "admin-1",
      });
    });

    it("should successfully unban a user", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      });

      const mockInsert = vi.fn().mockResolvedValue({ data: {}, error: null });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin" },
        }),
        update: mockUpdate,
        insert: mockInsert,
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const requestBody = { action: "unban", userId: "user-1" };

      // Create a mock request with working json() method
      const request = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        is_banned: false,
        ban_reason: null,
        banned_at: null,
        banned_by: null,
      });
    });

    it("should successfully warn a user", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      });

      const mockInsert = vi.fn().mockResolvedValue({ data: {}, error: null });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValueOnce({
            data: { role: "admin" },
          })
          .mockResolvedValueOnce({
            data: { warning_count: 1 },
          }),
        update: mockUpdate,
        insert: mockInsert,
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const requestBody = {
        action: "warn",
        userId: "user-1",
        reason: "Inappropriate behavior",
      };

      // Create a mock request with working json() method
      const request = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        warning_count: 2,
        last_warning_at: expect.any(String),
        last_warning_by: "admin-1",
      });
    });

    it("should return 400 for invalid action", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-1" } },
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "admin" },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const requestBody = { action: "invalid_action", userId: "user-1" };

      // Create a mock request with working json() method
      const request = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid action");
    });
  });
});
