import { NextResponse } from 'next/server';

export const runtime = 'edge';

const API_DOCUMENTATION = {
  openapi: '3.0.0',
  info: {
    title: 'MySetlist API',
    version: '1.0.0',
    description: 'API for accessing MySetlist data including artists, shows, venues, and voting functionality',
    contact: {
      name: 'API Support',
      email: 'api@mysetlist.com',
    },
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_APP_URL || 'https://mysetlist.com',
      description: 'Production server',
    },
  ],
  paths: {
    '/api/trending': {
      get: {
        summary: 'Get trending content',
        description: 'Retrieve trending artists and shows based on various time periods',
        parameters: [
          {
            name: 'period',
            in: 'query',
            description: 'Time period for trending data',
            schema: {
              type: 'string',
              enum: ['day', 'week', 'month'],
              default: 'week',
            },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of results',
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
          {
            name: 'type',
            in: 'query',
            description: 'Type of content to return',
            schema: {
              type: 'string',
              enum: ['shows', 'artists', 'combined'],
              default: 'combined',
            },
          },
        ],
        responses: {
          200: {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    period: { type: 'string' },
                    limit: { type: 'integer' },
                    type: { type: 'string' },
                    data: { type: 'object' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/artists/search': {
      get: {
        summary: 'Search for artists',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            description: 'Search query',
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20 },
          },
        ],
        responses: {
          200: {
            description: 'List of matching artists',
          },
        },
      },
    },
    '/api/shows/{id}': {
      get: {
        summary: 'Get show details',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Show details',
          },
          404: {
            description: 'Show not found',
          },
        },
      },
    },
    '/api/recommendations': {
      post: {
        summary: 'Get personalized recommendations',
        description: 'Get recommended artists and shows based on user preferences',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  artistIds: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  genres: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  location: {
                    type: 'object',
                    properties: {
                      lat: { type: 'number' },
                      lng: { type: 'number' },
                      radius: { type: 'number' },
                    },
                  },
                  limit: { type: 'integer', default: 20 },
                  type: {
                    type: 'string',
                    enum: ['artists', 'shows', 'both'],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Personalized recommendations',
          },
        },
      },
    },
    '/api/batch': {
      post: {
        summary: 'Execute batch operations',
        description: 'Perform multiple database operations in a single request',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  operations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        type: {
                          type: 'string',
                          enum: ['create', 'update', 'delete', 'upsert'],
                        },
                        resource: {
                          type: 'string',
                          enum: ['artists', 'shows', 'venues', 'songs', 'setlists'],
                        },
                        data: { type: 'object' },
                      },
                    },
                  },
                  transactional: { type: 'boolean', default: false },
                  continueOnError: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Batch operation results',
          },
        },
      },
    },
    '/api/analytics': {
      get: {
        summary: 'Get analytics data',
        parameters: [
          {
            name: 'metric',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              enum: ['overview', 'trending', 'engagement', 'growth', 'performance'],
            },
          },
          {
            name: 'period',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['day', 'week', 'month', 'year', 'all'],
            },
          },
        ],
        responses: {
          200: {
            description: 'Analytics data',
          },
        },
      },
    },
    '/api/health': {
      get: {
        summary: 'Health check endpoint',
        responses: {
          200: {
            description: 'Service is healthy',
          },
          503: {
            description: 'Service is unhealthy',
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'API key authentication',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          code: { type: 'string' },
        },
      },
      Artist: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          imageUrl: { type: 'string' },
          genres: {
            type: 'array',
            items: { type: 'string' },
          },
          popularity: { type: 'integer' },
          trendingScore: { type: 'number' },
        },
      },
      Show: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          status: {
            type: 'string',
            enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
          },
          venueId: { type: 'string' },
          headlinerArtistId: { type: 'string' },
          trendingScore: { type: 'number' },
          voteCount: { type: 'integer' },
          attendeeCount: { type: 'integer' },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(API_DOCUMENTATION, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}