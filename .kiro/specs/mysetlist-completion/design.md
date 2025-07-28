# MySetlist App Completion - Design Document

## Overview

This design document outlines the architecture and implementation approach for completing the MySetlist concert setlist voting application. The design builds upon the existing Next-Forge foundation and focuses on the core user journey: discovering artists, viewing their shows, and voting on setlists.

The application follows a modern, scalable architecture using Next.js 15, Supabase for backend services, and a streamlined package-based monorepo structure. The design emphasizes the core setlist voting functionality, real-time updates, and seamless user experience from search to voting.

## Architecture

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MySetlist Application                     │
├─────────────────────────────────────────────────────────────┤
│  Frontend Layer (Next.js 15 + React 19)                    │
│  ├── App Router Pages        ├── Real-time Components      │
│  ├── Server Components       ├── Client Components        │
│  ├── API Routes             └── Middleware                 │
├─────────────────────────────────────────────────────────────┤
│  Package Layer (Monorepo Packages)                         │
│  ├── @repo/auth             ├── @repo/database            │
│  ├── @repo/design-system    ├── @repo/external-apis       │
│  └── @repo/observability                                   │
├─────────────────────────────────────────────────────────────┤
│  Backend Services                                           │
│  ├── Supabase (PostgreSQL)  ├── Upstash Redis             │
│  ├── Supabase Auth          └── Supabase Realtime         │
│  └── External APIs                                         │
├─────────────────────────────────────────────────────────────┤
│  External Integrations                                      │
│  ├── Spotify API           ├── Ticketmaster API           │
│  ├── Setlist.fm API        ├── PostHog Analytics          │
│  └── Sentry Monitoring     └── Vercel Deployment          │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
User Interaction
       ↓
Next.js App Router
       ↓
┌─────────────────┬─────────────────┐
│  Server Actions │   API Routes    │
│  (Form Handling)│  (External APIs)│
└─────────────────┴─────────────────┘
       ↓
Package Layer Services
       ↓
┌─────────────────┬─────────────────┐
│   Supabase DB   │   Redis Cache   │
│  (Primary Data) │  (Performance)  │
└─────────────────┴─────────────────┘
       ↓
Real-time Updates
       ↓
Client Components
```

## Components and Interfaces

### Authentication System Design

#### Auth Package Structure

```typescript
// packages/auth/src/types/auth.ts
export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  spotifyConnected: boolean;
  profile: UserProfile;
  preferences: UserPreferences;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  spotifyTokens?: SpotifyTokens;
}

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string[];
}
```

#### Authentication Flow Design

```typescript
// packages/auth/src/providers/unified-auth.ts
export class UnifiedAuthProvider {
  // Handles email/password and Spotify OAuth
  async signIn(
    method: "email" | "spotify",
    credentials?: any,
  ): Promise<AuthSession>;
  async signUp(
    email: string,
    password: string,
    metadata?: any,
  ): Promise<AuthUser>;
  async linkSpotify(userId: string): Promise<SpotifyTokens>;
  async refreshTokens(refreshToken: string): Promise<AuthSession>;
  async signOut(): Promise<void>;
}
```

### Database Schema Completion

#### Enhanced Schema Design

```typescript
// packages/database/src/schema/enhanced-users.ts
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  displayName: text("display_name"),
  bio: text("bio"),
  location: text("location"),
  website: text("website"),
  avatarUrl: text("avatar_url"),
  spotifyProfile: text("spotify_profile"), // JSON
  musicPreferences: text("music_preferences"), // JSON
  privacySettings: text("privacy_settings"), // JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Enhanced voting system with analytics
