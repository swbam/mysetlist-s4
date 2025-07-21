import { vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type { MockUser } from './auth';
import { createMockUser, createMockAdminUser } from './auth';

export interface MockApiResponse {
  status: number;
  data?: any;
  error?: string;
  headers?: Record<string, string>;
}

export interface MockApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  authenticated?: boolean;
  user?: MockUser;
  body?: any;
  params?: Record<string, string>;
  searchParams?: Record<string, string>;
  headers?: Record<string, string>;
}

// Create mock NextRequest for API route testing
export const createMockRequest = (url: string, options: MockApiOptions = {}): NextRequest => {
  const {
    method = 'GET',
    authenticated = false,
    user,
    body,
    headers = {},
    searchParams = {},
  } = options;

  // Build URL with search params
  const urlObj = new URL(url, 'http://localhost:3001');
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  // Set up headers
  const requestHeaders = new Headers({
    'content-type': 'application/json',
    ...headers,
  });

  // Add auth headers if authenticated
  if (authenticated) {
    const mockUser = user || createMockUser();
    requestHeaders.set('authorization', `Bearer test-token-${mockUser.id}`);
    requestHeaders.set('x-user-id', mockUser.id);
    requestHeaders.set('x-user-role', mockUser.role || 'authenticated');
  }

  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
  };

  // Add body for non-GET requests
  if (method !== 'GET' && body) {
    requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  return new NextRequest(urlObj.toString(), requestInit);
};

// Mock NextResponse helpers
export const createMockResponse = (options: MockApiResponse): Response => {
  const { status, data, error, headers = {} } = options;

  const responseBody = error 
    ? { error } 
    : data || { success: true };

  return new Response(JSON.stringify(responseBody), {
    status,
    statusText: status === 200 ? 'OK' : status === 404 ? 'Not Found' : 'Error',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  });
};

// API route testing helpers
export const testApiRoute = async (
  handler: Function,
  url: string,
  options: MockApiOptions = {}
): Promise<Response> => {
  const request = createMockRequest(url, options);
  const context = {
    params: options.params || {},
  };

  try {
    return await handler(request, context);
  } catch (error) {
    console.error('API route error:', error);
    return createMockResponse({
      status: 500,
      error: 'Internal server error',
    });
  }
};

// Database operation mocks
export const mockDatabaseOperations = () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockInsert = vi.fn().mockReturnThis();
  const mockUpdate = vi.fn().mockReturnThis();
  const mockDelete = vi.fn().mockReturnThis();
  const mockFrom = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockReturnThis();
  const mockLimit = vi.fn().mockReturnThis();
  const mockSingle = vi.fn();
  const mockMaybeSingle = vi.fn();

  return {
    from: mockFrom.mockImplementation(() => ({
      select: mockSelect.mockReturnThis(),
      insert: mockInsert.mockReturnThis(),
      update: mockUpdate.mockReturnThis(),
      delete: mockDelete.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      order: mockOrder.mockReturnThis(),
      limit: mockLimit.mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    })),
    mocks: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      from: mockFrom,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    },
  };
};

// Mock external API responses
export const mockExternalAPI = (service: 'spotify' | 'ticketmaster' | 'setlistfm', response: MockApiResponse) => {
  const endpoints = {
    spotify: 'https://api.spotify.com',
    ticketmaster: 'https://app.ticketmaster.com',
    setlistfm: 'https://api.setlist.fm',
  };

  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes(endpoints[service])) {
      return Promise.resolve(createMockResponse(response));
    }
    return Promise.resolve(createMockResponse({ status: 404, error: 'Not found' }));
  });
};

// System health check mocks
export const mockSystemHealthResponse = (overrides: Partial<any> = {}) => ({
  database: {
    status: 'healthy',
    responseTime: 45,
    ...overrides.database,
  },
  external_apis: {
    spotify: { status: 'healthy', responseTime: 120 },
    ticketmaster: { status: 'healthy', responseTime: 150 },
    setlistfm: { status: 'healthy', responseTime: 200 },
    ...overrides.external_apis,
  },
  memory: {
    usage: 45.2,
    limit: 100,
    ...overrides.memory,
  },
  uptime: 86400,
  ...overrides,
});

