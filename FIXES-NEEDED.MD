````markdown
<!-- =========================================================
     ULTRA-DETAILED IMPLEMENTATION OUTLINE
     Project: “mysetlist-s4”
     Audience: An AI coder who has never seen the repo
     Goal   : Take the repo from 60 % → 100 % production-grade
     Notes  : One contiguous markdown file for copy-paste
     ========================================================= -->

# 📌 0. Executive Brief

| Field            | Value                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repository       | https://github.com/swbam/mysetlist-s4 (public)                                                                                                   |
| Current Status   | ~60 % feature-complete.                                                                                                                          |
| Tech Stack       | Next.js 14 App Router, TypeScript, Supabase (Auth + Postgres), Drizzle ORM, TailwindCSS, Vercel, Upstash Redis, Ticketmaster API, setlist.fm API |
| Happy Path Works | Create poll → vote → see results locally                                                                                                         |
| Major Gaps       | Artist/Show/Song ingestion, cron polls, rate-limiting, RLS, tests, CI/CD, infra-as-code                                                          |

<!-- --------------------------------------------------------- -->

# 1. File-Tree Snapshot (as cloned 2025-07-12)

```text
mysetlist-s4/
├── README.md                               # outdated, still references NextAuth
├── .env.example                            # incomplete
├── package.json
├── next.config.js
├── tailwind.config.js
├── vercel.json                             # no cron entries
├── drizzle.config.ts
├── supabase/
│   ├── migrations/
│   │   └── 20240520123456_initial.sql     # only one migration
│   └── config.toml                         # Spotify OAuth configured
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── polls/
│   │   │   ├── auth/
│   │   │   └── cron/close-polls/route.ts  # stub present
│   │   ├── polls/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── components/
│   ├── lib/
│   │   ├── supabase/
│   │   └── db/schema.ts
└── (no tests, no Dockerfile, no Terraform)
```
````

<!-- --------------------------------------------------------- -->

# 2. Core User Stories

| ID   | Story                                                                                       | Status |
| ---- | ------------------------------------------------------------------------------------------- | ------ |
| US-1 | As a **fan**, I type an artist name and see Ticketmaster search results instantly           | 🔴     |
| US-2 | As a **fan**, I click an uncached artist → background job imports artist + shows + setlists | 🔴     |
| US-3 | As a **fan**, I create a setlist poll linked to an upcoming show                            | 🟡     |
| US-4 | As a **fan**, I vote once per poll (authenticated via Supabase)                             | 🟡     |
| US-5 | As a **fan**, I see live vote counts with optimistic UI                                     | 🟡     |
| US-6 | As a **host**, polls auto-close 24 h after creation                                         | 🔴     |
| US-7 | As a **dev**, every push to `main` runs tests and auto-deploys via GitHub Actions           | 🔴     |

<!-- --------------------------------------------------------- -->

# 3. Detailed Requirements & Acceptance Criteria

### 3.1 Functional Requirements (FR)

| FR-ID | Requirement                                                                 | Acceptance Criteria                                |
| ----- | --------------------------------------------------------------------------- | -------------------------------------------------- |
| FR-1  | Artist search endpoint returns ≤ 20 Ticketmaster attractions in < 300 ms    | 95-th percentile latency                           |
| FR-2  | Background job is idempotent; re-running same artist causes zero duplicates | DB row counts stable                               |
| FR-3  | Poll closing cron marks `closed_at` exactly 24 h after creation             | 0 missed polls                                     |
| FR-4  | Rate-limiting: Ticketmaster ≤ 5 req/sec, setlist.fm ≤ 10 req/min            | zero 429s                                          |
| FR-5  | Row-Level Security (RLS) enforced for all tables                            | `anon` can read, auth’d can insert/update own rows |
| FR-6  | Tests: unit ≥ 80 % lines, e2e critical paths                                | CI badge green                                     |
| FR-7  | CI/CD pipeline auto-deploys to Vercel on merge                              | `main` branch always deploys                       |

### 3.2 Non-Functional Requirements (NFR)

| NFR-ID | Requirement      | Metric / Tool  |
| ------ | ---------------- | -------------- |
| NFR-1  | P95 API latency  | < 300 ms       |
| NFR-2  | Zero PII leakage | CSP, HSTS, RLS |
| NFR-3  | Infra as Code    | Terraform      |

<!-- --------------------------------------------------------- -->

# 4. Gap Matrix & Priority

