here’s your dev-handoff outline with the requested top paragraph 👇

# What we’re switching to (and why)

We’re switching the app’s data layer from the **Next-Forge default of Neon Postgres + Prisma** to **Convex**—a managed, ACID database with **serializable isolation**, built-in **reactive queries** (real-time by default), and a first-class **scheduler** (one-off jobs + cron) plus **HTTP Actions** for webhooks. This reduces glue code for sockets, background workers, and race-free voting logic, and gives us stricter correctness guarantees out of the box—perfect for a live setlist voting app. Next-Forge’s own docs state it defaults to **Neon + Prisma**, while Convex provides serializable transactions, **`useQuery`** subscriptions, **`runAt`/`runAfter`** + **cron** scheduling, and inbound HTTP Actions. ([Next Forge][1], [Convex Developer Hub][2])

---

# Migration outline (developer-ready)

## 1) Phased plan

* **Phase 1 (Votes & Tallies):** Move vote writes/reads to Convex for real-time UX + race-free “one user, one vote per event.”
* **Phase 2 (Catalog & Sync):** Move events/songs/setlists + import/sync jobs to Convex scheduled functions/cron + Actions.
* **Phase 3 (Decom/Export):** Turn off SQL write paths; keep optional read/export for BI.

## 2) Add Convex to the monorepo

* From repo root: `pnpm dlx create-convex@latest` → selects existing Next.js app; creates `/convex`.
* App deps: `pnpm add convex @convex-dev/react`.
* ENV: add `NEXT_PUBLIC_CONVEX_URL` (dev/prod).
* Dev/prod: `npx convex dev` / `npx convex deploy`. ([Convex Developer Hub][3])

## 3) Auth wiring (Convex Auth)

* Use Convex Auth for built-in authentication with OAuth providers and password-based auth.
* Wrap your client tree with `<ConvexAuthProvider>` and configure auth providers.
* In Convex functions, get identity via `ctx.auth.getUserIdentity()`. ([Convex Developer Hub][4])

**Provider example (client root):**

```tsx
"use client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      {children}
    </ConvexAuthProvider>
  );
}
```

([Convex Developer Hub][4])

## 4) Convex schema (fast reads + uniqueness)

Create `convex/schema.ts`:

```ts
import { defineSchema, defineTable, v } from "convex/server";

export default defineSchema({
  users: defineTable({ userId: v.string(), displayName: v.string() })
    .index("by_userId", ["userId"]),

  events: defineTable({
    externalId: v.string(), artistId: v.string(), dateUTC: v.number(),
    title: v.string(), status: v.string(), // scheduled | live | finalized
  })
    .index("by_externalId", ["externalId"])
    .index("by_dateUTC", ["dateUTC"]),

  songs: defineTable({ externalId: v.string(), title: v.string(), artistId: v.string() })
    .index("by_artist", ["artistId"])
    .index("by_ext", ["externalId"]),

  setlistEntries: defineTable({ eventId: v.id("events"), songId: v.id("songs"), position: v.number() })
    .index("by_event", ["eventId"])
    .index("by_event_song", ["eventId", "songId"]),

  votes: defineTable({ eventId: v.id("events"), songId: v.id("songs"), userId: v.id("users"), createdAt: v.number() })
    .index("by_event_song", ["eventId", "songId"])
    .index("by_user_event", ["userId", "eventId"]),

  tallies: defineTable({ eventId: v.id("events"), songId: v.id("songs"), count: v.number() })
    .index("by_event_song", ["eventId", "songId"]),
});
```

> In Convex you **explicitly** choose indexes via `.withIndex(...)` for predictable performance; define compound indexes for your hot paths. ([Convex Developer Hub][5])

## 5) Core functions (race-free votes, live tallies)

**Queries:**

```ts
// convex/votes.ts
import { v } from "convex/values";
import { query } from "convex/server";

export const tallyForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const rows = await ctx.db.query("tallies")
      .withIndex("by_event_song", q => q.eq("eventId", eventId))
      .collect();
    if (rows.length) return Object.fromEntries(rows.map(r => [r.songId.id, r.count]));
    const votes = await ctx.db.query("votes")
      .withIndex("by_event_song", q => q.eq("eventId", eventId))
      .collect();
    const counts: Record<string, number> = {};
    for (const v of votes) counts[v.songId.id] = (counts[v.songId.id] ?? 0) + 1;
    return counts;
  },
});
```

