# Real-time Setlist Updates Implementation

This document summarizes the implementation of real-time setlist updates using Supabase's real-time features.

## Components Created

### 1. **Enhanced Setlist Viewer** (`/apps/web/app/setlists/[showId]/components/enhanced-setlist-viewer.tsx`)
- Real-time updates for votes and song status
- Live connection status indicator
- Animated transitions when songs are marked as played
- Event notifications for real-time changes
- Support for predicted vs actual setlists

### 2. **Real-time Hooks**

#### `useRealtimeSetlist` (`/apps/web/hooks/use-realtime-setlist.ts`)
- Manages Supabase real-time subscriptions for setlist data
- Handles automatic reconnection with exponential backoff
- Provides connection status tracking
- Emits events for vote updates, song plays, and connection changes

#### `useRealtimeVotes` (`/apps/web/hooks/use-realtime-votes.ts`)
- Specialized hook for real-time vote tracking
- Optimistic updates for immediate UI feedback
- Batch fetching of vote counts

### 3. **Real-time Activity Feed** (`/apps/web/components/realtime-activity-feed.tsx`)
- Shows live updates of user activities
- Tracks votes, songs played, and user attendance
- Animated entry/exit transitions
- Auto-dismiss functionality

### 4. **Connection Status Components**

#### `RealtimeConnectionIndicator` (`/apps/web/components/realtime-connection-indicator.tsx`)
- Multiple display variants (default, minimal, detailed)
- Visual feedback for connection states
- Tooltip support for additional information

#### `LiveShowIndicator` (`/apps/web/components/live-show-indicator.tsx`)
- Shows if a show is currently live
- Countdown for upcoming shows
- Animated pulse effect for live shows

### 5. **Real-time Notifications** (`/apps/web/components/realtime-notifications.tsx`)
- Toast-style notifications for real-time events
- Gradient backgrounds based on event type
- Auto-dismiss with configurable duration
- Position customization

## Database Enhancements

### Vote Count Trigger (`/packages/database/migrations/0002_add_vote_count_trigger.sql`)
- Automatic update of vote counts on `setlist_songs` table
- Triggers for INSERT, UPDATE, and DELETE operations
- Maintains denormalized vote counts for performance

## API Endpoints

### Vote Count Endpoint (`/app/api/votes/[setlistSongId]/count/route.ts`)
- Returns current vote counts for a specific setlist song
- Includes user's vote status if authenticated

## Features Implemented

1. **Real-time Vote Updates**
   - Votes update instantly across all connected clients
   - Vote counts are synchronized in real-time
   - Optimistic updates for immediate feedback

2. **Live Song Tracking**
   - Songs marked as "played" update in real-time
   - Visual indicators for currently playing songs
   - Timestamp tracking for when songs were played

3. **Connection Management**
   - Automatic reconnection on connection loss
   - Visual indicators for connection status
   - Graceful degradation when offline

4. **Event Notifications**
   - Toast notifications for important events
   - Activity feed showing recent actions
   - Customizable notification preferences

5. **Performance Optimizations**
   - Denormalized vote counts for fast queries
   - Efficient real-time subscriptions
   - Batched updates to reduce API calls

## Usage

The enhanced setlist viewer is now used on the setlist page:

```tsx
<EnhancedSetlistViewer showId={showId} />
```

The real-time activity feed can be added to any page:

```tsx
<RealtimeActivityFeed showId={showId} />
```

## Integration with Existing Features

- Built upon the existing voting system
- Compatible with the current authentication system
- Integrates with the RealtimeProvider in the app layout
- Uses the existing Supabase client configuration

## Next Steps

To further enhance the real-time experience:

1. Add push notifications for mobile devices
2. Implement presence features to show who's viewing
3. Add real-time collaborative setlist editing for admins
4. Create real-time analytics dashboard
5. Add WebSocket fallback for older browsers