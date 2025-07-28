// Setlist Types
export interface Song {
  id: string;
  title: string;
  artistId: string;
  artist?: {
    id: string;
    name: string;
    slug: string;
  };
  duration?: number;
  spotifyId?: string;
  appleMusicId?: string;
  imageUrl?: string;
  genres?: string[];
  popularity?: number;
}

export interface SetlistSong {
  id: string;
  setlistId: string;
  songId: string;
  position: number;
  notes?: string;
  isEncore?: boolean;
  song?: Song;
  upvotes: number;
  downvotes: number;
  currentUserVote?: "up" | "down" | null;
}

export interface Setlist {
  id: string;
  showId: string;
  title?: string;
  description?: string;
  songs: SetlistSong[];
  createdAt: string;
  updatedAt: string;
  show?: {
    id: string;
    date: string;
    venueName: string;
    artistName: string;
  };
}

export interface VoteSummary {
  songId: string;
  songTitle: string;
  netVotes: number;
  upvotes: number;
  downvotes: number;
  percentage: number;
}