**Mutation (serializable transaction):**

```ts
import { v } from "convex/values";
import { mutation } from "convex/server";

export const castVote = mutation({
  args: { eventId: v.id("events"), songId: v.id("songs") },
  handler: async (ctx, { eventId, songId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    let user = await ctx.db.query("users")
      .withIndex("by_userId", q => q.eq("userId", identity.subject)).first();
    if (!user) {
      const id = await ctx.db.insert("users", { userId: identity.subject, displayName: identity.name ?? "anon" });
      user = (await ctx.db.get(id))!;
    }

    const existing = await ctx.db.query("votes")
      .withIndex("by_user_event", q => q.eq("userId", user._id).eq("eventId", eventId)).first();
    if (existing) return existing._id;

    // All DB changes in a mutation are executed atomically in one transaction.
    const voteId = await ctx.db.insert("votes", { eventId, songId, userId: user._id, createdAt: Date.now() });

    const tally = await ctx.db.query("tallies")
      .withIndex("by_event_song", q => q.eq("eventId", eventId).eq("songId", songId)).first();
    if (tally) await ctx.db.patch(tally._id, { count: tally.count + 1 });
    else await ctx.db.insert("tallies", { eventId, songId, count: 1 });

    return voteId;
  },
});
```

* Mutations are **single transactions**; Convex uses **serializable isolation + OCC**, preventing race anomalies (no double votes). ([Convex Developer Hub][6])
* UI subscribes via **`useQuery`** and updates instantly when data changes. ([Convex Developer Hub][7])

## 6) Next.js wiring (SSR + realtime)

* Server component for `/events/[id]`: `preloadQuery(api.votes.tallyForEvent, { eventId })` to render initial state on the server.
* Client component: `useQuery` for live tallies; `useMutation` to call `castVote`. ([Convex Developer Hub][8])

**Server (SSR):**

```ts
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export default async function Page({ params }: { params: { id: string } }) {
  const preloaded = await preloadQuery(api.votes.tallyForEvent, { eventId: params.id });
  return <Client id={params.id} preloaded={preloaded} />;
}
```

**Client:**

```tsx
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Client({ id, preloaded }: any) {
  const tallies = useQuery(api.votes.tallyForEvent, { eventId: id }, { initialData: preloaded });
  const castVote = useMutation(api.votes.castVote);
  // render UI; on click => castVote({ eventId: id, songId })
}
```

([Convex Developer Hub][8])

## 7) Background work (imports + maintenance)

**One-off scheduled functions:** schedule from mutations/actions to create durable workflows:

```ts
// schedule a post-show reconcile 2h after event end
await ctx.scheduler.runAfter(2 * 60 * 60 * 1000, internal.ingest.postShowReconcile, { eventId });
```

**Timed runs:**

* **`runAfter`** (delay) and **`runAt`** (timestamp) for one-offs. ([Convex Developer Hub][9])

**Cron jobs:** define `convex/crons.ts` (nightly setlist sync, hourly refresh, etc.). ([Convex Developer Hub][10])

**Ops tip:** Don’t leave promises floating—`await` your `ctx.scheduler` / `ctx.db` calls (Convex best practice). ([Convex Developer Hub][11])

## 8) External APIs & Webhooks

* **Outbound HTTP / long work:** use **Actions** (Node-capable with `"use node"`), then call internal mutations to upsert. ([Convex Developer Hub][12])
* **Inbound webhooks / public endpoints:** use **HTTP Actions** (`Request` → `Response`) and dispatch to Actions/Mutations. ([Convex Developer Hub][13])

## 9) Data migration (SQL → Convex)

1. Export current tables (users/events/songs/setlists/votes) from your SQL DB.
2. **Idempotent ETL** script (Node): upsert by **`externalId`** (and natural keys), building Convex documents via mutations (bulk loops are fine—mutations commit once at end). ([Convex Developer Hub][6])
3. Pause old writes → run final delta → flip reads to Convex.
4. (Optional) set up scheduled exports from Convex to your warehouse for BI.

