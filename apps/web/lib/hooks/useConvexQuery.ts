"use client";

import { useQuery } from "convex/react";
import { api } from "../convex-api";

// Convenience hooks for common queries
export function useArtists(limit = 50) {
  return useQuery(api.artists.getAll, { limit });
}

export function useArtist(key: string) {
  return useQuery(api.artists.getBySlugOrId, { key });
}

export function useShows(limit = 20) {
  return useQuery(api.shows.getUpcoming, { limit });
}

export function useShow(key: string) {
  return useQuery(api.shows.getBySlugOrId, { key });
}

export function useShowsByArtist(artistId: string, limit = 10) {
  return useQuery(api.shows.getByArtist, { artistId, limit });
}

export function useSetlistsByShow(showId: string) {
  return useQuery(api.setlists.getByShow, { showId });
}

export function useSongsByArtist(artistId: string, limit = 20) {
  return useQuery(api.songs.getByArtist, { artistId, limit });
}

export function useUserActivity(limit = 50) {
  return useQuery(api.predictions.getUserActivity, { limit });
}

export function useUserSetlists(limit = 20) {
  return useQuery(api.predictions.getUserSetlistContributions, { limit });
}

export function useTrendingShows(limit = 20) {
  return useQuery(api.trending.getTrendingShows, { limit });
}

export function useTrendingArtists(limit = 20) {
  return useQuery(api.trending.getTrendingArtists, { limit });
}
