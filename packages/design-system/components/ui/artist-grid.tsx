'use client';

import { useState } from 'react';
import { ArtistCard } from './artist-card';
import { Button } from './button';
import { Skeleton } from './skeleton';
import { Card, CardContent } from './card';
import { 
  Music, 
  TrendingUp, 
  Filter, 
  Grid3X3, 
  List,
  Search,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { cn } from '../../lib/utils';

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
  artists: Artist[];
  onArtistSelect?: (artist: Artist) => void;
  onFollow?: (artistId: string, isFollowing: boolean) => void;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  hasMore?: boolean;
  title?: string;
  showFollowButtons?: boolean;
  variant?: 'grid' | 'list' | 'compact';
  sortBy?: 'name' | 'popularity' | 'followers' | 'trending';
  onSortChange?: (sortBy: string) => void;
  filterBy?: string;
  onFilterChange?: (filter: string) => void;
  emptyState?: {
    title: string;
    description: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  className?: string;
  cardClassName?: string;
}

export function ArtistGrid({
  artists,
  onArtistSelect,
  onFollow,
  onLoadMore,
  onRefresh,
  loading = false,
  hasMore = false,
  title,
  showFollowButtons = true,
  variant = 'grid',
  sortBy = 'name',
  onSortChange,
  filterBy,
  onFilterChange,
  emptyState,
  className,
  cardClassName
}: ArtistGridProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(variant === 'compact' ? 'list' : 'grid');

  const handleArtistClick = (artistSlug: string) => {
    const artist = artists.find(a => a.slug === artistSlug);
    if (artist && onArtistSelect) {
      onArtistSelect(artist);
    }
  };

  const getGridClasses = () => {
    if (viewMode === 'list' || variant === 'compact') {
      return 'space-y-3';
    }
    return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4';
  };

  const getCardVariant = () => {
    if (variant === 'compact') return 'compact';
    if (viewMode === 'list') return 'default';
    return 'grid';
  };

  const getSortLabel = (sort: string) => {
    switch (sort) {
      case 'name': return 'Name A-Z';
      case 'popularity': return 'Most Popular';
      case 'followers': return 'Most Followers';
      case 'trending': return 'Trending';
      default: return 'Sort';
    }
  };

  if (loading && artists.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        {title && (
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
        )}
        <div className={getGridClasses()}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (artists.length === 0 && !loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {title && (
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
        )}
        <Card>
          <CardContent className="p-12 text-center">
            <Music className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="text-xl font-semibold mb-2">
              {emptyState?.title || 'No artists found'}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {emptyState?.description || 'Try adjusting your search or filters to find artists.'}
            </p>
            {emptyState?.action && (
              <Button onClick={emptyState.action.onClick} className="gap-2">
                <Search className="h-4 w-4" />
                {emptyState.action.label}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      {(title || onSortChange || onFilterChange || onRefresh) && (
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h2 className="text-2xl font-bold mb-1">{title}</h2>
            )}
            <p className="text-muted-foreground">
              {artists.length} artist{artists.length !== 1 ? 's' : ''}
              {loading && ' (loading...)'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            {variant !== 'compact' && (
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none border-l"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Sort Dropdown */}
            {onSortChange && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {getSortLabel(sortBy)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onSortChange('name')}>
                    Name A-Z
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSortChange('popularity')}>
                    Most Popular
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSortChange('followers')}>
                    Most Followers
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSortChange('trending')}>
                    Trending
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Filter Dropdown */}
            {onFilterChange && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onFilterChange('all')}>
                    All Artists
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFilterChange('verified')}>
                    Verified Only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFilterChange('trending')}>
                    Trending
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFilterChange('following')}>
                    Following
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Refresh Button */}
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Artists Grid/List */}
      <div className={getGridClasses()}>
        {artists.map((artist) => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            onFollow={onFollow}
            onNavigate={handleArtistClick}
            variant={getCardVariant()}
            showFollowButton={showFollowButtons}
            className={cardClassName}
          />
        ))}
      </div>

      {/* Loading More */}
      {loading && artists.length > 0 && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading more artists...
          </div>
        </div>
      )}

      {/* Load More Button */}
      {hasMore && !loading && onLoadMore && (
        <div className="flex justify-center pt-6">
          <Button variant="outline" onClick={onLoadMore} className="gap-2">
            <Music className="h-4 w-4" />
            Load More Artists
          </Button>
        </div>
      )}

      {/* End of Results */}
      {!hasMore && artists.length > 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          You've reached the end of the list
        </div>
      )}
    </div>
  );
}