| #   | Module / File               | Gap Description                     | Priority | Effort | Owner  |
| --- | --------------------------- | ----------------------------------- | -------- | ------ | ------ |
| 1   | Artist search API           | No Ticketmaster integration         | 🔴       | M      | BE     |
| 2   | Background ingestion worker | No worker, no queue, no idempotency | 🔴       | L      | BE     |
| 3   | Poll closing cron           | Stub route but not scheduled        | 🔴       | S      | Infra  |
| 4   | Rate-limit & retry          | No p-queue, no Redis                | 🔴       | M      | BE     |
| 5   | RLS policies                | No policies on new tables           | 🔴       | S      | DB     |
| 6   | Tests                       | No unit or e2e tests                | 🟠       | L      | QA     |
| 7   | CI/CD                       | No GitHub Actions                   | 🟠       | M      | DevOps |
| 8   | Observability               | No Sentry, no logs                  | 🟠       | M      | DevOps |
| 9   | Storybook                   | Missing component docs              | 🟡       | M      | FE     |
| 10  | Terraform                   | No infra-as-code                    | 🟡       | L      | DevOps |

<!-- --------------------------------------------------------- -->

# 5. Architecture Diagram (Mermaid)

```mermaid
graph TD
    subgraph Client
        U[User]
    end
    subgraph Next.js App
        S[ArtistSearch UI]
        P[Poll Create UI]
        V[Vote UI]
    end
    subgraph API
        AS[/api/search/artist]
        IN[/api/ingest/artist/\[tmId\]]
        CP[/api/cron/close-polls]
    end
    subgraph External
        TM[Ticketmaster]
        SF[setlist.fm]
        MB[MusicBrainz]
    end
    subgraph Backend
        Q[Upstash Queue]
        W[Worker]
        DB[(Supabase Postgres)]
        R[Redis]
    end
    U --> S
    S --> AS --> TM
    S -->|click| IN --> Q --> W --> TM & SF & MB --> DB
    CP -->|24h| DB
```

<!-- --------------------------------------------------------- -->

# 6. Phase-by-Phase Implementation Plan

## Phase 1 — Foundations (Week 1)

### 6.1 Environment Variables

Add to `.env.example`

```bash
TICKETMASTER_API_KEY=
SETLIST_FM_API_KEY=
CRON_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### 6.2 Database Migration

Create `supabase/migrations/20250712120000_add_entities.sql`

```sql
-- Artists extension
ALTER TABLE artists
  ADD COLUMN tm_attraction_id TEXT UNIQUE,
  ADD COLUMN mbid TEXT UNIQUE,
  ADD COLUMN last_synced TIMESTAMPTZ;

-- Venues
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tm_venue_id TEXT UNIQUE,
  name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  lat NUMERIC,
  lng NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shows
CREATE TABLE shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tm_event_id TEXT UNIQUE,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  event_date TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('upcoming', 'past')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Songs
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  spotify_id TEXT UNIQUE,
  duration_ms INT,
  popularity INT,
  isrc TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Setlists
CREATE TABLE setlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  setlist_fm_version_id TEXT UNIQUE,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Setlist <-> Song junction
CREATE TABLE setlist_songs (
  setlist_id UUID REFERENCES setlists(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  position INT,
  PRIMARY KEY (setlist_id, song_id)
);

-- Indexes
CREATE INDEX idx_shows_artist_date ON shows(artist_id, event_date);
CREATE INDEX idx_setlists_show ON setlists(show_id);
```

### 6.3 Row-Level Security

```sql
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_artists" ON artists FOR SELECT USING (true);
CREATE POLICY "public_read_venues" ON venues FOR SELECT USING (true);
CREATE POLICY "public_read_shows" ON shows FOR SELECT USING (true);
CREATE POLICY "public_read_songs" ON songs FOR SELECT USING (true);
CREATE POLICY "public_read_setlists" ON setlists FOR SELECT USING (true);
```

### 6.4 Package Scripts

```json
{
  "scripts": {
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:types": "supabase gen types --lang=typescript --local > src/lib/database.types.ts",
    "test": "vitest",
    "test:e2e": "playwright test",
    "prepare": "husky install"
  }
}
```

## Phase 2 — Artist Search & Trigger (Week 2)

### 7.1 Ticketmaster Search API

`/src/app/api/search/artist/route.ts`

```ts
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const Query = z.object({ q: z.string().min(2) });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { q } = Query.parse({ q: searchParams.get("q") });
  const url = `https://app.ticketmaster.com/discovery/v2/attractions?apikey=${process.env.TICKETMASTER_API_KEY}&keyword=${encodeURIComponent(q)}&size=20`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok)
    return NextResponse.json(
      { error: "Upstream error" },
      { status: res.status },
    );
  const data = await res.json();
  return NextResponse.json(data._embedded?.attractions || []);
}
```

### 7.2 UI Search Component

`/src/components/ArtistSearch.tsx`

```tsx
"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

