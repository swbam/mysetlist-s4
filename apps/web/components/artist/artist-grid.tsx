'use client';

// import { useAuth } from '@repo/auth';
import { ArtistGrid as UIArtistGrid } from '@repo/design-system';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Artist {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  smallImageUrl?: string | null;
  genres?: string[] | string | null;
  followers?: number | null;
  followerCount?: number | null;
  popularity?: number | null;
  verified?: boolean;
  trendingScore?: number | null;
  upcomingShows?: number;
  isFollowing?: boolean;
}

interface ArtistGridProps {
  initialArtists?: Artist[];
  title?: string;
  showFollowButtons?: boolean;
  variant?: 'grid' | 'list' | 'compact';
  fetchUrl?: string;
  searchQuery?: string;
  genre?: string;
  sortBy?: 'name' | 'popularity' | 'followers' | 'trending';
  filterBy?: string;
  pageSize?: number;
  className?: string;
}

export function ArtistGrid({
  initialArtists = [],
  title,
  showFollowButtons = true,
  variant = 'grid',
  fetchUrl = '/api/artists',
  searchQuery,
  genre,
  sortBy = 'popularity',
  filterBy = 'all',
  pageSize = 20,
  className,
}: ArtistGridProps) {
  const router = useRouter();
  // const { user } = useAuth();
  const user = null; // Temporarily disabled auth
  const [artists, setArtists] = useState<Artist[]>(initialArtists);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [currentSort, setCurrentSort] = useState(sortBy);
  const [currentFilter, setCurrentFilter] = useState(filterBy);

  // Fetch artists when parameters change
  useEffect(() => {
    if (initialArtists.length === 0) {
      fetchArtists(true);
    } else {
      // Check following status for initial artists if user is logged in
      if (user && showFollowButtons) {
        checkFollowingStatus(initialArtists);
      }
    }
  }, [searchQuery, genre, currentSort, currentFilter]);

  // Update following status when user logs in
  useEffect(() => {
    if (user && artists.length > 0 && showFollowButtons) {
      checkFollowingStatus(artists);
    }
  }, [user]);

  const buildFetchUrl = (pageNum: number, _reset = false) => {
    const params = new URLSearchParams();
    params.set('page', pageNum.toString());
    params.set('limit', pageSize.toString());
    params.set('sort', currentSort);

    if (currentFilter !== 'all') {
      params.set('filter', currentFilter);
    }
    if (searchQuery) {
      params.set('q', searchQuery);
    }
    if (genre) {
      params.set('genre', genre);
    }

    return `${fetchUrl}?${params.toString()}`;
  };

  const fetchArtists = async (reset = false) => {
    setLoading(true);
    try {
      const pageNum = reset ? 1 : page;
      const url = buildFetchUrl(pageNum, reset);
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        const newArtists = data.artists || [];

        if (reset) {
          setArtists(newArtists);
          setPage(2);
        } else {
          setArtists((prev) => [...prev, ...newArtists]);
          setPage((prev) => prev + 1);
        }

        setHasMore(newArtists.length === pageSize);

        // Check following status for new artists
        if (user && showFollowButtons) {
          checkFollowingStatus(newArtists);
        }
      } else {
        throw new Error('Failed to fetch artists');
      }
    } catch (_error) {
      toast.error('Failed to load artists');
    } finally {
      setLoading(false);
    }
  };

  const checkFollowingStatus = async (_artistsToCheck: Artist[]) => {
    try {
      const response = await fetch('/api/user/following');
      if (response.ok) {
        const data = await response.json();
        const followingIds = new Set(data.artistIds || []);

        setArtists((prev) =>
          prev.map((artist) => ({
            ...artist,
            isFollowing: followingIds.has(artist.id),
          }))
        );
      }
    } catch (_error) {}
  };

  const handleArtistSelect = (artist: Artist) => {
    router.push(`/artists/${artist.slug}`);
  };

  const handleFollow = async (
    artistId: string,
    currentlyFollowing: boolean
  ) => {
    if (!user) {
      toast.error('Please sign in to follow artists');
      router.push('/auth/sign-in');
      return;
    }

    try {
      const response = await fetch(`/api/artists/${artistId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following: !currentlyFollowing }),
      });

      if (response.ok) {
        setArtists((prev) =>
          prev.map((artist) =>
            artist.id === artistId
              ? { ...artist, isFollowing: !currentlyFollowing }
              : artist
          )
        );

        toast.success(
          currentlyFollowing ? 'Unfollowed artist' : 'Following artist'
        );
      } else if (response.status === 401) {
        toast.error('Please sign in to follow artists');
        router.push('/auth/sign-in');
      } else {
        throw new Error('Failed to update follow status');
      }
    } catch (_error) {
      toast.error('Failed to update follow status');
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchArtists(false);
    }
  };

  const handleRefresh = () => {
    fetchArtists(true);
  };

  const handleSortChange = (newSort: string) => {
    setCurrentSort(newSort as 'name' | 'popularity' | 'followers' | 'trending');
    setPage(1);
  };

  const handleFilterChange = (newFilter: string) => {
    setCurrentFilter(newFilter);
    setPage(1);
  };

  const getEmptyState = () => {
    if (searchQuery) {
      return {
        title: 'No artists found',
        description: `No artists match your search for "${searchQuery}". Try different keywords or browse by genre.`,
        action: {
          label: 'Browse All Artists',
          onClick: () => router.push('/artists'),
        },
      };
    }

    if (genre) {
      return {
        title: `No ${genre} artists found`,
        description: `We couldn't find any artists in the ${genre} genre. Try exploring other genres or search for specific artists.`,
        action: {
          label: 'Explore All Genres',
          onClick: () => router.push('/discover'),
        },
      };
    }

    return {
      title: 'No artists found',
      description:
        'Start by searching for your favorite artists or explore trending musicians.',
      action: {
        label: 'Discover Artists',
        onClick: () => router.push('/discover'),
      },
    };
  };

  return (
    <UIArtistGrid
      artists={artists}
      onArtistSelect={handleArtistSelect}
      onFollow={handleFollow}
      onLoadMore={handleLoadMore}
      onRefresh={handleRefresh}
      loading={loading}
      hasMore={hasMore}
      title={title ?? ''}
      showFollowButtons={showFollowButtons}
      variant={variant}
      sortBy={currentSort}
      onSortChange={handleSortChange}
      filterBy={currentFilter}
      onFilterChange={handleFilterChange}
      emptyState={getEmptyState()}
      className={className ?? ''}
    />
  );
}
