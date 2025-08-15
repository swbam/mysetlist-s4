# TheSet Services Layer

Core utilities and services implementing GROK.md specifications for production-ready artist import system.

## Architecture

```
services/
├── util/                     # Core utilities
│   ├── http.ts              # Advanced fetch with retry, backoff, jitter
│   ├── concurrency.ts       # pLimit and parallel processing
│   ├── strings.ts           # Text processing and normalization
│   └── index.ts             # Utility exports
├── progress/                 # Real-time progress tracking
│   ├── ProgressBus.ts       # EventEmitter-based progress with persistence
│   └── index.ts             # Progress exports
├── orchestrators/           # Import coordination
│   ├── ArtistImportOrchestrator.ts  # 3-phase import workflow
│   └── index.ts             # Orchestrator exports
└── index.ts                 # Main services export
```

## Features

### 🚀 High-Performance Import System
- **Phase 1**: Identity/Bootstrap (< 200ms) - Instant artist page creation
- **Phase 2**: Shows & Venues sync with paginated Ticketmaster integration
- **Phase 3**: Studio-only catalog with ISRC deduplication and liveness filtering

### 📡 Real-time Progress Tracking
- EventEmitter-based progress broadcasting
- Persistent storage with SSE support
- Phase timing and error reporting
- Global and per-import progress streams

### 🛠 Production-Ready Utilities
- Advanced HTTP client with exponential backoff and jitter
- Bounded parallelism with pLimit implementation
- Text processing with live/remix detection
- ISRC-based deduplication

## Usage

### Basic Import

```typescript
import { initiateImport, runFullImport } from '@/lib/services';

// Phase 1: Create artist record immediately
const { artistId, slug } = await initiateImport('tm-123456');

// Phase 2-3: Complete import in background
const result = await runFullImport(artistId);
```

### Progress Tracking

```typescript
import { ProgressBus } from '@/lib/services';

// Subscribe to progress events
ProgressBus.onProgress(artistId, (event) => {
  console.log(`${event.stage}: ${event.progress}% - ${event.message}`);
});

// Create scoped reporter
const reporter = ProgressBus.createReporter(artistId, { 
  artistName: 'Taylor Swift',
  jobId: 'import-123' 
});

await reporter.report('importing-songs', 50, 'Processing albums...');
```

### HTTP Utilities

```typescript
import { fetchJson, batchFetch } from '@/lib/services';

// Advanced fetch with retry
const data = await fetchJson('/api/endpoint', {}, {
  tries: 3,
  baseDelay: 400,
  jitter: true,
  retryOn: (response) => response.status >= 500
});

// Batch processing with concurrency
const results = await batchFetch(
  requests,
  { concurrency: 5 }
);
```

### Concurrency Control

```typescript
import { pLimit, processBatch } from '@/lib/services';

// Limit concurrent operations
const limit = pLimit(10);
const promises = items.map(item => 
  limit(() => processItem(item))
);

// Batch processing with progress
await processBatch(
  items,
  async (item) => await processItem(item),
  {
    concurrency: 5,
    onProgress: (completed, total) => {
      console.log(`${completed}/${total} completed`);
    }
  }
);
```

## Configuration

```typescript
import { initializeServices } from '@/lib/services';

const config = initializeServices({
  ticketmasterApiKey: process.env.TICKETMASTER_API_KEY,
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  defaultConcurrency: 10,
  defaultRetries: 3,
  enableProgressTracking: true,
});
```

## Performance Specifications

### SLOs (P99)
- **Import kickoff**: < 200ms
- **Shows & venues phase**: < 30s (1k events)  
- **Catalog phase**: < 45s (2k+ tracks with audio features)
- **Import failure rate**: < 1%

### Quality Guarantees
- **Completeness**: All Ticketmaster pages ingested (pagination)
- **Correctness**: ISRC dedupe + liveness filter (no live tracks)
- **Idempotency**: Re-running import never duplicates rows
- **Observability**: Real-time progress via SSE + persistent status

## Studio-Only Catalog Implementation

The catalog import implements strict studio-only filtering:

1. **Album filtering**: Exclude albums with live indicators in name
2. **Track filtering**: Exclude tracks with live indicators in title  
3. **Audio features**: Use Spotify liveness threshold (> 0.8 = likely live)
4. **ISRC deduplication**: Prefer highest popularity for same ISRC
5. **Fallback deduplication**: Use normalized title + duration

```typescript
// Liveness filtering
const LIVENESS_THRESHOLD = 0.8;
const studioTracks = trackDetails.filter(track => {
  const features = featuresMap.get(track.id);
  return features && features.liveness <= LIVENESS_THRESHOLD;
});

// ISRC deduplication
const deduplicatedTracks = this.deduplicateByISRC(studioTracks);
```

## Error Handling

All services implement comprehensive error handling:

- **HTTP errors**: Automatic retry with exponential backoff
- **Rate limiting**: Built-in 429 handling with jitter
- **Network errors**: Configurable retry behavior
- **Progress errors**: Automatic failure reporting and cleanup

## Testing

```bash
# Run service tests
pnpm test lib/services

# Test import flow
pnpm test:integration import-flow

# Load testing
pnpm test:load artist-import
```

## Integration

### SSE Progress Streaming

```typescript
// app/api/artists/[id]/stream/route.ts
import { ProgressBus, runFullImport } from '@/lib/services';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  
  ProgressBus.onProgress(params.id, (event) => {
    writer.write(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
  });
  
  // Start import
  queueMicrotask(() => runFullImport(params.id));
  
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
```

### API Routes

```typescript
// app/api/artists/import/route.ts
import { initiateImport } from '@/lib/services';

export async function POST(request: Request) {
  const { tmAttractionId } = await request.json();
  const result = await initiateImport(tmAttractionId);
  return Response.json(result);
}
```

## Environment Variables

```bash
# Required for full functionality
TICKETMASTER_API_KEY=your_key_here
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# Optional performance tuning
DEFAULT_CONCURRENCY=5
DEFAULT_RETRIES=3
DEFAULT_TIMEOUT=30000
```

## Monitoring

The services layer provides built-in monitoring:

- **Progress tracking**: Real-time import status
- **Phase timing**: Detailed performance metrics  
- **Error tracking**: Comprehensive error capture
- **Resource usage**: Concurrency and queue monitoring

All metrics are accessible via the ProgressBus and can be integrated with monitoring systems.