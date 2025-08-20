/**
 * Prisma-compatible database client setup
 * 
 * This module provides a Prisma-style interface while using Drizzle ORM
 * underneath for consistency with the existing codebase architecture.
 */

import { db, testConnection } from "@repo/database";
import type { 
  Artists, 
  Shows, 
  Venues, 
  Users,
  UserFollowsArtists,
  Setlists,
  SyncJobs,
  UserProfiles 
} from "@repo/database/schema";
import { artists, shows, venues, users, userFollowsArtists, setlists, syncJobs, userProfiles } from "@repo/database/schema";
import { eq, and, desc, asc, sql, ilike, count, or } from "drizzle-orm";

/**
 * Prisma-style database client
 * Provides type-safe database operations with familiar Prisma-like API
 */
class PrismaClient {
  private _db = db;

  /**
   * Test database connection
   */
  async $connect(): Promise<void> {
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error("Failed to connect to database");
    }
  }

  /**
   * Disconnect from database
   */
  async $disconnect(): Promise<void> {
    // Drizzle doesn't require explicit disconnection
    // Connection pooling is handled automatically
  }

  /**
   * Execute raw SQL query
   */
  async $queryRaw<T = unknown>(query: string, ...params: unknown[]): Promise<T[]> {
    return this._db.execute(sql.raw(query, ...params)) as T[];
  }

  /**
   * Artist operations
   */
  artist = {
    findUnique: async (params: { where: { id?: string; slug?: string } }) => {
      const { where } = params;
      let query = this._db.select().from(artists);
      
      if (where.id) {
        query = query.where(eq(artists.id, where.id));
      } else if (where.slug) {
        query = query.where(eq(artists.slug, where.slug));
      }
      
      const results = await query.limit(1);
      return results[0] || null;
    },

    findMany: async (params?: {
      where?: Partial<Artists>;
      orderBy?: { [K in keyof Artists]?: 'asc' | 'desc' };
      take?: number;
      skip?: number;
    }) => {
      let query = this._db.select().from(artists);
      
      if (params?.where) {
        const conditions = Object.entries(params.where)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => eq(artists[key as keyof Artists], value));
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }
      
      if (params?.orderBy) {
        const orderByEntries = Object.entries(params.orderBy);
        if (orderByEntries.length > 0) {
          const [field, direction] = orderByEntries[0];
          query = query.orderBy(
            direction === 'desc' 
              ? desc(artists[field as keyof Artists])
              : asc(artists[field as keyof Artists])
          );
        }
      }
      
      if (params?.skip) {
        query = query.offset(params.skip);
      }
      
      if (params?.take) {
        query = query.limit(params.take);
      }
      
      return query;
    },

    create: async (params: { data: Omit<Artists, 'id' | 'createdAt' | 'updatedAt'> }) => {
      const results = await this._db.insert(artists).values(params.data).returning();
      return results[0];
    },

    update: async (params: {
      where: { id: string };
      data: Partial<Omit<Artists, 'id' | 'createdAt'>>;
    }) => {
      const results = await this._db
        .update(artists)
        .set({ ...params.data, updatedAt: new Date() })
        .where(eq(artists.id, params.where.id))
        .returning();
      return results[0];
    },

    delete: async (params: { where: { id: string } }) => {
      const results = await this._db
        .delete(artists)
        .where(eq(artists.id, params.where.id))
        .returning();
      return results[0];
    },

    count: async (params?: { where?: Partial<Artists> }) => {
      let query = this._db.select({ count: count() }).from(artists);
      
      if (params?.where) {
        const conditions = Object.entries(params.where)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => eq(artists[key as keyof Artists], value));
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }
      
      const results = await query;
      return results[0]?.count || 0;
    }
  };

  /**
   * Show operations
   */
  show = {
    findUnique: async (params: { where: { id?: string; slug?: string } }) => {
      const { where } = params;
      let query = this._db.select().from(shows);
      
      if (where.id) {
        query = query.where(eq(shows.id, where.id));
      } else if (where.slug) {
        query = query.where(eq(shows.slug, where.slug));
      }
      
      const results = await query.limit(1);
      return results[0] || null;
    },

    findMany: async (params?: {
      where?: Partial<Shows>;
      orderBy?: { [K in keyof Shows]?: 'asc' | 'desc' };
      take?: number;
      skip?: number;
    }) => {
      let query = this._db.select().from(shows);
      
      if (params?.where) {
        const conditions = Object.entries(params.where)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => eq(shows[key as keyof Shows], value));
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }
      
      if (params?.orderBy) {
        const orderByEntries = Object.entries(params.orderBy);
        if (orderByEntries.length > 0) {
          const [field, direction] = orderByEntries[0];
          query = query.orderBy(
            direction === 'desc' 
              ? desc(shows[field as keyof Shows])
              : asc(shows[field as keyof Shows])
          );
        }
      }
      
      if (params?.skip) {
        query = query.offset(params.skip);
      }
      
      if (params?.take) {
        query = query.limit(params.take);
      }
      
      return query;
    },

    create: async (params: { data: Omit<Shows, 'id' | 'createdAt' | 'updatedAt'> }) => {
      const results = await this._db.insert(shows).values(params.data).returning();
      return results[0];
    },

    update: async (params: {
      where: { id: string };
      data: Partial<Omit<Shows, 'id' | 'createdAt'>>;
    }) => {
      const results = await this._db
        .update(shows)
        .set({ ...params.data, updatedAt: new Date() })
        .where(eq(shows.id, params.where.id))
        .returning();
      return results[0];
    },

    count: async (params?: { where?: Partial<Shows> }) => {
      let query = this._db.select({ count: count() }).from(shows);
      
      if (params?.where) {
        const conditions = Object.entries(params.where)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => eq(shows[key as keyof Shows], value));
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }
      
      const results = await query;
      return results[0]?.count || 0;
    }
  };

  /**
   * User operations
   */
  user = {
    findUnique: async (params: { where: { id?: string; email?: string } }) => {
      const { where } = params;
      let query = this._db.select().from(users);
      
      if (where.id) {
        query = query.where(eq(users.id, where.id));
      } else if (where.email) {
        query = query.where(eq(users.email, where.email));
      }
      
      const results = await query.limit(1);
      return results[0] || null;
    },

    findMany: async (params?: {
      where?: Partial<Users>;
      orderBy?: { [K in keyof Users]?: 'asc' | 'desc' };
      take?: number;
      skip?: number;
    }) => {
      let query = this._db.select().from(users);
      
      if (params?.where) {
        const conditions = Object.entries(params.where)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => eq(users[key as keyof Users], value));
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }
      
      if (params?.orderBy) {
        const orderByEntries = Object.entries(params.orderBy);
        if (orderByEntries.length > 0) {
          const [field, direction] = orderByEntries[0];
          query = query.orderBy(
            direction === 'desc' 
              ? desc(users[field as keyof Users])
              : asc(users[field as keyof Users])
          );
        }
      }
      
      if (params?.skip) {
        query = query.offset(params.skip);
      }
      
      if (params?.take) {
        query = query.limit(params.take);
      }
      
      return query;
    },

    create: async (params: { data: Omit<Users, 'id' | 'createdAt' | 'updatedAt'> }) => {
      const results = await this._db.insert(users).values(params.data).returning();
      return results[0];
    },

    update: async (params: {
      where: { id: string };
      data: Partial<Omit<Users, 'id' | 'createdAt'>>;
    }) => {
      const results = await this._db
        .update(users)
        .set({ ...params.data, updatedAt: new Date() })
        .where(eq(users.id, params.where.id))
        .returning();
      return results[0];
    }
  };

  /**
   * Venue operations
   */
  venue = {
    findUnique: async (params: { where: { id?: string; slug?: string } }) => {
      const { where } = params;
      let query = this._db.select().from(venues);
      
      if (where.id) {
        query = query.where(eq(venues.id, where.id));
      } else if (where.slug) {
        query = query.where(eq(venues.slug, where.slug));
      }
      
      const results = await query.limit(1);
      return results[0] || null;
    },

    findMany: async (params?: {
      where?: Partial<Venues>;
      orderBy?: { [K in keyof Venues]?: 'asc' | 'desc' };
      take?: number;
      skip?: number;
    }) => {
      let query = this._db.select().from(venues);
      
      if (params?.where) {
        const conditions = Object.entries(params.where)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => eq(venues[key as keyof Venues], value));
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }
      
      if (params?.orderBy) {
        const orderByEntries = Object.entries(params.orderBy);
        if (orderByEntries.length > 0) {
          const [field, direction] = orderByEntries[0];
          query = query.orderBy(
            direction === 'desc' 
              ? desc(venues[field as keyof Venues])
              : asc(venues[field as keyof Venues])
          );
        }
      }
      
      if (params?.skip) {
        query = query.offset(params.skip);
      }
      
      if (params?.take) {
        query = query.limit(params.take);
      }
      
      return query;
    },

    create: async (params: { data: Omit<Venues, 'id' | 'createdAt' | 'updatedAt'> }) => {
      const results = await this._db.insert(venues).values(params.data).returning();
      return results[0];
    }
  };

  /**
   * Sync job operations for import tracking
   */
  syncJob = {
    findMany: async (params?: {
      where?: Partial<SyncJobs>;
      orderBy?: { [K in keyof SyncJobs]?: 'asc' | 'desc' };
      take?: number;
    }) => {
      let query = this._db.select().from(syncJobs);
      
      if (params?.where) {
        const conditions = Object.entries(params.where)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => eq(syncJobs[key as keyof SyncJobs], value));
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }
      
      if (params?.orderBy) {
        const orderByEntries = Object.entries(params.orderBy);
        if (orderByEntries.length > 0) {
          const [field, direction] = orderByEntries[0];
          query = query.orderBy(
            direction === 'desc' 
              ? desc(syncJobs[field as keyof SyncJobs])
              : asc(syncJobs[field as keyof SyncJobs])
          );
        }
      }
      
      if (params?.take) {
        query = query.limit(params.take);
      }
      
      return query;
    },

    create: async (params: { data: Omit<SyncJobs, 'id' | 'createdAt' | 'updatedAt'> }) => {
      const results = await this._db.insert(syncJobs).values(params.data).returning();
      return results[0];
    },

    update: async (params: {
      where: { id: string };
      data: Partial<Omit<SyncJobs, 'id' | 'createdAt'>>;
    }) => {
      const results = await this._db
        .update(syncJobs)
        .set({ ...params.data, updatedAt: new Date() })
        .where(eq(syncJobs.id, params.where.id))
        .returning();
      return results[0];
    }
  };

  /**
   * Transaction support
   */
  async $transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    // For now, we'll use the same client instance
    // In a real implementation, you'd want to use Drizzle's transaction support
    return fn(this);
  }

  /**
   * Health check
   */
  async $health(): Promise<{ status: 'healthy' | 'unhealthy'; timestamp: string }> {
    try {
      await testConnection();
      return {
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
export const prisma = new PrismaClient();

// Export for testing
export { PrismaClient };

// Utility function for database health checks
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const health = await prisma.$health();
    return health.status === 'healthy';
  } catch {
    return false;
  }
}

// Connection utilities
export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}