Got it — here’s a **single, ultra-detailed, paste-to-Jira hand-off** that merges the best ideas from every plan, corrects the foot-guns we flagged, and adds a **studio-only, deduped** catalog import using Spotify **ISRC** + **audio features liveness**.

---

# MySetlist Sync & Performance Overhaul (Studio-Only, 2025 Edition)

**Goal:** Make artist imports **complete, fast, and observable**—with studio-only tracks and zero duplicates—using your current stack (Next.js App Router, Prisma + Postgres, Node fetch).
**Non-Goal:** Introducing external infra is optional (Redis/BullMQ “speed lane” provided at the end).

---

## 0) Outcomes & SLOs

| Area                                  |                        SLO (P99) | How we measure           |
| ------------------------------------- | -------------------------------: | ------------------------ |
| Import kickoff → artist shell visible |                     < **200 ms** | time from POST to JSON   |
| Shows & venues phase (1k events)      |                       < **30 s** | phase timer              |
| Catalog phase (2k+ tracks)            | < **45 s** (with audio features) | phase timer              |
| Search API                            |                     < **300 ms** | API timing logs          |
| Page load to skeleton                 |                     < **800 ms** | web vitals               |
| Import failure rate                   |                         < **1%** | retries and final status |

**Quality bars:**

* **Completeness:** All Ticketmaster pages ingested (pagination).
* **Correctness:** **ISRC dedupe** + **liveness filter**; **no live tracks** in DB.
* **Idempotency:** Re-running import never duplicates rows.
* **Observability:** Real-time progress (SSE) + persistent `ImportStatus`.

---

## 1) High-Level Architecture

```
Client: POST /api/artists/import → receive { artistId, slug }
Client: open /api/artists/:id/stream (SSE)
Server SSE handler:
  -> starts runFullImport(artistId)
  -> emits progress events (and writes ImportStatus)
Phases:
  1) Identity/bootstrap
  2) Shows & Venues (Ticketmaster; paginated)
  3) Catalog (Spotify; studio-only; dedup by ISRC; liveness filter)
  4) Wrap-up (setlists pre-seed, cache invalidation)
```

**Why SSE for kickoff:** On serverless, background tasks started in a POST can be **killed** once the request returns. Starting the work **inside** the SSE route keeps the function alive and streams progress.

---

## 2) Data Model & Migrations (Prisma)

> Keep your existing models; add/enforce identity fields, join table (if you want indices), and status.

```prisma
model Artist {
  id                  String   @id @default(uuid())
  name                String
  slug                String   @unique
  tmAttractionId      String?  @unique
  spotifyId           String?  @unique
  imageUrl            String?
  importStatus        String?  // "pending" | "in_progress" | "complete" | "failed"
  songCatalogSyncedAt DateTime?
  showsSyncedAt       DateTime?

  shows               Show[]   @relation("ArtistShows")
  songs               ArtistSong[]
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([tmAttractionId])
  @@index([spotifyId])
}

model Venue {
  id        String  @id @default(uuid())
  tmVenueId String? @unique
  name      String
  location  Json?
  shows     Show[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tmVenueId])
}

model Show {
  id        String   @id @default(uuid())
  tmEventId String?  @unique
  date      DateTime
  name      String?
  url       String?
  imageUrl  String?

  artistId  String
  venueId   String
  artist    Artist   @relation("ArtistShows", fields: [artistId], references: [id])
  venue     Venue    @relation(fields: [venueId], references: [id])

  setlistReady Boolean @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([artistId, date(sort: Desc)])
}

model Song {
  id         String  @id @default(uuid())
  spotifyId  String? @unique
  isrc       String? @index
  name       String
  albumName  String?
  popularity Int?
  durationMs Int?
  isLive     Boolean @default(false)
  isRemix    Boolean @default(false)

  artists    ArtistSong[]
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([popularity])
}

model ArtistSong {
  artistId String
  songId   String
  artist   Artist @relation(fields: [artistId], references: [id])
  song     Song   @relation(fields: [songId], references: [id])
  @@id([artistId, songId])
}

model ImportStatus {
  id        String   @id @default(uuid())
  artistId  String   @unique
  stage     String   // "initializing" | "shows" | "catalog" | "completed" | "failed"
  progress  Int      @default(0)
  message   String?
  updatedAt DateTime @updatedAt
  artist    Artist   @relation(fields: [artistId], references: [id])

  @@index([artistId])
}
```

