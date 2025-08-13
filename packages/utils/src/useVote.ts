import { useCallback } from "react";
import useSWR from "swr";

type VoteResponse = {
  up: number;
  currentUserUpvoted: boolean;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * React hook for song up-voting.
 *
 * @param setlistSongId UUID of the setlist_songs row
 */
export function useVote(setlistSongId: string) {
  const { data, mutate, isValidating } = useSWR<VoteResponse>(
    setlistSongId ? `/api/votes?setlistSongId=${setlistSongId}` : null,
    fetcher,
  );

  const toggle = useCallback(async () => {
    if (!setlistSongId) return;
    // optimistic update
    mutate(
      async (current) => {
        const optimistic: VoteResponse = current
          ? {
              up: current.currentUserUpvoted ? current.up - 1 : current.up + 1,
              currentUserUpvoted: !current.currentUserUpvoted,
            }
          : { up: 1, currentUserUpvoted: true };

        // Fire request but don't await to keep UI snappy
        const res = fetch("/api/votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ setlistSongId }),
        }).then((r) => r.json());

        return res.catch(() => current ?? optimistic);
      },
      { optimisticData: data, revalidate: false },
    );
  }, [setlistSongId, mutate, data]);

  return {
    up: data?.up ?? 0,
    currentUserUpvoted: data?.currentUserUpvoted ?? false,
    toggle,
    loading: !data && isValidating,
  };
}
