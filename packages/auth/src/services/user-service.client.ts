"use client";

import { createClient } from "../../client";
import type {
  UpdateProfileData,
  UserPreferences,
  SpotifyProfile,
  SpotifyTokens,
} from "../types/auth";

export class UserServiceClient {
  private supabase = createClient();

  // Client-side user operations that don't require server-only access
  async getCurrentUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    if (error) throw new Error(error.message);
    return user;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }

  async updateProfile(data: Partial<UpdateProfileData>) {
    const { error } = await this.supabase.auth.updateUser({
      data: data,
    });
    if (error) throw new Error(error.message);
  }

  async createUserProfile(id: string, profileData: { displayName: string; } | { displayName?: never; }) {
    // Implementation placeholder - should call API route
    throw new Error("Method not implemented.");
  }

  async createEmailPreferences(id: string) {
    // Implementation placeholder - should call API route
    throw new Error("Method not implemented.");
  }

  async updateSpotifyTokens(userId: string, newTokens: SpotifyTokens) {
    // Implementation placeholder - should call API route
    throw new Error("Method not implemented.");
  }

  async updateSpotifyProfile(userId: string, spotifyProfile: SpotifyProfile) {
    // Implementation placeholder - should call API route
    throw new Error("Method not implemented.");
  }

  async getSpotifyTokens(userId: string) {
    // Implementation placeholder - should call API route
    throw new Error("Method not implemented.");
  }

  async updateMusicPreferences(userId: string, preferences: { topArtists: any[]; topTracks: any[]; favoriteGenres: string[]; }) {
    // Implementation placeholder - should call API route
    throw new Error("Method not implemented.");
  }

  async followArtist(userId: string, id: any, name: any, url: any) {
    // Implementation placeholder - should call API route
    throw new Error("Method not implemented.");
  }

  async getUserProfile(id: any) {
    // Implementation placeholder - should call API route
    throw new Error("Method not implemented.");
  }

  async getUserPreferences(id: any) {
    // Implementation placeholder - should call API route
    throw new Error("Method not implemented.");
  }

  // Note: Some operations like database updates should be done via API routes
  // rather than directly from the client to maintain security
}