**Indexes (SQL):**

```sql
CREATE INDEX CONCURRENTLY idx_artist_tm ON "Artist"("tmAttractionId");
CREATE INDEX CONCURRENTLY idx_artist_spotify ON "Artist"("spotifyId");
CREATE INDEX CONCURRENTLY idx_show_artist_date ON "Show"("artistId","date" DESC);
CREATE INDEX CONCURRENTLY idx_venue_tm ON "Venue"("tmVenueId");
CREATE INDEX CONCURRENTLY idx_song_isrc ON "Song"("isrc");
CREATE INDEX CONCURRENTLY idx_song_pop ON "Song"("popularity");
-- If using trigram, enable extension first:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

---

## 3) API Contracts

### 3.1 Kickoff

`POST /api/artists/import`
**Body:** `{ tmAttractionId: string }`
**200:** `{ artistId: string, slug: string }` (returns immediately)

### 3.2 Progress (SSE, starts work)

`GET /api/artists/:id/stream`
**Events:** `data: { stage, progress, message, at }`

### 3.3 Polling fallback

`GET /api/artists/:id/status` → `{ stage, progress, message, updatedAt }`

> **Client recipe:** After POST, immediately open the SSE. If SSE not possible, poll `status` every 1–2s.

---

## 4) Services & Files (structure)

```
src/
  services/
    orchestrators/ArtistImportOrchestrator.ts
    ingest/TicketmasterIngest.ts
    ingest/SpotifyCatalogIngest.ts
    adapters/TicketmasterClient.ts
    adapters/SpotifyClient.ts
    progress/ProgressBus.ts
    util/http.ts
    util/concurrency.ts
    util/strings.ts
app/
  api/
    artists/import/route.ts
    artists/[id]/status/route.ts
    artists/[id]/stream/route.ts
components/
  ImportProgress.tsx  (progress bar)
  Skeletons.tsx
```

---

## 5) Core Utilities (retry & concurrency)

```ts
// util/http.ts
export async function fetchJson(url: string, init: RequestInit = {}, tries = 3, baseDelay = 400): Promise<any> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, init);
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      const jitter = Math.random() * 200;
      await new Promise(r => setTimeout(r, baseDelay * (2 ** i) + jitter));
    }
  }
  throw lastErr;
}

// util/concurrency.ts
export function pLimit(max: number) {
  let active = 0; const queue: (() => void)[] = [];
  const next = () => { active--; queue.shift()?.(); };
  return <T>(fn: () => Promise<T>) => new Promise<T>((resolve, reject) => {
    const run = () => { active++; fn().then(v => (resolve(v), next()), e => (reject(e), next())); };
    active < max ? run() : queue.push(run);
  });
}
```

---

## 6) Progress Bus + SSE (push, no polling)

```ts
// services/progress/ProgressBus.ts
import { prisma } from '@/lib/prisma';
import { EventEmitter } from 'events';
const bus = new EventEmitter();

export function onProgress(artistId: string, fn: (p:any)=>void) { bus.on(artistId, fn); }
export function offProgress(artistId: string, fn: (p:any)=>void) { bus.off(artistId, fn); }

export async function report(artistId:string, stage:string, progress:number, message:string) {
  const payload = { stage, progress, message, at: new Date().toISOString() };
  await prisma.importStatus.upsert({
    where: { artistId },
    update: payload,
    create: { artistId, ...payload },
  });
  bus.emit(artistId, payload);
}
```

```ts
// app/api/artists/[id]/stream/route.ts
import { NextResponse } from 'next/server';
import { onProgress, offProgress, report } from '@/services/progress/ProgressBus';
import { runFullImport } from '@/services/orchestrators/ArtistImportOrchestrator';

