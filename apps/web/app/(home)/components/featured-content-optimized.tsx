"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Lazy load the entire UI content
const FeaturedContentUI = dynamic(
  () => import("./featured-content-ui"),
  {
    loading: () => (
      <section className="relative py-12 md:py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center md:mb-12">
            <div className="mx-auto mb-4 h-10 w-64 animate-pulse rounded bg-muted" />
            <div className="mx-auto h-6 w-96 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="h-96 animate-pulse rounded-lg bg-muted" />
            </div>
            <div className="h-96 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </section>
    ),
    ssr: false,
  },
);

interface FeaturedShow {
  id: string;
  name: string;
  venue: string;
  date: string;
  imageUrl: string;
  attendees: number;
  votesCount: number;
}

interface TopVotedSong {
  id: string;
  title: string;
  artist: string;
  votes: number;
  percentage: number;
}

interface UpcomingShow {
  id: string;
  artist: string;
  venue: string;
  date: string;
  ticketsLeft?: number;
}

function FeaturedContent() {
  const [featuredShow, setFeaturedShow] = useState<FeaturedShow | null>(null);
  const [topVotedSongs, setTopVotedSongs] = useState<TopVotedSong[]>([]);
  const [upcomingHighlights, setUpcomingHighlights] = useState<UpcomingShow[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedContent = async () => {
      try {
        // Parallel fetch all content
        const [featuredRes, songsRes, upcomingRes] = await Promise.all([
          fetch("/api/trending/featured"),
          fetch("/api/trending/top-songs"),
          fetch("/api/trending/upcoming-shows"),
        ]);

        if (featuredRes.ok) {
          const data = await featuredRes.json();
          setFeaturedShow(data.show);
        }

        if (songsRes.ok) {
          const data = await songsRes.json();
          setTopVotedSongs(data.songs || []);
        }

        if (upcomingRes.ok) {
          const data = await upcomingRes.json();
          setUpcomingHighlights(data.shows || []);
        }
      } catch (error) {
        console.error("Error fetching featured content:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedContent();
  }, []);

  // Show loading skeleton while fetching
  if (loading) {
    return (
      <section className="relative py-12 md:py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center md:mb-12">
            <div className="mx-auto mb-4 h-10 w-64 animate-pulse rounded bg-muted" />
            <div className="mx-auto h-6 w-96 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="h-96 animate-pulse rounded-lg bg-muted" />
            </div>
            <div className="h-96 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </section>
    );
  }

  // Don't render if no data
  if (
    !featuredShow &&
    topVotedSongs.length === 0 &&
    upcomingHighlights.length === 0
  ) {
    return null;
  }

  return (
    <FeaturedContentUI
      featuredShow={featuredShow}
      topVotedSongs={topVotedSongs}
      upcomingHighlights={upcomingHighlights}
    />
  );
}

export default FeaturedContent;