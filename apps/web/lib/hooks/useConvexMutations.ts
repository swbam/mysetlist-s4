"use client";

import { useMutation } from "convex/react";
import { api } from "../convex-api";

// Convenience hooks for common mutations
export function useFollowArtist() {
  return useMutation(api.artists.followArtist);
}

export function useAddSongToSetlist() {
  return useMutation(api.setlists.addSongToSetlist);
}

export function useCreateSetlist() {
  return useMutation(api.setlists.create);
}

export function useVoteOnSetlist() {
  return useMutation(api.votes.submitVote);
}

export function useVoteOnSong() {
  return useMutation(api.songVotes.voteOnSong);
}

export function useUpdateUserProfile() {
  return useMutation(api.users.updateProfile);
}

export function useCreateAppUser() {
  return useMutation(api.auth.createAppUser);
}