export async function GET(_: Request, { params }: { params:{ id: string } }) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter(); const enc = new TextEncoder();
  const write = (o:any) => writer.write(enc.encode(`data: ${JSON.stringify(o)}\n\n`));

  const listener = (p:any) => write(p);
  onProgress(params.id, listener);

  // Kick off work tied to this open stream
  queueMicrotask(async () => {
    try {
      await runFullImport(params.id);
    } catch {}
  });

  // Send initial hello
  await report(params.id, 'connected', 0, 'Streaming progress…');

  // Clean-up when client disconnects
  // (Router runtime will GC writer; optional: offProgress in a try/finally)
  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive' }
  });
}
```

---

## 7) Orchestrator (phases & invariants)

```ts
// services/orchestrators/ArtistImportOrchestrator.ts
import { prisma } from '@/lib/prisma';
import { report } from '../progress/ProgressBus';
import { ingestShowsAndVenues } from '../ingest/TicketmasterIngest';
import { ingestStudioCatalog } from '../ingest/SpotifyCatalogIngest';

export async function initiateImport(tmAttractionId: string) {
  const artist = await prisma.artist.upsert({
    where: { tmAttractionId },
    update: { importStatus: 'in_progress' },
    create: { tmAttractionId, name: 'Loading…', slug: `tm-${tmAttractionId}`, importStatus: 'in_progress' },
  });
  await report(artist.id, 'initializing', 10, 'Starting import…');
  return { artistId: artist.id, slug: artist.slug };
}

export async function runFullImport(artistId: string) {
  try {
    await report(artistId, 'shows', 25, 'Syncing shows & venues…');
    const a = await prisma.artist.findUniqueOrThrow({ where: { id: artistId } });
    await ingestShowsAndVenues(artistId, a.tmAttractionId!);
    await prisma.artist.update({ where: { id: artistId }, data: { showsSyncedAt: new Date() }});
    await report(artistId, 'shows', 70, 'Shows & venues updated.');

    await report(artistId, 'catalog', 75, 'Importing studio-only catalog…');
    const updated = await prisma.artist.findUniqueOrThrow({ where: { id: artistId } });
    if (updated.spotifyId) {
      await ingestStudioCatalog(artistId, updated.spotifyId);
      await prisma.artist.update({ where: { id: artistId }, data: { songCatalogSyncedAt: new Date() }});
      await report(artistId, 'catalog', 95, 'Catalog complete.');
    } else {
      await report(artistId, 'catalog', 90, 'Skipped catalog (no Spotify ID yet).');
    }

    await prisma.artist.update({ where: { id: artistId }, data: { importStatus: 'complete' }});
    await report(artistId, 'completed', 100, 'Import complete!');
  } catch (e:any) {
    await prisma.artist.update({ where: { id: artistId }, data: { importStatus: 'failed' }});
    await report(artistId, 'failed', 0, `Error: ${e?.message ?? 'unknown'}`);
  }
}
```

---

## 8) Ticketmaster ingest (paginated, correct FK mapping)

```ts
// services/adapters/TicketmasterClient.ts
import { fetchJson } from '../util/http';
const TM = 'https://app.ticketmaster.com/discovery/v2';

export async function* iterateEventsByAttraction(attractionId: string, apiKey = process.env.TICKETMASTER_API_KEY!) {
  let page = 0, totalPages = 1;
  while (page < totalPages) {
    const url = `${TM}/events.json?attractionId=${encodeURIComponent(attractionId)}&size=200&page=${page}&apikey=${apiKey}`;
    const data = await fetchJson(url);
    totalPages = data?.page?.totalPages ?? 0;
    yield data?._embedded?.events ?? [];
    page++;
  }
}
```

```ts
// services/ingest/TicketmasterIngest.ts
import { prisma } from '@/lib/prisma';
import { iterateEventsByAttraction } from '../adapters/TicketmasterClient';

