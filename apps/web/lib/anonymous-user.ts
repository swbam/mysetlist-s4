"use client";

import { v4 as uuidv4 } from "uuid";

interface AnonymousVote {
  setlistSongId: string;
  voteType: "up" | "down";
  timestamp: number;
}

interface AnonymousSong {
  setlistId: string;
  songId: string;
  timestamp: number;
}

interface AnonymousSession {
  sessionId: string;
  votes: AnonymousVote[];
  songsAdded: AnonymousSong[];
  createdAt: number;
}

const STORAGE_KEY = "mysetlist_anonymous_session";
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MAX_VOTES = 1;
const MAX_SONGS = 1;

export class AnonymousUserManager {
  private static instance: AnonymousUserManager;

  private constructor() {}

  static getInstance(): AnonymousUserManager {
    if (!AnonymousUserManager.instance) {
      AnonymousUserManager.instance = new AnonymousUserManager();
    }
    return AnonymousUserManager.instance;
  }

  getSession(): AnonymousSession {
    if (typeof window === "undefined") {
      return this.createNewSession();
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return this.createNewSession();
    }

    try {
      const session = JSON.parse(stored) as AnonymousSession;

      // Check if session is expired
      if (Date.now() - session.createdAt > SESSION_DURATION) {
        return this.createNewSession();
      }

      return session;
    } catch {
      return this.createNewSession();
    }
  }

  private createNewSession(): AnonymousSession {
    const session: AnonymousSession = {
      sessionId: uuidv4(),
      votes: [],
      songsAdded: [],
      createdAt: Date.now(),
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }

    return session;
  }

  saveSession(session: AnonymousSession): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }

  canVote(): boolean {
    const session = this.getSession();
    return session.votes.length < MAX_VOTES;
  }

  canAddSong(): boolean {
    const session = this.getSession();
    return session.songsAdded.length < MAX_SONGS;
  }

  getRemainingVotes(): number {
    const session = this.getSession();
    return MAX_VOTES - session.votes.length;
  }

  getRemainingSongs(): number {
    const session = this.getSession();
    return MAX_SONGS - session.songsAdded.length;
  }

  addVote(setlistSongId: string, voteType: "up" | "down"): boolean {
    const session = this.getSession();

    if (!this.canVote()) {
      return false;
    }

    // Remove any existing vote on the same song
    session.votes = session.votes.filter(
      (v) => v.setlistSongId !== setlistSongId,
    );

    // Add new vote
    session.votes.push({
      setlistSongId,
      voteType,
      timestamp: Date.now(),
    });

    this.saveSession(session);
    return true;
  }

  removeVote(setlistSongId: string): boolean {
    const session = this.getSession();
    const originalLength = session.votes.length;

    session.votes = session.votes.filter(
      (v) => v.setlistSongId !== setlistSongId,
    );

    if (session.votes.length < originalLength) {
      this.saveSession(session);
      return true;
    }

    return false;
  }

  getVote(setlistSongId: string): "up" | "down" | null {
    const session = this.getSession();
    const vote = session.votes.find((v) => v.setlistSongId === setlistSongId);
    return vote?.voteType || null;
  }

  addSong(setlistId: string, songId: string): boolean {
    const session = this.getSession();

    if (!this.canAddSong()) {
      return false;
    }

    session.songsAdded.push({
      setlistId,
      songId,
      timestamp: Date.now(),
    });

    this.saveSession(session);
    return true;
  }

  hasAddedSongToSetlist(setlistId: string): boolean {
    const session = this.getSession();
    return session.songsAdded.some((s) => s.setlistId === setlistId);
  }

  clearSession(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // Method to get all anonymous data for syncing after sign up
  getSessionData(): AnonymousSession {
    return this.getSession();
  }
}

export const anonymousUser = AnonymousUserManager.getInstance();