// Admin API helpers
export const mockAdminRequest = (url: string, options: Omit<MockApiOptions, 'authenticated' | 'user'> = {}) => {
  return createMockRequest(url, {
    ...options,
    authenticated: true,
    user: createMockAdminUser(),
  });
};

// Rate limiting mocks
export const mockRateLimit = (limited = false) => {
  return {
    limit: 100,
    remaining: limited ? 0 : 50,
    reset: Date.now() + 60000,
    success: !limited,
  };
};

// Database error mocks
export const mockDatabaseError = (type: 'connection' | 'query' | 'constraint' = 'connection') => {
  const errors = {
    connection: {
      message: 'Database connection failed',
      code: 'CONNECTION_ERROR',
    },
    query: {
      message: 'Query execution failed',
      code: 'QUERY_ERROR',
    },
    constraint: {
      message: 'Constraint violation',
      code: 'CONSTRAINT_ERROR',
    },
  };

  return errors[type];
};

// Mock paginated responses
export const mockPaginatedResponse = <T>(data: T[], page = 1, pageSize = 20, total?: number) => ({
  data,
  pagination: {
    page,
    pageSize,
    total: total || data.length,
    totalPages: Math.ceil((total || data.length) / pageSize),
    hasNextPage: page * pageSize < (total || data.length),
    hasPreviousPage: page > 1,
  },
});

// Mock search responses
export const mockSearchResponse = <T>(results: T[], query: string, total?: number) => ({
  results,
  query,
  total: total || results.length,
  took: Math.floor(Math.random() * 100) + 10, // Random response time
});

// API error response helpers
export const mockApiError = (status: number, message: string, code?: string) => ({
  status,
  error: {
    message,
    code,
    timestamp: new Date().toISOString(),
  },
});

// Common API test patterns
export const testAuthenticatedRoute = async (
  handler: Function,
  url: string,
  method: MockApiOptions['method'] = 'GET'
) => {
  // Test unauthenticated request
  const unauthenticatedRequest = createMockRequest(url, { method, authenticated: false });
  const unauthenticatedResponse = await handler(unauthenticatedRequest, {});
  
  return {
    unauthenticated: unauthenticatedResponse,
    authenticated: async (user?: MockUser) => {
      const authenticatedRequest = createMockRequest(url, { method, authenticated: true, user });
      return await handler(authenticatedRequest, {});
    },
  };
};

export const testAdminRoute = async (
  handler: Function,
  url: string,
  method: MockApiOptions['method'] = 'GET'
) => {
  const regularUser = createMockUser();
  const adminUser = createMockAdminUser();

  return {
    unauthenticated: await handler(createMockRequest(url, { method, authenticated: false }), {}),
    regularUser: await handler(createMockRequest(url, { method, authenticated: true, user: regularUser }), {}),
    admin: await handler(createMockRequest(url, { method, authenticated: true, user: adminUser }), {}),
  };
};

// Mock fetch for specific API patterns
export const mockAPIFetch = (responses: Record<string, MockApiResponse>) => {
  global.fetch = vi.fn().mockImplementation((url: string | URL) => {
    const urlString = typeof url === 'string' ? url : url.toString();
    
    for (const [pattern, response] of Object.entries(responses)) {
      if (urlString.includes(pattern)) {
        return Promise.resolve(createMockResponse(response));
      }
    }
    
    // Default 404 response
    return Promise.resolve(createMockResponse({
      status: 404,
      error: 'Not found',
    }));
  });
};

// Cleanup helper for tests
export const cleanupApiMocks = () => {
  vi.restoreAllMocks();
  if (global.fetch && vi.isMockFunction(global.fetch)) {
    global.fetch.mockClear();
  }
};