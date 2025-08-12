# Real-time Features Documentation

## Overview

The TheSet app now includes comprehensive real-time features powered by Supabase's real-time subscriptions. These features provide instant updates across the application without requiring page refreshes.

## Architecture

### Core Components

1. **RealtimeProvider** (`app/[locale]/providers/realtime-provider.tsx`)
   - Manages global real-time connection status
   - Provides connection state to all child components
   - Automatically handles reconnection

2. **Real-time Hooks**
   - `useRealtimeArtist` - Artist follower counts
   - `useRealtimeSetlist` - Live setlist updates
   - `useRealtimeVotes` - Song voting
   - `useRealtimeShows` - New shows feed

3. **UI Components**
   - `RealtimeStatus` - Connection status indicator
   - `LiveIndicator` - Pulsing live badge
   - `RealtimeShowCard` - Show cards with live updates
   - `SongVoteButtons` - Real-time voting buttons

## Features

### 1. Live Show Status

Shows automatically update their status:

- **Upcoming** → **Ongoing** → **Completed**
- Live shows display a pulsing "LIVE" indicator
- Status changes are reflected instantly across all views

### 2. Real-time Attendance Tracking

- Attendance counts update instantly when users mark attendance
- Optimistic updates provide immediate feedback
- Automatic rollback on errors

### 3. Live Setlists

During live shows:

- Songs appear as they're added to the setlist
- Position changes update in real-time
- Special indicators for covers and debuts
- "Now playing" indicator for the current song

### 4. Real-time Voting

- Vote counts update instantly
- User's vote state is preserved
- Animated count transitions

### 5. Artist Follower Counts

- Follower counts update across all views
- Smooth animations on count changes

### 6. New Shows Feed

- New shows appear automatically
- Notification when new shows are added
- Live shows appear at the top

## Implementation Guide

### Connection Status

The connection status is available globally:

```typescript
import { useRealtimeConnection } from '@/app/[locale]/providers/realtime-provider';

function MyComponent() {
  const { isConnected, connectionStatus } = useRealtimeConnection();

  if (!isConnected) {
    return <p>Real-time updates unavailable</p>;
  }

  return <p>Connected!</p>;
}
```

## Database Setup

Ensure these tables have real-time enabled in Supabase:

```sql
-- Enable real-time for required tables
ALTER PUBLICATION supabase_realtime ADD TABLE shows;
ALTER PUBLICATION supabase_realtime ADD TABLE show_attendances;
ALTER PUBLICATION supabase_realtime ADD TABLE artist_followers;
ALTER PUBLICATION supabase_realtime ADD TABLE setlists;
ALTER PUBLICATION supabase_realtime ADD TABLE setlist_songs;
ALTER PUBLICATION supabase_realtime ADD TABLE song_votes;
```

## Best Practices

1. **Cleanup Subscriptions**
   - Always clean up subscriptions in useEffect cleanup
   - Use `supabase.removeChannel()` to prevent memory leaks

2. **Optimistic Updates**
   - Apply UI changes immediately
   - Rollback on errors
   - Show loading states appropriately

3. **Error Handling**
   - Handle connection errors gracefully
   - Provide fallback UI for offline states
   - Log errors for debugging

4. **Performance**
   - Limit the number of active subscriptions
   - Use channel multiplexing where possible
   - Implement pagination for large datasets

## Troubleshooting

### Connection Issues

1. Check if real-time is enabled in Supabase dashboard
2. Verify environment variables are set correctly
3. Check browser console for WebSocket errors

### Updates Not Appearing

1. Ensure tables have real-time publication enabled
2. Check RLS policies allow read access
3. Verify subscription filters are correct

### Performance Problems

1. Reduce number of active subscriptions
2. Implement debouncing for rapid updates
3. Use pagination for large result sets
