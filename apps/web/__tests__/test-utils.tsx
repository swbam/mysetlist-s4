/**
 * @fileoverview Consolidated test utilities for MySetlist app
 * This file provides unified testing utilities following Next-Forge patterns
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type RenderOptions, render } from "@testing-library/react"
import { SessionProvider } from "next-auth/react"
import type React from "react"
import type { ReactElement } from "react"
import { vi } from "vitest"

// Import and re-export utilities from test-utils package
export * from "../test-utils"
export * from "../test-utils/auth"
export * from "../test-utils/api"
export * from "../test-utils/performance"
export * from "../test-utils/accessibility"

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    has: vi.fn(),
    getAll: vi.fn(),
  }),
  usePathname: () => "/test",
  useParams: () => ({}),
}))

// Mock Supabase client
vi.mock("~/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signIn: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  }),
}))

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Number.POSITIVE_INFINITY,
      },
    },
  })

interface AllTheProvidersProps {
  children: React.ReactNode
  session?: any
}

function AllTheProviders({ children, session = null }: AllTheProvidersProps) {
  const testQueryClient = createTestQueryClient()

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={testQueryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { session?: any }
) => {
  const { session, ...renderOptions } = options || {}

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders session={session}>{children}</AllTheProviders>
    ),
    ...renderOptions,
  })
}

// Re-export everything
export * from "@testing-library/react"
export { customRender as render }
export { vi }