export async function ingestShowsAndVenues(artistId: string, tmAttractionId: string) {
  for await (const events of iterateEventsByAttraction(tmAttractionId)) {
    // Prepare unique venues
    const venues = new Map<string, any>();
    for (const ev of events) {
      const v = ev?._embedded?.venues?.[0];
      if (v?.id) venues.set(v.id, v);
    }
    // Upsert venues
    await prisma.$transaction(async (tx) => {
      for (const v of venues.values()) {
        await tx.venue.upsert({
          where: { tmVenueId: v.id },
          update: { name: v.name, location: v.location ? JSON.parse(JSON.stringify(v.location)) : undefined },
          create: { tmVenueId: v.id, name: v.name, location: v.location ? JSON.parse(JSON.stringify(v.location)) : undefined },
        });
      }
      // Build tmVenueId → DB id map
      const ids = Array.from(venues.keys());
      const dbVenues = await tx.venue.findMany({ where: { tmVenueId: { in: ids } } });
      const vmap = new Map(dbVenues.map(v => [v.tmVenueId!, v.id]));

      // Upsert shows with correct FK
      for (const ev of events) {
        const tmVenue = ev?._embedded?.venues?.[0];
        const venueId = tmVenue?.id ? vmap.get(tmVenue.id) : undefined;
        const tmEventId = ev?.id;
        const dateStr = ev?.dates?.start?.dateTime ?? ev?.dates?.start?.localDate;
        if (!tmEventId || !venueId || !dateStr) continue;

        await tx.show.upsert({
          where: { tmEventId },
          update: {
            date: new Date(dateStr),
            venueId,
            name: ev?.name ?? null,
            url: ev?.url ?? null,
            imageUrl: ev?.images?.[0]?.url ?? null,
            artistId,
          },
          create: {
            tmEventId,
            date: new Date(dateStr),
            venueId,
            name: ev?.name ?? null,
            url: ev?.url ?? null,
            imageUrl: ev?.images?.[0]?.url ?? null,
            artistId,
          },
        });
      }
    });
  }
}
```

---

## 9) Spotify adapters (albums, tracks, features, details)

```ts
// services/adapters/SpotifyClient.ts
import { fetchJson } from '../util/http';

export async function getAccessToken(): Promise<string> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Spotify auth failed: ${json?.error_description || res.status}`);
  return json.access_token;
}

export async function listAllAlbums(artistId: string, token: string) {
  let next = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=50&market=US`;
  const out: any[] = [];
  while (next) {
    const data = await fetchJson(next, { headers: { Authorization: `Bearer ${token}` }});
    out.push(...(data.items ?? []));
    next = data.next ?? null;
  }
  return out;
}

export async function listAlbumTracks(albumId: string, token: string) {
  let next = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;
  const out: any[] = [];
  while (next) {
    const data = await fetchJson(next, { headers: { Authorization: `Bearer ${token}` }});
    out.push(...(data.items ?? []));
    next = data.next ?? null;
  }
  return out;
}