interface Attraction {
  id: string;
  name: string;
  images?: { url: string }[];
}

export default function ArtistSearch() {
  const [q, setQ] = useState("");
  const router = useRouter();
  const { data, isFetching } = useQuery<Attraction[]>(
    ["artistSearch", q],
    () =>
      fetch(`/api/search/artist?q=${encodeURIComponent(q)}`).then((r) =>
        r.json(),
      ),
    { enabled: q.length > 1 },
  );

  const handleSelect = async (attr: Attraction) => {
    await fetch(`/api/ingest/artist/${attr.id}`, { method: "POST" });
    router.push(`/artist/${attr.id}`);
  };

  return (
    <div className="w-full max-w-md">
      <input
        className="input input-bordered w-full"
        placeholder="Search artist…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {isFetching && <p className="mt-2">Loading…</p>}
      <ul className="mt-2">
        {data?.map((a) => (
          <li
            key={a.id}
            className="p-2 hover:bg-base-200 cursor-pointer"
            onClick={() => handleSelect(a)}
          >
            {a.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 7.3 Ingest Trigger Endpoint

`/src/app/api/ingest/artist/[tmId]/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { ingestArtistPipeline } from "@/lib/ingest/artistPipeline";

export async function POST(
  _: NextRequest,
  { params }: { params: { tmId: string } },
) {
  ingestArtistPipeline(params.tmId).catch(console.error);
  return NextResponse.json({ queued: true });
}
```

## Phase 3 — Background Ingestion Worker (Week 2-3)

### 8.1 Pipeline Entry

`/src/lib/ingest/artistPipeline.ts`

```ts
import { upsertArtist } from "./upsertArtist";
import { resolveMusicBrainzMbid } from "./resolveMbid";
import { fetchAllSetlists } from "./fetchSetlists";
import { fetchShows } from "./fetchShows";
import { upsertShows } from "./upsertShows";
import { upsertSetlists } from "./upsertSetlists";

export async function ingestArtistPipeline(tmId: string) {
  const artist = await upsertArtist(tmId);
  artist.mbid = await resolveMusicBrainzMbid(artist.name);
  if (artist.mbid) {
    const setlists = await fetchAllSetlists(artist.mbid);
    await upsertSetlists(setlists);
  }
  const shows = await fetchShows(tmId);
  await upsertShows(shows);
}
```

### 8.2 Ticketmaster → DB Upsert

`/src/lib/ingest/upsertArtist.ts`

```ts
import { db } from "@/lib/db";
import { artists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchAttraction } from "./ticketmaster";

export async function upsertArtist(tmId: string) {
  const attr = await fetchAttraction(tmId);
  await db
    .insert(artists)
    .values({ name: attr.name, tm_attraction_id: tmId })
    .onConflictDoUpdate({
      target: artists.tm_attraction_id,
      set: { name: attr.name },
    });
  return db
    .select()
    .from(artists)
    .where(eq(artists.tm_attraction_id, tmId))
    .then((r) => r[0]);
}
```

### 8.3 MusicBrainz MBID Resolver

`/src/lib/ingest/resolveMbid.ts`

```ts
export async function resolveMusicBrainzMbid(
  name: string,
): Promise<string | null> {
  const url = `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(name)}&limit=1&fmt=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": "mysetlist-s4/1.0 (contact@example.com)" },
  });
  const data = await res.json();
  return data.artists?.[0]?.id ?? null;
}
```

### 8.4 Throttled Setlist Fetcher

`/src/lib/ingest/fetchSetlists.ts`

```ts
import PQueue from "p-queue";
const queue = new PQueue({ interval: 60000, intervalCap: 10 });

export async function fetchAllSetlists(mbid: string) {
  const setlists: any[] = [];
  let page = 1;
  while (true) {
    const res = await queue.add(() =>
      fetch(
        `https://api.setlist.fm/rest/1.0/artist/${mbid}/setlists?p=${page}`,
        {
          headers: { "x-api-key": process.env.SETLIST_FM_API_KEY! },
        },
      ),
    );
    const data = await res.json();
    if (!data.setlist?.length) break;
    setlists.push(...data.setlist);
    page++;
  }
  return setlists;
}
```

### 8.5 Ticketmaster Show Fetcher

`/src/lib/ingest/fetchShows.ts`

```ts
export async function fetchShows(tmId: string) {
  const url = `https://app.ticketmaster.com/discovery/v2/events?attractionId=${tmId}&apikey=${process.env.TICKETMASTER_API_KEY}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const data = await res.json();
  return (data._embedded?.events || []).map((e: any) => ({
    tm_event_id: e.id,
    event_date: e.dates.start.dateTime,
    venue: e._embedded.venues[0],
  }));
}
```

### 8.6 Upsert Shows & Venues

`/src/lib/ingest/upsertShows.ts`

```ts
import { db } from "@/lib/db";
import { shows, venues } from "@/lib/db/schema";
import { upsertVenue } from "./upsertVenue";

export async function upsertShows(rawShows: any[]) {
  await db.transaction(async (tx) => {
    for (const s of rawShows) {
      const venue = await upsertVenue(s.venue);
      await tx
        .insert(shows)
        .values({
          tm_event_id: s.tm_event_id,
          artist_id: artist.id,
          venue_id: venue.id,
          event_date: s.event_date,
          status: new Date(s.event_date) > new Date() ? "upcoming" : "past",
        })
        .onConflictDoNothing();
    }
  });
}
```

## Phase 4 — Poll Closing Cron (Week 3)

### 9.1 Vercel Cron in `vercel.json`

```json
{
  "crons": [{ "path": "/api/cron/close-polls", "schedule": "0 */6 * * *" }]
}
```

### 9.2 Cron Handler

`/src/app/api/cron/close-polls/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { polls } from "@/lib/db/schema";
import { isNull, lt } from "drizzle-orm";

export async function GET(req: NextRequest) {
  if (
    req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { rowCount } = await db
    .update(polls)
    .set({ closed_at: new Date() })
    .where(isNull(polls.closed_at))
    .and(lt(polls.created_at, new Date(Date.now() - 24 * 3600 * 1000)));
  return NextResponse.json({ closed: rowCount });
}
```

## Phase 5 — Testing & CI/CD (Week 4)

### 10.1 Unit Tests with Vitest

Install:

```bash
npm i -D vitest @testing-library/react jsdom
```

`/src/lib/ingest/__tests__/artistPipeline.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { resolveMusicBrainzMbid } from "../resolveMbid";

describe("resolveMusicBrainzMbid", () => {
  it("returns mbid for Radiohead", async () => {
    const mbid = await resolveMusicBrainzMbid("Radiohead");
    expect(mbid).toBe("a74b1b7f-71a5-4011-9441-d0b5e4122711");
  });
});
```

### 10.2 E2E Tests with Playwright

Install:

```bash
npm i -D @playwright/test
```

`/e2e/ingest.spec.ts`

```ts
import { test, expect } from "@playwright/test";

test("ingest artist flow", async ({ page }) => {
  await page.goto("/");
  await page.fill('input[placeholder="Search artist…"]', "Radiohead");
  await page.getByText("Radiohead").click();
  await expect(page.locator("text=queued")).toBeVisible();
});
```

### 10.3 GitHub Actions

`.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase start
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

## Phase 6 — Observability & Polish (Week 5)

### 11.1 Sentry

```bash
npm i @sentry/nextjs
```

`sentry.client.config.ts` / `sentry.server.config.ts`

### 11.2 CSP Headers

`next.config.js`

```js
const { withContentSecurityPolicy } = require("@next-safe/middleware");
module.exports = withContentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https://i.scdn.co"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    connectSrc: [
      "'self'",
      "https://api.spotify.com",
      "https://app.ticketmaster.com",
      "https://api.setlist.fm",
    ],
  },
});
```

### 11.3 Storybook

```bash
npx storybook@latest init
```

<!-- --------------------------------------------------------- -->

# 12. Final Checklist (Copy-Paste into GitHub Issues)

- [ ] Update `.env.example` with all new keys
- [ ] Run `supabase migrations up`
- [ ] Add RLS policies
- [ ] Implement `/api/search/artist`
- [ ] Build `/api/ingest/artist/[tmId]`
- [ ] Add Upstash queue + worker
- [ ] Add rate-limiting layer
- [ ] Add `vercel.json` crons
- [ ] Implement poll closing cron
- [ ] Write unit & e2e tests
- [ ] Add GitHub Actions workflow
- [ ] Deploy to staging & test
- [ ] Merge to main → production

<!-- ========================================================= -->

```

```