export const voteAnalytics = pgTable("vote_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  setlistSongId: uuid("setlist_song_id")
    .references(() => setlistSongs.id)
    .notNull(),
  totalVotes: integer("total_votes").default(0),
  upvotePercentage: doublePrecision("upvote_percentage").default(0),
  voteVelocity: doublePrecision("vote_velocity").default(0), // votes per hour
  peakVotingTime: timestamp("peak_voting_time"),
  demographicData: text("demographic_data"), // JSON
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### External API Integration Design

#### API Client Architecture

```typescript
// packages/external-apis/src/clients/unified-client.ts
export class UnifiedAPIClient {
  private spotify: SpotifyClient;
  private ticketmaster: TicketmasterClient;
  private setlistfm: SetlistFmClient;
  private cache: IntelligentCache;
  private rateLimiter: RateLimiter;

  async syncArtistData(artistId: string): Promise<EnrichedArtist> {
    // Combines data from all three APIs with intelligent caching
  }

  async syncShowData(showId: string): Promise<EnrichedShow> {
    // Fetches show data with venue and artist details
  }

  async syncSetlistData(
    artistId: string,
    showDate: Date,
  ): Promise<HistoricalSetlist[]> {
    // Retrieves historical setlists for prediction algorithms
  }
}
```

#### Data Synchronization Strategy

```typescript
// packages/external-apis/src/services/sync-orchestrator.ts
export class SyncOrchestrator {
  async executeHourlySync(): Promise<void> {
    // 1. Sync trending artists from Spotify
    // 2. Update upcoming shows from Ticketmaster
    // 3. Refresh popular venue data
    // 4. Update vote analytics and trending scores
  }

  async executeDailySync(): Promise<void> {
    // 1. Full artist catalog sync for popular artists
    // 2. Historical setlist import from Setlist.fm
    // 3. Clean up expired data and optimize database
    // 4. Generate analytics reports
  }

  async executeWeeklySync(): Promise<void> {
    // 1. Deep sync of artist discographies
    // 2. Venue capacity and details updates
    // 3. User preference analysis and recommendations
    // 4. Performance optimization and cleanup
  }
}
```

### Real-time Voting System Design

#### WebSocket Architecture

```typescript
// apps/web/lib/realtime/voting-manager.ts
export class VotingManager {
  private supabase: SupabaseClient;
  private subscriptions: Map<string, RealtimeChannel>;

  async subscribeToSetlist(
    setlistId: string,
    callback: VoteUpdateCallback,
  ): Promise<void> {
    const channel = this.supabase
      .channel(`setlist:${setlistId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `setlist_song_id=in.(select id from setlist_songs where setlist_id=eq.${setlistId})`,
        },
        callback,
      )
      .subscribe();

    this.subscriptions.set(setlistId, channel);
  }

  async castVote(
    userId: string,
    setlistSongId: string,
    voteType: "up" | "down",
  ): Promise<void> {
    // Optimistic updates with conflict resolution
    // Real-time broadcast to all connected clients
    // Analytics tracking and vote validation
  }
}
```

#### Vote Aggregation System

```typescript
// packages/database/src/queries/vote-aggregation.ts
export class VoteAggregationService {
  async updateVoteCounts(setlistSongId: string): Promise<void> {
    // Use database triggers for real-time count updates
    // Calculate trending scores based on vote velocity
    // Update setlist accuracy predictions
  }

  async calculateSetlistAccuracy(
    setlistId: string,
    actualSetlist?: string[],
  ): Promise<number> {
    // Compare predicted vs actual setlists
    // Weight votes by user reputation and timing
    // Return accuracy percentage for gamification
  }
}
```

### Search and Discovery System Design

#### Unified Search Architecture

```typescript
// apps/web/lib/search/unified-search.ts
export class UnifiedSearchService {
  async search(query: string, filters: SearchFilters): Promise<SearchResults> {
    const results = await Promise.all([
      this.searchArtists(query, filters),
      this.searchShows(query, filters),
      this.searchVenues(query, filters),
      this.searchSongs(query, filters),
    ]);

    return this.rankAndMergeResults(results, query);
  }

  private async searchArtists(
    query: string,
    filters: SearchFilters,
  ): Promise<ArtistResult[]> {
    // Full-text search with PostgreSQL
    // Boost results by popularity and user preferences
    // Include Spotify data for rich results
  }

  private rankAndMergeResults(
    results: SearchResult[][],
    query: string,
  ): SearchResults {
    // Implement relevance scoring algorithm
    // Consider user location, preferences, and history
    // Return paginated, ranked results
  }
}
```

#### Recommendation Engine

```typescript
// apps/web/lib/recommendations/recommendation-engine.ts
export class RecommendationEngine {
  async getPersonalizedRecommendations(
    userId: string,
  ): Promise<Recommendation[]> {
    // Analyze user's voting history and followed artists
    // Use Spotify listening data if connected
    // Consider location for local show recommendations
    // Apply collaborative filtering for similar users
  }

  async getTrendingContent(): Promise<TrendingContent> {
    // Calculate trending scores based on vote velocity
    // Consider show proximity and ticket availability
    // Weight by social media mentions and streaming data
  }
}
```

### Mobile-First UI Design

#### Responsive Component Architecture

```typescript
// packages/design-system/src/components/adaptive/adaptive-layout.tsx
export const AdaptiveLayout = ({ children, variant }: AdaptiveLayoutProps) => {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  return (
    <div className={cn(
      'container mx-auto px-4',
      isMobile && 'px-2 py-4',
      isTablet && 'px-6 py-6',
      isDesktop && 'px-8 py-8'
    )}>
      {children}
    </div>
  );
};

// Touch-optimized voting interface
export const MobileVotingInterface = ({ setlistSong }: MobileVotingProps) => {
  return (
    <div className="flex items-center justify-between p-4 touch-manipulation">
      <SongInfo song={setlistSong.song} />
      <VotingButtons
        songId={setlistSong.id}
        currentVote={setlistSong.userVote}
        votes={setlistSong.votes}
        size="large" // Touch-friendly sizing
        hapticFeedback={true}
      />
    </div>
  );
};
```

#### Performance Optimization

```typescript
// apps/web/lib/performance/optimization-manager.ts
export class PerformanceManager {
  async optimizeImageLoading(): Promise<void> {
    // Implement Next.js Image optimization with lazy loading
    // Use WebP/AVIF formats for better compression
    // Implement responsive image sizing
  }

