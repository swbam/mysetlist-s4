"use client"

// Component disabled - react-window not installed

// Types commented out as component is disabled
/*
interface Song {
  id: string;
  title: string;
  artist: string;
  duration?: number;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
  popularity?: number;
  isLive?: boolean;
}

interface VirtualizedVoteListProps {
  songs: Song[];
  height?: number;
  itemHeight?: number;
  userId?: string;
  showId?: string;
  enableRealtime?: boolean;
  enableOptimisticUpdates?: boolean;
  onVoteUpdate?: (songId: string, votes: any) => void;
  className?: string;
}
*/

// COMPONENT DISABLED - react-window not installed
export const VirtualizedVoteList = () => null
export const OptimizedVoteList = () => null
export type VirtualizedVoteListRef = {}

/*
// Memoized row component to prevent unnecessary re-renders
const VoteListRow = memo(function VoteListRow({
  index,
  style,
  data,
}: ListChildComponentProps<{
  songs: Song[];
  userId?: string;
  showId?: string;
  enableRealtime: boolean;
  enableOptimisticUpdates: boolean;
  onVoteUpdate?: (songId: string, votes: any) => void;
}>) {
  const { songs, userId, showId, enableRealtime, enableOptimisticUpdates, onVoteUpdate } = data;
  const song = songs[index];

  const handleVoteUpdate = useCallback((votes: any) => {
    onVoteUpdate?.(song.id, votes);
  }, [song.id, onVoteUpdate]);

  const VoteComponent = enableRealtime ? RealtimeVoteButton : VoteButton;

  return (
    <div style={style} className="px-4 py-2">
      <Card className="h-full">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex items-center space-x-2">
              <Music className="h-4 w-4 text-muted-foreground" />
              {song.isLive && (
                <Badge variant="destructive" className="text-xs">
                  Live
                </Badge>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{song.title}</h3>
              <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
            </div>

            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {song.duration && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}</span>
                </div>
              )}
              
              {song.popularity && (
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>{song.popularity}</span>
                </div>
              )}
            </div>
          </div>

          <div className="ml-4">
            {enableRealtime ? (
              <RealtimeVoteButton
                setlistSongId={song.id}
                showId={showId || ''}
                userId={userId}
                variant="compact"
                size="sm"
                showLimits={false}
                showConnection={false}
                hapticFeedback={true}
              />
            ) : (
              <VoteButton
                setlistSongId={song.id}
                currentVote={song.userVote}
                upvotes={song.upvotes}
                downvotes={song.downvotes}
                variant="compact"
                size="sm"
                onVote={handleVoteUpdate}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

// Main virtualized list component
const VirtualizedVoteListComponent = function VirtualizedVoteList({
  songs,
  height = 400,
  itemHeight = 80,
  userId,
  showId,
  enableRealtime = true,
  enableOptimisticUpdates = true,
  onVoteUpdate,
  className,
}: VirtualizedVoteListProps) {
  const [localSongs, setLocalSongs] = useState(songs);
  const listRef = useRef<List>(null);

  // Memoize the item data to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    songs: localSongs,
    userId,
    showId,
    enableRealtime,
    enableOptimisticUpdates,
    onVoteUpdate: (songId: string, votes: any) => {
      // Update local state optimistically
      setLocalSongs(prev => prev.map(song => 
        song.id === songId 
          ? { ...song, upvotes: votes.upvotes, downvotes: votes.downvotes, userVote: votes.userVote }
          : song
      ));
      onVoteUpdate?.(songId, votes);
    },
  }), [localSongs, userId, showId, enableRealtime, enableOptimisticUpdates, onVoteUpdate]);

  // Scroll to specific song
  const scrollToSong = useCallback((songId: string) => {
    const index = localSongs.findIndex(song => song.id === songId);
    if (index !== -1 && listRef.current) {
      listRef.current.scrollToItem(index, 'center');
    }
  }, [localSongs]);

  // Update songs when prop changes
  const updateSongs = useCallback((newSongs: Song[]) => {
    setLocalSongs(newSongs);
  }, []);

  return (
    <div className={cn('w-full', className)}>
      <List
        ref={listRef}
        height={height}
        itemCount={localSongs.length}
        itemSize={itemHeight}
        itemData={itemData}
        width="100%"
        overscanCount={5} // Render 5 items outside visible area for smooth scrolling
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {VoteListRow}
      </List>
    </div>
  );
};

// Memoized export with custom comparison
export const VirtualizedVoteList = memo(VirtualizedVoteListComponent, (prevProps, nextProps) => {
  // Deep comparison for songs array
  const songsEqual = prevProps.songs.length === nextProps.songs.length &&
    prevProps.songs.every((song, index) => {
      const nextSong = nextProps.songs[index];
      return song.id === nextSong.id &&
        song.title === nextSong.title &&
        song.artist === nextSong.artist &&
        song.upvotes === nextSong.upvotes &&
        song.downvotes === nextSong.downvotes &&
        song.userVote === nextSong.userVote &&
        song.popularity === nextSong.popularity &&
        song.isLive === nextSong.isLive;
    });

  return songsEqual &&
    prevProps.height === nextProps.height &&
    prevProps.itemHeight === nextProps.itemHeight &&
    prevProps.userId === nextProps.userId &&
    prevProps.showId === nextProps.showId &&
    prevProps.enableRealtime === nextProps.enableRealtime &&
    prevProps.enableOptimisticUpdates === nextProps.enableOptimisticUpdates &&
    prevProps.className === nextProps.className;
});

// Export component methods for imperative usage
export type VirtualizedVoteListRef = {
  scrollToSong: (songId: string) => void;
  updateSongs: (songs: Song[]) => void;
};

// HOC for performance monitoring
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>
) {
  return memo(function PerformanceMonitoredComponent(props: P) {
    const renderStart = performance.now();
    
    const result = <Component {...props} />;
    
    const renderEnd = performance.now();
    const renderTime = renderEnd - renderStart;
    
    // Log slow renders in development
    if (process.env["NODE_ENV"] === 'development' && renderTime > 16) {
      console.warn(`Slow render detected: ${renderTime.toFixed(2)}ms`);
    }
    
    return result;
  });
}

// Performance-optimized vote list with monitoring
export const OptimizedVoteList = withPerformanceMonitoring(VirtualizedVoteList);
*/
