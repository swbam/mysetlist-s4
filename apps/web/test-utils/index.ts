import type { User } from '@supabase/supabase-js';
import { vi } from 'vitest';

export const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  role: 'authenticated',
  phone: null,
  confirmation_sent_at: null,
  confirmed_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  phone_confirmed_at: null,
  recovery_sent_at: null,
  last_sign_in_at: new Date().toISOString(),
  identities: [],
  factors: [],
  is_anonymous: false,
};

export function createMockSupabaseClient() {
  return {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: mockUser }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
}

export function mockSupabase() {
  vi.mock('~/lib/supabase/server', () => ({
    createClient: vi.fn(() => createMockSupabaseClient()),
  }));
}

export function renderWithProviders(component: React.ReactElement) {
  // Add providers as needed (AuthProvider, ThemeProvider, etc.)
  return component;
}

export * from './performance';
export * from './accessibility';
