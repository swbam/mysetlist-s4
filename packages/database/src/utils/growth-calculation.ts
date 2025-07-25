/**
 * Real Growth Calculation Utilities
 * 
 * These functions replace all fake mathematical growth formulas with 
 * real historical data comparisons for trending calculations.
 */

/**
 * Calculate real percentage growth between current and previous values
 * @param current - Current value
 * @param previous - Previous value (from historical tracking)
 * @returns Real growth percentage (can be negative)
 */
export function calculateRealGrowth(current: number, previous: number | null | undefined): number {
  // If no previous data, growth is 0 (no fake calculations)
  if (!previous || previous === 0) return 0;
  
  // Calculate real percentage change
  return ((current - previous) / previous) * 100;
}

/**
 * Calculate growth rate for multiple metrics and return weighted average
 * @param metrics - Array of {current, previous, weight} objects
 * @returns Weighted average growth rate based on real data
 */
export function calculateWeightedGrowth(
  metrics: Array<{
    current: number;
    previous: number | null | undefined;
    weight: number;
  }>
): number {
  let totalWeightedGrowth = 0;
  let totalWeight = 0;
  
  for (const metric of metrics) {
    const growth = calculateRealGrowth(metric.current, metric.previous);
    totalWeightedGrowth += growth * metric.weight;
    totalWeight += metric.weight;
  }
  
  return totalWeight > 0 ? totalWeightedGrowth / totalWeight : 0;
}

/**
 * Artist-specific growth calculation using real historical data
 */
export function calculateArtistGrowth(artist: {
  followers: number;
  previousFollowers?: number | null;
  popularity: number;
  previousPopularity?: number | null;
  monthlyListeners?: number | null;
  previousMonthlyListeners?: number | null;
  followerCount: number;
  previousFollowerCount?: number | null;
}): {
  followersGrowth: number;
  popularityGrowth: number;
  monthlyListenersGrowth: number;
  appFollowersGrowth: number;
  overallGrowth: number;
} {
  const followersGrowth = calculateRealGrowth(artist.followers, artist.previousFollowers);
  const popularityGrowth = calculateRealGrowth(artist.popularity, artist.previousPopularity);
  const monthlyListenersGrowth = calculateRealGrowth(
    artist.monthlyListeners || 0, 
    artist.previousMonthlyListeners
  );
  const appFollowersGrowth = calculateRealGrowth(artist.followerCount, artist.previousFollowerCount);
  
  // Calculate weighted overall growth (no fake bonuses)
  const overallGrowth = calculateWeightedGrowth([
    { current: artist.followers, previous: artist.previousFollowers, weight: 0.3 },
    { current: artist.popularity, previous: artist.previousPopularity, weight: 0.25 },
    { current: artist.monthlyListeners || 0, previous: artist.previousMonthlyListeners, weight: 0.25 },
    { current: artist.followerCount, previous: artist.previousFollowerCount, weight: 0.2 },
  ]);
  
  return {
    followersGrowth,
    popularityGrowth,
    monthlyListenersGrowth,
    appFollowersGrowth,
    overallGrowth,
  };
}

/**
 * Show-specific growth calculation using real historical data
 */
export function calculateShowGrowth(show: {
  viewCount: number;
  previousViewCount?: number | null;
  attendeeCount: number;
  previousAttendeeCount?: number | null;
  voteCount: number;
  previousVoteCount?: number | null;
  setlistCount?: number | null;
  previousSetlistCount?: number | null;
}): {
  viewGrowth: number;
  attendeeGrowth: number;
  voteGrowth: number;
  setlistGrowth: number;
  overallGrowth: number;
} {
  const viewGrowth = calculateRealGrowth(show.viewCount, show.previousViewCount);
  const attendeeGrowth = calculateRealGrowth(show.attendeeCount, show.previousAttendeeCount);
  const voteGrowth = calculateRealGrowth(show.voteCount, show.previousVoteCount);
  const setlistGrowth = calculateRealGrowth(show.setlistCount || 0, show.previousSetlistCount);
  
  // Calculate weighted overall growth (no fake bonuses)
  const overallGrowth = calculateWeightedGrowth([
    { current: show.viewCount, previous: show.previousViewCount, weight: 0.2 },
    { current: show.attendeeCount, previous: show.previousAttendeeCount, weight: 0.25 },
    { current: show.voteCount, previous: show.previousVoteCount, weight: 0.3 },
    { current: show.setlistCount || 0, previous: show.previousSetlistCount, weight: 0.25 },
  ]);
  
  return {
    viewGrowth,
    attendeeGrowth,
    voteGrowth,
    setlistGrowth,
    overallGrowth,
  };
}

/**
 * Venue-specific growth calculation using real historical data
 */
export function calculateVenueGrowth(venue: {
  totalShows: number;
  previousTotalShows?: number | null;
  upcomingShows: number;
  previousUpcomingShows?: number | null;
  totalAttendance?: number | null;
  previousTotalAttendance?: number | null;
}): {
  totalShowsGrowth: number;
  upcomingShowsGrowth: number;
  attendanceGrowth: number;
  overallGrowth: number;
} {
  const totalShowsGrowth = calculateRealGrowth(venue.totalShows, venue.previousTotalShows);
  const upcomingShowsGrowth = calculateRealGrowth(venue.upcomingShows, venue.previousUpcomingShows);
  const attendanceGrowth = calculateRealGrowth(venue.totalAttendance || 0, venue.previousTotalAttendance);
  
  // Calculate weighted overall growth (no fake bonuses)
  const overallGrowth = calculateWeightedGrowth([
    { current: venue.totalShows, previous: venue.previousTotalShows, weight: 0.4 },
    { current: venue.upcomingShows, previous: venue.previousUpcomingShows, weight: 0.3 },
    { current: venue.totalAttendance || 0, previous: venue.previousTotalAttendance, weight: 0.3 },
  ]);
  
  return {
    totalShowsGrowth,
    upcomingShowsGrowth,
    attendanceGrowth,
    overallGrowth,
  };
}

/**
 * Store current values as previous values for next growth calculation cycle
 * This should be called during the cron job before updating current values
 */
export function createHistoricalSnapshot<T extends Record<string, any>>(
  currentData: T,
  fieldsToTrack: Array<keyof T>
): Partial<T> {
  const snapshot: Partial<T> = {};
  
  for (const field of fieldsToTrack) {
    const previousField = `previous${String(field).charAt(0).toUpperCase()}${String(field).slice(1)}` as keyof T;
    snapshot[previousField] = currentData[field];
  }
  
  snapshot['lastGrowthCalculated' as keyof T] = new Date() as T[keyof T];
  
  return snapshot;
}