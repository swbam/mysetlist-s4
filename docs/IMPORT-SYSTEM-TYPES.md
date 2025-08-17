# Import System Type Definitions - Complete Reference

## Database Schema Types

### Artists Table
```typescript
{
  id: uuid (primary key)
  tmAttractionId: string | null (unique) // Ticketmaster Attraction ID
  spotifyId: string | null (unique)
  mbid: string | null (unique) // MusicBrainz ID for Setlist.fm
  name: string (required)
  slug: string (unique, required)
  imageUrl: string | null
  smallImageUrl: string | null
  genres: string | null // JSON stringified array
  popularity: number (default: 0)
  followers: number (default: 0) // Spotify followers
  followerCount: number (default: 0) // App followers
  monthlyListeners: number | null
  verified: boolean (default: false)
  externalUrls: string | null // JSON stringified object
  importStatus: string | null // "pending" | "in_progress" | "complete" | "failed"
  lastSyncedAt: Date | null
  songCatalogSyncedAt: Date | null
  showsSyncedAt: Date | null
  totalAlbums: number (default: 0)
  totalSongs: number (default: 0)
  lastFullSyncAt: Date | null
  trendingScore: number (default: 0)
  totalShows: number (default: 0)
  upcomingShows: number (default: 0)
  totalSetlists: number (default: 0)
  createdAt: Date
  updatedAt: Date
}
```

### Songs Table
```typescript
{
  id: uuid (primary key)
  spotifyId: string | null (unique)
  isrc: string | null // International Standard Recording Code
  name: string (required) // Song title
  artist: string (required) // Primary artist name
  albumName: string | null
  albumId: string | null
  trackNumber: number | null
  discNumber: number (default: 1)
  albumType: string | null // 'album' | 'single' | 'compilation'
  albumArtUrl: string | null
  releaseDate: string | null // Date string
  durationMs: number | null
  popularity: number (default: 0)
  previewUrl: string | null
  spotifyUri: string | null
  externalUrls: string | null // JSON stringified object
  isExplicit: boolean (default: false)
  isPlayable: boolean (default: true)
  isLive: boolean (default: false)
  isRemix: boolean (default: false)
  acousticness: string | null
  danceability: string | null
  energy: string | null
  valence: string | null
  createdAt: Date
  updatedAt: Date
}
```

### Shows Table
```typescript
{
  id: uuid (primary key)
  headlinerArtistId: uuid | null (references artists.id)
  venueId: uuid | null (references venues.id)
  name: string | null
  slug: string | null (unique)
  date: string | null // Date string
  startTime: string | null // Time string
  doorsTime: string | null // Time string
  status: "upcoming" | "ongoing" | "completed" | "cancelled" (default: "upcoming")
  description: string | null
  ticketUrl: string | null
  minPrice: number | null
  maxPrice: number | null
  currency: string (default: "USD")
  viewCount: number (default: 0)
  attendeeCount: number (default: 0)
  setlistCount: number (default: 0)
  voteCount: number (default: 0)
  trendingScore: number (default: 0)
  isFeatured: boolean (default: false)
  isVerified: boolean (default: false)
  tmEventId: string | null (unique) // Ticketmaster Event ID
  setlistFmId: string | null
  setlistReady: boolean (default: false)
  createdAt: Date | null
  updatedAt: Date | null
}
```

### Setlists Table
```typescript
{
  id: uuid (primary key)
  showId: uuid (required, references shows.id)
  artistId: uuid (required, references artists.id)
  type: "predicted" | "actual" (required)
  name: string (default: "Main Set")
  orderIndex: number (default: 0)
  isLocked: boolean (default: false)
  totalVotes: number (default: 0)
  accuracyScore: number (default: 0) // 0-100
  moderationStatus: "pending" | "approved" | "rejected" | "flagged" (default: "approved")
  importedFrom: string | null // 'setlist.fm' | 'manual' | 'api'
  externalId: string | null
  importedAt: Date | null
  createdBy: uuid | null (references users.id)
  createdAt: Date
  updatedAt: Date
}
```

### SetlistSongs Table
```typescript
{
  id: uuid (primary key)
  setlistId: uuid (required, references setlists.id)
  songId: uuid (required, references songs.id)
  position: number (required)
  notes: string | null // "acoustic", "cover", "new song", etc.
  isPlayed: boolean | null // For actual setlists
  playTime: Date | null // When song was played
  upvotes: number (default: 0) // Denormalized for performance
  createdAt: Date
  updatedAt: Date
}
```

### ArtistSongs Table (Junction)
```typescript
{
  artistId: uuid (required, references artists.id)
  songId: uuid (required, references songs.id)
  isPrimaryArtist: boolean (default: true)
  createdAt: Date
  updatedAt: Date
  // Composite primary key: (artistId, songId)
}
```

## Queue Job Types

