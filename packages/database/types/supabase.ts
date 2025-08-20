export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          last_used_at: string | null
          name: string
          rate_limit: Json
          revoked_at: string | null
          scopes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          last_used_at?: string | null
          name: string
          rate_limit?: Json
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          last_used_at?: string | null
          name?: string
          rate_limit?: Json
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          created_at: string
          external_urls: string | null
          follower_count: number | null
          followers: number | null
          genres: string | null
          id: string
          image_url: string | null
          import_status: string | null
          is_trending: boolean | null
          last_full_sync_at: string | null
          last_growth_calculated: string | null
          last_synced_at: string | null
          mbid: string | null
          monthly_listeners: number | null
          name: string
          popularity: number | null
          previous_follower_count: number | null
          previous_followers: number | null
          previous_monthly_listeners: number | null
          previous_popularity: number | null
          shows_synced_at: string | null
          slug: string
          small_image_url: string | null
          song_catalog_synced_at: string | null
          spotify_id: string | null
          tm_attraction_id: string | null
          total_albums: number | null
          total_setlists: number | null
          total_shows: number | null
          total_songs: number | null
          trending_score: number | null
          trending_updated_at: string | null
          upcoming_shows: number | null
          updated_at: string
          verified: boolean | null
          view_count: number | null
        }
        Insert: {
          created_at?: string
          external_urls?: string | null
          follower_count?: number | null
          followers?: number | null
          genres?: string | null
          id?: string
          image_url?: string | null
          import_status?: string | null
          is_trending?: boolean | null
          last_full_sync_at?: string | null
          last_growth_calculated?: string | null
          last_synced_at?: string | null
          mbid?: string | null
          monthly_listeners?: number | null
          name: string
          popularity?: number | null
          previous_follower_count?: number | null
          previous_followers?: number | null
          previous_monthly_listeners?: number | null
          previous_popularity?: number | null
          shows_synced_at?: string | null
          slug: string
          small_image_url?: string | null
          song_catalog_synced_at?: string | null
          spotify_id?: string | null
          tm_attraction_id?: string | null
          total_albums?: number | null
          total_setlists?: number | null
          total_shows?: number | null
          total_songs?: number | null
          trending_score?: number | null
          trending_updated_at?: string | null
          upcoming_shows?: number | null
          updated_at?: string
          verified?: boolean | null
          view_count?: number | null
        }
        Update: {
          created_at?: string
          external_urls?: string | null
          follower_count?: number | null
          followers?: number | null
          genres?: string | null
          id?: string
          image_url?: string | null
          import_status?: string | null
          is_trending?: boolean | null
          last_full_sync_at?: string | null
          last_growth_calculated?: string | null
          last_synced_at?: string | null
          mbid?: string | null
          monthly_listeners?: number | null
          name?: string
          popularity?: number | null
          previous_follower_count?: number | null
          previous_followers?: number | null
          previous_monthly_listeners?: number | null
          previous_popularity?: number | null
          shows_synced_at?: string | null
          slug?: string
          small_image_url?: string | null
          song_catalog_synced_at?: string | null
          spotify_id?: string | null
          tm_attraction_id?: string | null
          total_albums?: number | null
          total_setlists?: number | null
          total_shows?: number | null
          total_songs?: number | null
          trending_score?: number | null
          trending_updated_at?: string | null
          upcoming_shows?: number | null
          updated_at?: string
          verified?: boolean | null
          view_count?: number | null
        }
        Relationships: []
      }
      // ... other tables truncated for brevity
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      import_stage:
        | "initializing"
        | "syncing-identifiers"  
        | "importing-songs"
        | "importing-shows"
        | "creating-setlists"
        | "completed"
        | "failed"
      moderation_status: "pending" | "approved" | "rejected" | "flagged"
      setlist_type: "predicted" | "actual"
      show_status: "upcoming" | "ongoing" | "completed" | "cancelled"
      user_role: "user" | "moderator" | "admin"
      email_frequency: "immediately" | "daily" | "weekly" | "never"
      email_status: "queued" | "sent" | "delivered" | "bounced" | "failed" | "spam"
      email_type: "show_reminders" | "new_shows" | "setlist_updates" | "weekly_digest" | "marketing" | "all"
      queued_email_type: "welcome" | "show_reminder" | "new_show" | "setlist_update" | "weekly_digest" | "password_reset" | "email_verification"
      priority_level: "low" | "medium" | "high" | "urgent"
      log_level: "info" | "warning" | "error" | "success" | "debug"
      report_status: "pending" | "investigating" | "resolved" | "dismissed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never