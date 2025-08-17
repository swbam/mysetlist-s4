#!/usr/bin/env tsx

/**
 * Type Validation Script for Import System
 * Ensures all types are correctly defined and used
 */

import { 
  artists, 
  songs, 
  shows, 
  setlists, 
  setlistSongs,
  artistSongs,
  venues,
  type Database 
} from "@repo/database";

// Type guards for import system
export function isValidImportStage(stage: string): stage is ImportStage {
  return [
    "initializing",
    "syncing-identifiers", 
    "importing-songs",
    "importing-shows",
    "creating-setlists",
    "completed",
    "failed"
  ].includes(stage);
}

export function isValidShowStatus(status: string): status is ShowStatus {
  return ["upcoming", "ongoing", "completed", "cancelled"].includes(status);
}

export function isValidSetlistType(type: string): type is SetlistType {
  return ["predicted", "actual"].includes(type);
}

// Type definitions
type ImportStage = 
  | "initializing"
  | "syncing-identifiers"
  | "importing-songs"
  | "importing-shows"
  | "creating-setlists"
  | "completed"
  | "failed";

type ShowStatus = "upcoming" | "ongoing" | "completed" | "cancelled";
type SetlistType = "predicted" | "actual";

// Validation interfaces
interface ArtistImportData {
  tmAttractionId: string;
  spotifyId?: string | null;
  name: string;
  slug: string;
  imageUrl?: string | null;
  genres: string; // JSON stringified array
  popularity: number;
  followers: number;
}

interface SongImportData {
  spotifyId: string;
  name: string;
  artist: string; // Primary artist name
  albumName?: string | null;
  albumId?: string | null;
  previewUrl?: string | null;
  isExplicit: boolean;
  popularity?: number | null;
  durationMs?: number | null;
  albumArtUrl?: string | null;
  spotifyUri?: string | null;
  externalUrls?: string | null; // JSON stringified
}

interface ShowImportData {
  tmEventId: string;
  headlinerArtistId?: string | null;
  venueId?: string | null;
  name?: string | null;
  date?: string | null;
  status: ShowStatus;
  ticketUrl?: string | null;
}

interface SetlistImportData {
  showId: string;
  artistId: string;
  type: SetlistType;
  name?: string;
  orderIndex?: number;
  isLocked?: boolean;
  totalVotes?: number;
}

// Validation functions
export function validateArtistData(data: Partial<ArtistImportData>): string[] {
  const errors: string[] = [];
  
  if (!data.name) errors.push("Artist name is required");
  if (!data.slug) errors.push("Artist slug is required");
  
  if (data.genres) {
    try {
      JSON.parse(data.genres);
    } catch {
      errors.push("Genres must be a valid JSON string");
    }
  }
  
  if (typeof data.popularity !== "undefined" && (data.popularity < 0 || data.popularity > 100)) {
    errors.push("Popularity must be between 0 and 100");
  }
  
  return errors;
}

export function validateSongData(data: Partial<SongImportData>): string[] {
  const errors: string[] = [];
  
  if (!data.name) errors.push("Song name is required");
  if (!data.artist) errors.push("Artist name is required");
  if (!data.spotifyId) errors.push("Spotify ID is required for songs");
  
  if (data.externalUrls) {
    try {
      JSON.parse(data.externalUrls);
    } catch {
      errors.push("External URLs must be a valid JSON string");
    }
  }
  
  if (typeof data.durationMs !== "undefined" && data.durationMs < 0) {
    errors.push("Duration must be positive");
  }
  
  return errors;
}

export function validateShowData(data: Partial<ShowImportData>): string[] {
  const errors: string[] = [];
  
  if (!data.tmEventId) errors.push("Ticketmaster Event ID is required");
  
  if (data.status && !isValidShowStatus(data.status)) {
    errors.push(`Invalid show status: ${data.status}`);
  }
  
  if (data.date) {
    const dateObj = new Date(data.date);
    if (isNaN(dateObj.getTime())) {
      errors.push("Invalid date format");
    }
  }
  
  return errors;
}

export function validateSetlistData(data: Partial<SetlistImportData>): string[] {
  const errors: string[] = [];
  
  if (!data.showId) errors.push("Show ID is required");
  if (!data.artistId) errors.push("Artist ID is required");
  
  if (!data.type || !isValidSetlistType(data.type)) {
    errors.push(`Invalid setlist type: ${data.type}`);
  }
  
  if (typeof data.totalVotes !== "undefined" && data.totalVotes < 0) {
    errors.push("Total votes cannot be negative");
  }
  
  return errors;
}

// Redis channel validation
export function validateRedisChannel(channel: string): boolean {
  const validPatterns = [
    /^import:progress:[a-zA-Z0-9_-]+$/,
    /^import:status:[a-zA-Z0-9_-]+$/
  ];
  
  return validPatterns.some(pattern => pattern.test(channel));
}

// Job ID validation
export function validateJobId(jobId: string): boolean {
  // Pattern: import_{tmAttractionId}_{timestamp} or sync_{tmAttractionId}_{timestamp}
  const pattern = /^(import|sync)_[a-zA-Z0-9]+_\d{13}$/;
  return pattern.test(jobId);
}

// Test the validators
if (require.main === module) {
  console.log("🔍 Running type validation tests...\n");
  
  // Test artist validation
  const testArtist: Partial<ArtistImportData> = {
    name: "Test Artist",
    slug: "test-artist",
    genres: JSON.stringify(["rock", "pop"]),
    popularity: 75,
    followers: 10000
  };
  
  const artistErrors = validateArtistData(testArtist);
  console.log("✅ Artist validation:", artistErrors.length === 0 ? "PASSED" : `FAILED: ${artistErrors.join(", ")}`);
  
  // Test song validation
  const testSong: Partial<SongImportData> = {
    spotifyId: "abc123",
    name: "Test Song",
    artist: "Test Artist",
    isExplicit: false,
    popularity: 80
  };
  
  const songErrors = validateSongData(testSong);
  console.log("✅ Song validation:", songErrors.length === 0 ? "PASSED" : `FAILED: ${songErrors.join(", ")}`);
  
  // Test Redis channel
  const testChannel = "import:progress:import_ABC123_1734567890123";
  console.log("✅ Redis channel validation:", validateRedisChannel(testChannel) ? "PASSED" : "FAILED");
  
  // Test Job ID
  const testJobId = "import_K8xDtP3QR_1734567890123";
  console.log("✅ Job ID validation:", validateJobId(testJobId) ? "PASSED" : "FAILED");
  
  console.log("\n✨ Type validation complete!");
}