### ArtistImportJob
```typescript
interface ArtistImportJob {
  tmAttractionId: string;
  artistId?: string; // Artist ID if already created (Phase 1 complete)
  priority?: Priority;
  adminImport?: boolean;
  userId?: string;
  phase1Complete?: boolean; // True if Phase 1 already executed
  syncOnly?: boolean; // True if syncing existing artist
}
```

### SpotifySyncJob
```typescript
interface SpotifySyncJob {
  artistId: string;
  spotifyId: string;
  syncType: 'profile' | 'albums' | 'tracks' | 'full';
  options?: {
    includeCompilations?: boolean;
    includeAppearsOn?: boolean;
    skipLive?: boolean;
  };
}
```

### TicketmasterSyncJob
```typescript
interface TicketmasterSyncJob {
  artistId: string;
  tmAttractionId: string;
  syncType: 'shows' | 'venues' | 'full';
  options?: {
    includePast?: boolean;
    maxShows?: number;
  };
}
```

## API Response Types

### Import API Response (`/api/artists/import`)
```typescript
interface ImportResponse {
  success: boolean;
  artistId: string;
  slug: string;
  name: string;
  imageUrl?: string;
  jobId: string;
  isExisting: boolean;
  message: string;
}
```

### Import Progress Type
```typescript
interface ImportProgress {
  stage: "initializing" | "syncing-identifiers" | "importing-songs" | 
         "importing-shows" | "creating-setlists" | "completed" | "failed";
  progress: number; // 0-100
  message: string;
  error?: string;
  completedAt?: string;
  artistId?: string;
  totalSongs?: number;
  totalShows?: number;
  totalVenues?: number;
  phaseStartTime?: number;
  estimatedTimeRemaining?: number;
  metrics?: {
    showsImported?: number;
    venuesCreated?: number;
    songsImported?: number;
    setlistsCreated?: number;
  };
}
```

## Redis Channel Naming Convention

### Progress Channels
- **Pattern**: `import:progress:{jobId}`
- **Purpose**: Real-time progress updates via SSE
- **Example**: `import:progress:import_K8xDtP3QR_1734567890123`

### Status Cache Keys  
- **Pattern**: `import:status:{jobId}`
- **Purpose**: Cached import status
- **TTL**: 300 seconds (5 minutes)
- **Example**: `import:status:import_K8xDtP3QR_1734567890123`

## Import Flow Data Types

### Phase 1 Result (Instant, < 3s)
```typescript
interface Phase1Result {
  artistId: string;
  slug: string;
  name: string;
  imageUrl?: string;
  spotifyId?: string;
  tmAttractionId: string;
  genres: string[];
  popularity: number;
  followers: number;
}
```

### Phase 2 Result (Background, 3-15s)
```typescript
interface Phase2Result {
  shows: Show[];
  venues: number;
  topSongs: Song[];
  setlistsCreated: number;
}
```

### Phase 3 Result (Background, 15-90s)
```typescript
interface Phase3Result {
  totalSongs: number;
  totalAlbums: number;
  studioTracks: number;
  skippedLiveTracks: number;
  deduplicatedTracks: number;
}
```

## Frontend Types

### SearchResultItem
```typescript
interface SearchResultItem {
  id: string;
  type: "artist";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  slug?: string;
  source?: "database" | "ticketmaster";
  requiresSync?: boolean;
  externalId?: string;
  popularity?: number;
  genres?: string[];
}
```

## Key Field Mappings

### Spotify Track → Songs Table
```typescript
{
  track.id → spotifyId
  track.name → name
  track.artists[0].name → artist
  track.album.name → albumName
  track.album.id → albumId
  track.preview_url → previewUrl
  track.explicit → isExplicit
  track.popularity → popularity
  track.duration_ms → durationMs
  track.external_ids.isrc → isrc
  track.track_number → trackNumber
  track.album.release_date → releaseDate
  track.album.album_type → albumType
  track.album.images[0].url → albumArtUrl
  track.uri → spotifyUri
  track.external_urls → externalUrls (JSON.stringify)
}
```

### Ticketmaster Event → Shows Table
```typescript
{
  event.id → tmEventId
  event.name → name
  event.dates.start.localDate → date
  event.dates.start.localTime → startTime
  event.url → ticketUrl
  event._embedded.venues[0].id → venueId (after venue creation)
  event._embedded.attractions[0].id → headlinerArtistId (after artist lookup)
}
```

## Important Notes

1. **Always use job ID for Redis channels**, not artist ID
2. **JSON fields must be stringified** before storing (genres, externalUrls)
3. **Date fields can be Date objects or ISO strings** depending on context
4. **All IDs are UUIDs** generated by the database
5. **Phase 1 must complete synchronously** for instant navigation
6. **Phases 2 & 3 run in parallel** for optimal performance
7. **Setlists are created immediately** after shows and minimum songs are ready
8. **Use type casting `as const`** for enum values in TypeScript
9. **Always handle null/undefined** for optional fields
10. **Redis TTL is 5 minutes** for status cache keys