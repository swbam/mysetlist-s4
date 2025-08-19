import useSWR from "swr";

export const useShows = (artistId: string) =>
  useSWR(artistId ? `/api/artist/${artistId}/shows` : null, (url) =>
    fetch(url).then((r) => r.json()),
  );