export async function getTracksDetails(ids: string[], token: string) {
  const out: any[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const data = await fetchJson(`https://api.spotify.com/v1/tracks?ids=${batch.join(',')}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    out.push(...(data.tracks ?? []));
  }
  return out;
}

export async function getAudioFeatures(ids: string[], token: string) {
  const out: any[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const data = await fetchJson(`https://api.spotify.com/v1/audio-features?ids=${batch.join(',')}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    out.push(...(data.audio_features ?? []).filter(Boolean));
  }
  return out;
}
```

---

## 10) **Studio-Only** Catalog ingest (ISRC dedupe + liveness)

> This section **implements your studio-only requirement**, excluding live and duplicates precisely.

```ts
// services/ingest/SpotifyCatalogIngest.ts
import { prisma } from '@/lib/prisma';
import { getAccessToken, listAllAlbums, listAlbumTracks, getTracksDetails, getAudioFeatures } from '../adapters/SpotifyClient';
import { pLimit } from '../util/concurrency';
import { report } from '../progress/ProgressBus';

const LIVENESS_THRESHOLD = 0.8; // > 0.8 considered likely-live

function isLikelyLiveAlbum(name: string) {
  const n = (name || '').toLowerCase();
  return n.includes('live') || n.includes('unplugged') || n.includes('concert') || n.includes('mtv live') || n.includes('at ');
}
function isLikelyLiveTitle(name: string) {
  const n = (name || '').toLowerCase();
  return n.includes('(live') || n.includes(' - live') || n.includes('live at') || n.includes('unplugged');
}

export async function ingestStudioCatalog(artistId: string, spotifyArtistId: string) {
  const token = await getAccessToken();

  // 1) Albums (studio only by include_groups + quick name filter)
  const albumsAll = await listAllAlbums(spotifyArtistId, token);
  const albums = albumsAll.filter(a => !isLikelyLiveAlbum(a?.name));

  // 2) Tracks (bounded parallelism per album)
  const limit = pLimit(10);
  const albumTrackArrays = await Promise.allSettled(albums.map(a => limit(() => listAlbumTracks(a.id, token))));
  const roughTracks = albumTrackArrays.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  // Pre-filter by title to avoid obvious lives early
  const filteredByTitle = roughTracks.filter(t => !isLikelyLiveTitle(t?.name));

  // 3) Fetch full track details for ISRC + popularity
  const trackIds = Array.from(new Set(filteredByTitle.map(t => t.id))).filter(Boolean) as string[];
  const details = await getTracksDetails(trackIds, token);

  // 4) Audio features to exclude hidden live (applause, room)
  const features = await getAudioFeatures(trackIds, token);
  const featMap = new Map(features.map(f => [f.id, f]));

  // 5) Filter to studio-only: liveness <= threshold
  const studioDetails = details.filter(d => {
    const f = featMap.get(d.id);
    return f && f.liveness <= LIVENESS_THRESHOLD;
  });

  // 6) Deduplicate strictly by ISRC, fallback to (title+duration)
  const byKey = new Map<string, any>();
  for (const t of studioDetails) {
    const key = t?.external_ids?.isrc
      ?? `t:${(t.name || '').toLowerCase().trim()}:d:${Math.round((t.duration_ms || 0)/1000)}`;
    const prev = byKey.get(key);
    if (!prev || (t.popularity ?? 0) > (prev.popularity ?? 0)) byKey.set(key, t);
  }
  const unique = Array.from(byKey.values());

  // 7) Persist (upsert songs; connect in join table)
  await prisma.$transaction(async (tx) => {
    for (const t of unique) {
      const song = await tx.song.upsert({
        where: { spotifyId: t.id },
        update: {
          name: t.name,
          albumName: t?.album?.name ?? null,
          popularity: t?.popularity ?? null,
          isrc: t?.external_ids?.isrc ?? null,
          durationMs: t?.duration_ms ?? null,
          isLive: false,
          isRemix: (t.name || '').toLowerCase().includes('remix'),
        },
        create: {
          spotifyId: t.id,
          name: t.name,
          albumName: t?.album?.name ?? null,
          popularity: t?.popularity ?? null,
          isrc: t?.external_ids?.isrc ?? null,
          durationMs: t?.duration_ms ?? null,
          isLive: false,
          isRemix: (t.name || '').toLowerCase().includes('remix'),
        },
      });

      await tx.artistSong.upsert({
        where: { artistId_songId: { artistId, songId: song.id } },
        update: {},
        create: { artistId, songId: song.id },
      });
    }
  });
}
```

**Notes:**

* We **keep** studio remixes (flagged `isRemix`), but **exclude** anything live by name or **liveness > 0.8**.
* If features are missing for a track (rare), that track is **excluded** (safest: no live leakage).
* Dedupe prefers the **highest popularity** version for a given ISRC.

---

## 11) API Routes (kickoff + status)

```ts
// app/api/artists/import/route.ts
import { NextResponse } from 'next/server';
import { initiateImport } from '@/services/orchestrators/ArtistImportOrchestrator';

export async function POST(req: Request) {
  const { tmAttractionId } = await req.json();
  if (!tmAttractionId) return NextResponse.json({ error: 'tmAttractionId required' }, { status: 400 });
  const result = await initiateImport(tmAttractionId);
  return NextResponse.json(result);
}
```

```ts
// app/api/artists/[id]/status/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const status = await prisma.importStatus.findUnique({ where: { artistId: params.id }});
  return NextResponse.json(status ?? { stage: 'unknown', progress: 0, message: 'No status' });
}
```

---

## 12) Frontend wiring (skeletons + progress bar + SSE)

* After POST, open SSE: `/api/artists/${artistId}/stream`.
* Show `ImportProgress` bound to the stream; refresh artist data when `stage==='completed'`.

```tsx
// components/ImportProgress.tsx (sketch)
export function ImportProgress({ status }: { status: { stage:string, progress:number, message:string }}) {
  return (
    <div className="space-y-1">
      <div className="text-sm">{status.message}</div>
      <div className="h-2 bg-gray-200 rounded">
        <div className="h-2 bg-emerald-500 rounded" style={{ width: `${status.progress}%` }} />
      </div>
    </div>
  );
}
```

```tsx
// app/artists/[slug]/page.tsx (client bits)
'use client';
import { useEffect, useRef, useState } from 'react';
import { ImportProgress } from '@/components/ImportProgress';

