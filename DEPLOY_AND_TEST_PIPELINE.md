# End-to-End Deployment & Data-Pipeline Test Guide

> **Scope**  
> • Deploy the web app to Vercel  
> • Apply Supabase migrations & edge-function deploys  
> • Trigger artist sync → verify shows, songs, stats  
> • Refresh trending scores  
> • Smoke-test pages

---

## 0. One-Time Setup

| Tool | Version |
|------|---------|
| pnpm | ≥ 8      |
| Supabase CLI | ≥ 1.157 |
| Vercel CLI   | ≥ 34    |

```bash
# clone project & install
pnpm install

# ensure global Supabase login
supabase login

# link to existing Supabase project (if not already)
supabase link --project-ref <PROJECT_REF>
```

Add **all** variables in the Vercel dashboard (or `.env.production` for local):
```
NEXT_PUBLIC_SUPABASE_URL= https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY= ...
SUPABASE_SERVICE_ROLE_KEY= ...  # server/edge only
DATABASE_URL= ...
```

---

## 1. One-Command Automation

The repo root `package.json` exposes:

```bash
pnpm updateit
```

This runs:
1. `supabase db repair && supabase db push` – applies **all** migrations including RLS, stats fn, cron, realtime pub, attendance removal.  
2. `supabase functions deploy scheduled-sync` – redeploys orchestrator function.  
3. `vercel env pull .env.production` – pulls remote envs to local file (optional for CI).

> If you add / modify edge functions (`sync-*`), run `supabase functions deploy <name>` similarly.

---

## 2. Vercel Deploy

```bash
vercel --prod   # or just `vercel` for preview
```
* Build must finish with **0** errors.  
* Verify Vercel logs show Supabase env keys.

---

## 3. Trigger Artist Sync

Sync any U.S. artist (example: *Foo Fighters*):

```bash
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "$NEXT_PUBLIC_SUPABASE_URL/functions/v1/sync-artists" \
  -d '{"artistName":"Foo Fighters"}'
```
Expected JSON includes `success: true` and `artist.slug`.

### Verify DB Rows
```sql
select count(*) from shows  where headliner_artist_id = '<artist-uuid>';
select total_songs from artist_stats where artist_id = '<artist-uuid>';
```
Counts should be > 0.

---

## 4. Update Trending Scores (Manual)

```bash
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "$NEXT_PUBLIC_SUPABASE_URL/functions/v1/scheduled-sync" \
  -d '{"type":"trending"}'
```

Check:
```sql
select trending_score from artists where slug='foo-fighters';
```

---

## 5. UI Smoke-Tests

1. **Trending page**  
   `https://<vercel-url>/trending` – Quick-stat cards & live panels show data.
2. **Artist page**  
   `.../artists/foo-fighters` – hero, stats, upcoming shows loaded.
3. **Show page**  
   Click an upcoming show – hero banner, meta bar, setlist tabs render; *Buy Tickets* button leads externally.

---

## 6. CI Automation (example)

`.github/workflows/smoke.yml`
```yaml
name: Smoke-test prod
on: [workflow_dispatch]

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - run: curl --fail https://<prod-url>/trending | grep "Trending"
      - run: curl --fail https://<prod-url>/artists/foo-fighters | grep "Foo Fighters"
```

---

## 7. Rollback / Cleanup

To remove all artist/show data imported during tests:
```sql
delete from songs   where artist = 'Foo Fighters';
delete from shows   where headliner_artist_id = '<artist-uuid>';
delete from artists where id = '<artist-uuid>';
delete from artist_stats where artist_id = '<artist-uuid>';
```

---

### You now have a reproducible script and checklist to deploy, populate, and validate the entire MySetlist data pipeline end-to-end.