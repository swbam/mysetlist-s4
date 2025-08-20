"use client";

import { createClient } from "../../client";
import type {
  EmailPreferences,
  PrivacySettings,
  SpotifyProfile,
  SpotifyTokens,
  UpdatePreferencesData,
  UpdateProfileData,
  UserPreferences,
  UserProfile,
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

  // Note: Some operations like database updates should be done via API routes
  // rather than directly from the client to maintain security
}