"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import { useState } from "react";

async function call(endpoint: string, body?: unknown) {
  const res = await fetch(endpoint, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

export default function AdminToolsPage() {
  const [log, setLog] = useState<string>("");
  const append = (msg: string) =>
    setLog((l) => `${new Date().toISOString()} ${msg}\n` + l);

  const triggerArtistImport = async () => {
    const name = prompt("Artist name to import (Ticketmaster/Spotify)")?.trim();
    if (!name) return;
    append(`Importing artist: ${name}`);
    const r = await call("/api/artists/import", { artistName: name });
    append(`POST /api/artists/import -> ${r.status}`);
  };

  const triggerArtistSync = async () => {
    const idOrSlug = prompt("Artist ID or slug to sync")?.trim();
    if (!idOrSlug) return;
    const payload =
      idOrSlug.includes("-") && idOrSlug.length === 36
        ? { artistId: idOrSlug }
        : { slug: idOrSlug };
    append(`Syncing artist: ${JSON.stringify(payload)}`);
    const r = await call("/api/sync/artist", payload);
    append(`POST /api/sync/artist -> ${r.status}`);
  };

  const triggerShowsSync = async () => {
    const artistId = prompt("Artist ID for shows sync")?.trim();
    if (!artistId) return;
    append(`Syncing shows for artist ${artistId}`);
    const r = await call("/api/sync/shows", { artistId });
    append(`POST /api/sync/shows -> ${r.status}`);
  };

  const triggerSongsSync = async () => {
    const artistId = prompt("Artist ID for songs sync")?.trim();
    if (!artistId) return;
    append(`Syncing songs for artist ${artistId}`);
    const r = await call("/api/sync/songs", { artistId });
    append(`POST /api/sync/songs -> ${r.status}`);
  };

  const triggerMasterCron = async () => {
    append("Triggering master cron job");
    const r = await call("/api/cron/master-sync", {});
    append(`POST /api/cron/master-sync -> ${r.status}`);
  };

  const triggerTrending = async () => {
    append("Triggering trending calculation");
    const r = await call("/api/cron/calculate-trending");
    append(`GET /api/cron/calculate-trending -> ${r.status}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin Tools</h1>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button onClick={triggerArtistImport}>Import Artist (auto)</Button>
            <Button variant="secondary" onClick={triggerArtistSync}>
              Sync Artist
            </Button>
            <Button variant="secondary" onClick={triggerShowsSync}>
              Sync Shows
            </Button>
            <Button variant="secondary" onClick={triggerSongsSync}>
              Sync Songs
            </Button>
            <Separator className="md:col-span-2 lg:col-span-3" />
            <Button onClick={triggerMasterCron}>Run Master Cron</Button>
            <Button onClick={triggerTrending}>Recalculate Trending</Button>
          </div>
          <Separator />
          <div>
            <h2 className="text-sm font-medium mb-2">Logs</h2>
            <pre className="text-xs whitespace-pre-wrap bg-muted p-3 rounded min-h-[200px] max-h-[400px] overflow-auto">
              {log}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