## 10) Observability & controls

* Use the **Schedules dashboard** to see/cancel upcoming scheduled functions and cron runs. Build a lightweight admin panel if desired. ([Convex Developer Hub][14])

## 11) Tests you must add

* **Concurrency test**: fire N parallel `castVote` calls for the same `(user,event)` and assert one row; rely on serializable isolation. ([Convex Developer Hub][2])
* **Import idempotency**: rerun the same API page twice; no dupes because upserts are keyed by `externalId`.
* **SSR + realtime**: initial SSR matches client-hydrated live view.

## 12) Rollout checklist

* [ ] `NEXT_PUBLIC_CONVEX_URL` configured (dev + prod).
* [ ] `<ConvexProviderWithClerk>` active; `ctx.auth.getUserIdentity()` returns user. ([Convex Developer Hub][4])
* [ ] `tallyForEvent` and `castVote` deployed; live UI reactivity verified. ([Convex Developer Hub][7])
* [ ] Scheduled functions + cron jobs visible in Schedules dashboard. ([Convex Developer Hub][14])
* [ ] HTTP Actions endpoint(s) registered with providers (Setlist.fm/Ticketmaster/Spotify). ([Convex Developer Hub][13])
* [ ] One-time ETL completed; final delta; SQL writes disabled.

---

### Appendix: Why this is a good fit for a voting app

* **Correctness:** serializable transactions stop double-votes without app-level locks. ([Convex Developer Hub][2])
* **Realtime UX:** `useQuery` gives push-updates to leaderboards—no custom websockets. ([Convex Developer Hub][7])
* **Background processing:** first-class scheduled functions and cron jobs replace ad-hoc workers/Actions. ([Convex Developer Hub][9])
* **Webhooks:** HTTP Actions make inbound integrations trivial. ([Convex Developer Hub][13])
* **Clerk + Next.js integration:** documented providers and `preloadQuery` for SSR. ([Convex Developer Hub][4])

If you want, I can also generate a tiny **ETL script skeleton** (Node) and a **parallel vote tester** you can run locally against your Convex dev deployment.

[1]: https://www.next-forge.com/packages/database "Database"
[2]: https://docs.convex.dev/understanding/?utm_source=chatgpt.com "Convex Overview | Convex Developer Hub"
[3]: https://docs.convex.dev/?utm_source=chatgpt.com "Convex Docs | Convex Developer Hub"
[4]: https://docs.convex.dev/auth/clerk?utm_source=chatgpt.com "Convex & Clerk | Convex Developer Hub"
[5]: https://docs.convex.dev/database/reading-data/indexes/?utm_source=chatgpt.com "Indexes | Convex Developer Hub"
[6]: https://docs.convex.dev/database/writing-data?utm_source=chatgpt.com "Writing Data | Convex Developer Hub"
[7]: https://docs.convex.dev/client/react/?utm_source=chatgpt.com "Convex React | Convex Developer Hub"
[8]: https://docs.convex.dev/api/modules/nextjs?utm_source=chatgpt.com "Module: nextjs | Convex Developer Hub"
[9]: https://docs.convex.dev/scheduling/scheduled-functions?utm_source=chatgpt.com "Scheduled Functions | Convex Developer Hub"
[10]: https://docs.convex.dev/scheduling/cron-jobs?utm_source=chatgpt.com "Cron Jobs | Convex Developer Hub"
[11]: https://docs.convex.dev/understanding/best-practices?utm_source=chatgpt.com "Best Practices | Convex Developer Hub"
[12]: https://docs.convex.dev/functions/actions?utm_source=chatgpt.com "Actions | Convex Developer Hub"
[13]: https://docs.convex.dev/functions/http-actions?utm_source=chatgpt.com "HTTP Actions | Convex Developer Hub"
[14]: https://docs.convex.dev/dashboard/deployments/schedules?utm_source=chatgpt.com "Schedules | Convex Developer Hub"
