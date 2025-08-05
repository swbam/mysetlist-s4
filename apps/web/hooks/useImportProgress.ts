import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@repo/database";

export interface ImportProgressRow {
  id: string;
  artist_id: string;
  current: number;
  total: number;
  status: "in_progress" | "completed" | "error";
  message: string | null;
  updated_at: string;
}

/**
 * Subscribe to the `import_progress` table for a given artist.
 * Returns a tuple `[progress, error]` where progress is the latest row or `null`.
 */
export function useImportProgress(artistId: string | null) {
  const [progress, setProgress] = useState<ImportProgressRow | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!artistId) return;

    const supabase = createSupabaseBrowserClient();

    // Fetch latest snapshot first
    supabase
      .from<ImportProgressRow>("import_progress")
      .select("*")
      .eq("artist_id", artistId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data, error: fetchError }) => {
        if (fetchError && fetchError.code !== "PGRST116") {
          // row not found is fine (PGRST116)
          setError(fetchError as any);
        }
        if (data) setProgress(data);
      });

    // Subscribe to realtime updates
    const channel = supabase
      .channel("import_progress:" + artistId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "import_progress",
          filter: `artist_id=eq.${artistId}`,
        },
        (payload) => {
          setProgress(payload.new as ImportProgressRow);
        },
      )
      .subscribe((status) => {
        if (status === "TIMED_OUT") {
          setError(new Error("Realtime subscription timed out"));
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [artistId]);

  return { progress, error } as const;
}

