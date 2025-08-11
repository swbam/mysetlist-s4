import { createClient } from "@supabase/supabase-js";
import { expect } from "vitest";

const supabase = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
);

export const testDb = {
  async setup() {
    // Create test database schema if needed
    // This would typically be handled by migrations
    console.log("Setting up test database...");
  },

  async cleanup() {
    // Clean up test data
    console.log("Cleaning up test database...");

    // Delete test data in reverse dependency order
    await supabase
      .from("votes")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("setlist_songs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("setlists")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("songs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("shows")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("venues")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("artists")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
  },

  async reset() {
    // Reset database to clean state for each test
    await this.cleanup();
  },

  async seedTestData() {
    // Insert common test data
    const { data: artist } = await supabase
      .from("artists")
      .insert({
        name: "Test Artist",
        slug: "test-artist",
        genres: ["Rock", "Alternative"],
        popularity: 75,
        followers: 1000,
        verified: true,
      })
      .select()
      .single();

    const { data: venue } = await supabase
      .from("venues")
      .insert({
        name: "Test Venue",
        slug: "test-venue",
        city: "Test City",
        state: "TS",
        capacity: 5000,
      })
      .select()
      .single();

    const { data: show } = await supabase
      .from("shows")
      .insert({
        name: "Test Show",
        slug: "test-show",
        headliner_artist_id: artist.id,
        venue_id: venue.id,
        date: "2024-12-31",
        start_time: "20:00",
        status: "upcoming",
      })
      .select()
      .single();

    const { data: song } = await supabase
      .from("songs")
      .insert({
        title: "Test Song",
        artist: "Test Artist",
        album: "Test Album",
        duration_ms: 240000,
        popularity: 80,
      })
      .select()
      .single();

    const { data: setlist } = await supabase
      .from("setlists")
      .insert({
        show_id: show.id,
        artist_id: artist.id,
        type: "predicted",
        name: "Main Set",
      })
      .select()
      .single();

    const { data: setlistSong } = await supabase
      .from("setlist_songs")
      .insert({
        setlist_id: setlist.id,
        song_id: song.id,
        position: 1,
        upvotes: 5,
        downvotes: 2,
        net_votes: 3,
      })
      .select()
      .single();

    return {
      artist,
      venue,
      show,
      song,
      setlist,
      setlistSong,
    };
  },

  async createTestUser(email = "test@example.com", password = "testpassword") {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      throw error;
    }

    return data.user;
  },

  async deleteTestUser(userId: string) {
    await supabase.auth.admin.deleteUser(userId);
  },

  async signInTestUser(email = "test@example.com", password = "testpassword") {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  },
};

// Test data factories
export const testDataFactory = {
  artist: (overrides = {}) => ({
    name: "Test Artist",
    slug: "test-artist",
    genres: ["Rock"],
    popularity: 50,
    followers: 1000,
    verified: false,
    ...overrides,
  }),

  venue: (overrides = {}) => ({
    name: "Test Venue",
    slug: "test-venue",
    city: "Test City",
    state: "TS",
    capacity: 1000,
    ...overrides,
  }),

  show: (artistId: string, venueId: string, overrides = {}) => ({
    name: "Test Show",
    slug: "test-show",
    headliner_artist_id: artistId,
    venue_id: venueId,
    date: "2024-12-31",
    status: "upcoming",
    ...overrides,
  }),

  song: (overrides = {}) => ({
    title: "Test Song",
    artist: "Test Artist",
    album: "Test Album",
    duration_ms: 240000,
    popularity: 50,
    ...overrides,
  }),

  setlist: (showId: string, artistId: string, overrides = {}) => ({
    show_id: showId,
    artist_id: artistId,
    type: "predicted",
    name: "Main Set",
    ...overrides,
  }),

  setlistSong: (setlistId: string, songId: string, overrides = {}) => ({
    setlist_id: setlistId,
    song_id: songId,
    position: 1,
    upvotes: 0,
    downvotes: 0,
    net_votes: 0,
    ...overrides,
  }),

  vote: (userId: string, setlistSongId: string, overrides = {}) => ({
    user_id: userId,
    setlist_song_id: setlistSongId,
    vote_type: "up",
    ...overrides,
  }),
};

// Test assertions helpers
export const testAssertions = {
  async expectVoteCount(
    setlistSongId: string,
    expectedUpvotes: number,
    expectedDownvotes: number,
  ) {
    const { data } = await supabase
      .from("setlist_songs")
      .select("upvotes, downvotes, net_votes")
      .eq("id", setlistSongId)
      .single();

    expect(data?.upvotes).toBe(expectedUpvotes);
    expect(data?.downvotes).toBe(expectedDownvotes);
    expect(data?.net_votes).toBe(expectedUpvotes - expectedDownvotes);
  },

  async expectUserVote(
    userId: string,
    setlistSongId: string,
    expectedVoteType: "up" | "down" | null,
  ) {
    const { data } = await supabase
      .from("votes")
      .select("vote_type")
      .eq("user_id", userId)
      .eq("setlist_song_id", setlistSongId)
      .maybeSingle();

    if (expectedVoteType === null) {
      expect(data).toBeNull();
    } else {
      expect(data?.vote_type).toBe(expectedVoteType);
    }
  },

  async expectArtistExists(slug: string) {
    const { data } = await supabase
      .from("artists")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    expect(data).not.toBeNull();
    return data;
  },

  async expectShowExists(slug: string) {
    const { data } = await supabase
      .from("shows")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    expect(data).not.toBeNull();
    return data;
  },
};