  async optimizeDataFetching(): Promise<void> {
    // Implement intelligent caching with Redis
    // Use React Query for client-side caching
    // Optimize database queries with proper indexing
  }
}
```

## Data Models

### Enhanced User Model

```typescript
export interface EnhancedUser {
  id: string;
  email: string;
  profile: {
    displayName: string;
    bio?: string;
    location?: string;
    avatarUrl?: string;
  };
  preferences: {
    privacySettings: PrivacySettings;
    musicPreferences: MusicPreferences;
    followedArtists: string[];
  };
  connections: {
    spotify?: SpotifyConnection;
  };
  stats: {
    totalVotes: number;
    accuracyScore: number;
    followedArtists: number;
    attendedShows: number;
  };
}
```

### Comprehensive Show Model

```typescript
export interface EnhancedShow {
  id: string;
  name: string;
  slug: string;
  date: Date;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";

  artists: {
    headliner: Artist;
    supporting: Artist[];
  };

  venue: {
    id: string;
    name: string;
    location: Location;
    capacity?: number;
  };

  tickets: {
    url?: string;
    priceRange?: PriceRange;
    availability: "available" | "sold_out" | "limited";
  };

  setlists: {
    predicted: Setlist[];
    actual?: Setlist[];
  };

  analytics: {
    viewCount: number;
    voteCount: number;
    attendeeCount: number;
    trendingScore: number;
  };

  realtime: {
    isLive: boolean;
    currentSong?: Song;
    liveUpdates: boolean;
  };
}
```

### Advanced Setlist Model

```typescript
export interface EnhancedSetlist {
  id: string;
  showId: string;
  artistId: string;
  type: "predicted" | "actual";

  songs: SetlistSong[];

  metadata: {
    totalVotes: number;
    accuracyScore?: number;
    isLocked: boolean;
    lockReason?: string;
  };

  analytics: {
    voteVelocity: number;
    peakVotingTime?: Date;
    demographicBreakdown: VoteDemographics;
  };

  predictions: {
    confidence: number;
    algorithmVersion: string;
    basedOnShows: string[];
  };
}
```

## Error Handling

### Comprehensive Error Strategy

```typescript
// apps/web/lib/errors/error-handler.ts
export class ErrorHandler {
  static handleAPIError(error: APIError): ErrorResponse {
    switch (error.type) {
      case "RATE_LIMIT_EXCEEDED":
        return {
          message: "Too many requests. Please try again later.",
          retryAfter: error.retryAfter,
          action: "retry",
        };

      case "EXTERNAL_API_ERROR":
        return {
          message: "External service temporarily unavailable.",
          fallback: "cached_data",
          action: "fallback",
        };

      case "VALIDATION_ERROR":
        return {
          message: error.message,
          fields: error.fields,
          action: "fix_input",
        };

      default:
        // Log to Sentry for unknown errors
        Sentry.captureException(error);
        return {
          message: "Something went wrong. Please try again.",
          action: "retry",
        };
    }
  }

  static handleRealtimeError(error: RealtimeError): void {
    // Implement reconnection logic
    // Show user-friendly offline indicators
    // Queue actions for when connection restored
  }
}
```

### Circuit Breaker Implementation

```typescript
// packages/external-apis/src/utils/circuit-breaker.ts
export class CircuitBreaker {
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private failures = 0;
  private nextAttempt = 0;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() < this.nextAttempt) {
        throw new Error("Circuit breaker is OPEN");
      }
      this.state = "HALF_OPEN";
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure(): void {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

## Testing Strategy

### Comprehensive Testing Approach

```typescript
// Testing pyramid implementation
export const TestingStrategy = {
  unit: {
    // Jest + Vitest for package-level testing
    coverage: "90%+",
    focus: ["business logic", "utilities", "data transformations"],
  },

  integration: {
    // API route testing with test database
    coverage: "80%+",
    focus: ["API endpoints", "database operations", "external API mocks"],
  },

  e2e: {
    // Playwright for critical user journeys
    coverage: "key flows",
    focus: ["authentication", "voting", "search", "mobile responsive"],
  },

  performance: {
    // Lighthouse CI + K6 load testing
    metrics: ["Core Web Vitals", "API response times", "database performance"],
  },

  accessibility: {
    // Axe-core integration
    compliance: "WCAG 2.1 AA",
    testing: ["keyboard navigation", "screen readers", "color contrast"],
  },
};
```

### Test Data Management

```typescript
// apps/web/test-utils/test-data-factory.ts
export class TestDataFactory {
  static createUser(overrides?: Partial<User>): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      profile: {
        displayName: faker.person.fullName(),
        bio: faker.lorem.sentence(),
      },
      ...overrides,
    };
  }

  static createShow(overrides?: Partial<Show>): Show {
    return {
      id: faker.string.uuid(),
      name: `${faker.music.artist()} Live`,
      date: faker.date.future(),
      venue: this.createVenue(),
      ...overrides,
    };
  }

  static async seedTestDatabase(): Promise<void> {
    // Create realistic test data for development and testing
    // Maintain referential integrity
    // Support different test scenarios
  }
}
```

This comprehensive design provides a solid foundation for completing the MySetlist application with all required features, proper architecture, and production-ready reliability.