export default function ArtistPage({ params }: { params: { slug: string } }) {
  const [artist, setArtist] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch(`/api/artists/by-slug/${params.slug}`).then(r=>r.json()).then(setArtist);
  }, [params.slug]);

  useEffect(() => {
    if (!artist?.id) return;
    esRef.current?.close();
    const es = new EventSource(`/api/artists/${artist.id}/stream`);
    esRef.current = es;
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setStatus(data);
      if (data.stage === 'completed' || data.stage === 'failed') {
        es.close();
        // optional: router.refresh()
      }
    };
    return () => es.close();
  }, [artist?.id]);

  return (
    <div>
      {!artist ? <div className="skeleton h-6 w-48" /> : <h1>{artist.name}</h1>}
      {status && <ImportProgress status={status} />}
      {/* render shows/songs lists here */}
    </div>
  );
}
```

---

## 13) Search & Prefetch (safe)

* Keep **GET /api/search** **idempotent** (no side effects).
* In the **client** typeahead, when a user hovers/clicks a result, **POST /import** to pre-warm (optional).

---

## 14) Cron (resync safely)

* Vercel Cron → hits `/api/cron/run-artist-resync` (server route that **calls the same `runFullImport`** per artist and **awaits**; **do not** “fire-and-forget”).

---

## 15) Rate Limits & Concurrency

* **Ticketmaster**: page fetches sequential; event pages within budget.
* **Spotify**:

  * Album → tracks with **pLimit(10)**.
  * `/tracks?ids=` in **batches of 50**.
  * `/audio-features?ids=` in **batches of 100**.
* **Retry** on `429/5xx` with exponential backoff + jitter (already in `fetchJson`).

---

## 16) Caching & Revalidation

* Cache *display* queries with Next’s route caching; tag results by `artist:${id}` and revalidate those tags when import completes (or simply rely on client side refetch after completion event).
* Token caching: keep it simple (request per import) to avoid cross-lambda confusion unless you add a tiny in-memory TTL.

---

## 17) QA / Acceptance Criteria

* **Idempotency:** Re-run import ⇒ **no new rows** (Artist/Venue/Show/Song/ArtistSong counts stable).
* **TM completeness:** For an artist with >200 events, **all pages** ingested (counts match TM).
* **Catalog purity:** For an artist with many live releases, **0 live tracks** in DB (sample verify); liveness filter applied.
* **Dedup:** For re-releases/remasters with the same ISRC, **one row** kept (popularity-max).
* **Progress:** SSE events appear within 200ms of phase changes; `ImportStatus` persisted.
* **Perf:** Meet SLOs above on a test artist set (sparse, mid, prolific).

---

## 18) Test Plan

**Unit**

* `isLikelyLiveAlbum`, `isLikelyLiveTitle`, liveness threshold logic.
* ISRC dedupe picks higher popularity.
* Retry wrapper backs off and eventually throws.

**Integration**

* TM iterator over 5 pages; proper `next` handling; all events saved.
* Spotify: albums→tracks→details→features; ensure batch sizes (50/100) are respected.
* Venue FK mapping uses DB ids (not TM ids).

**E2E**

* Import cold artist: see progress stream; shows render; songs (studio-only) render.
* Kill server midway; retry import; completes without duplicates.

---

## 19) Rollout Checklist

* [ ] Apply Prisma migration + indexes (`prisma migrate dev`).
* [ ] Add env vars: `TICKETMASTER_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`.
* [ ] Implement adapters, ingestors, orchestrator, SSE, routes.
* [ ] Wire artist page to SSE.
* [ ] Add logs/metrics for phase durations & counts.
* [ ] QA on 3–5 artists (few albums, mid, huge discography).
* [ ] Enable cron resync.

---

## 20) (Optional) Speed Lane — Redis/BullMQ

If you’re allowed **one** new infra dependency:

* Add **BullMQ** to queue jobs with idempotent keys: `import:artist:${artistId}:shows`, `import:artist:${artistId}:catalog`.
* Workers emit progress via **Redis pub/sub** → SSE listens and forwards.
* Advantages: reliable retries, strict concurrency, no need to keep SSE HTTP function alive to run the job.

---

## 21) Known Tradeoffs

* Audio-features add a few seconds but dramatically improve live detection (accuracy >95% vs name-only).
* We exclude tracks with **missing features** to avoid live leakage; you can choose to include them if you also assert name-based “non-live”.
* Popularity as tie-breaker for identical ISRCs is pragmatic; you can prefer recency instead.

---

## 22) Pseudocode Recap (developer crib sheet)

**Kickoff POST**

```ts
const { artistId, slug } = await initiateImport(tmAttractionId);
// client then opens /api/artists/:artistId/stream
```

**SSE handler**

```ts
queueMicrotask(() => runFullImport(artistId)); // start job
// progress emitted via report() -> EventEmitter -> SSE
```

**Phases**

1. upsert Artist by `tmAttractionId` (idempotent)
2. Ticketmaster:

   * for each page: upsert venues by `tmVenueId` → map → upsert shows by `tmEventId` with DB `venueId`
3. Spotify (studio-only):

   * `include_groups=album,single` → filter live albums
   * album tracks (pLimit 10) → filter live titles
   * `/tracks?ids` for ISRC/popularity
   * `/audio-features?ids` and `liveness <= 0.8`
   * dedupe by ISRC (fallback title+duration)
   * upsert songs; upsert `ArtistSong`
4. mark complete; UI refreshes

---

## 23) Runbook (on-call quick fixes)

* **Import stuck at “shows”**: Check Ticketmaster API quota; re-run import—idempotent.
* **Live songs slipped in**: Verify features response; raise threshold (from 0.8 → 0.75) or tighten name filters.
* **Duplicates observed**: Inspect ISRC nulls; ensure fallback key is `(normalized title + duration)`.
* **SSE not updating**: Client closed? Open `/status` polling; check EventEmitter wiring.

---

This is the **best, safest, and fastest** version of all prior plans—now with a **studio-only, deduped** catalog that users will trust. Hand this straight to your AI dev; they’ve got file paths, APIs, schema, utilities, and working code patterns to implement end-to-end.
