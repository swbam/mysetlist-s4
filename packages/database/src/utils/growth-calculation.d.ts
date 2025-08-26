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
export declare function calculateRealGrowth(current: number, previous: number | null | undefined): number;
/**
 * Calculate growth rate for multiple metrics and return weighted average
 * @param metrics - Array of {current, previous, weight} objects
 * @returns Weighted average growth rate based on real data
 */
export declare function calculateWeightedGrowth(metrics: Array<{
    current: number;
    previous: number | null | undefined;
    weight: number;
}>): number;
/**
 * Artist-specific growth calculation using real historical data
 */
export declare function calculateArtistGrowth(artist: {
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
};
/**
 * Show-specific growth calculation using real historical data
 */
export declare function calculateShowGrowth(show: {
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
};
/**
 * Venue-specific growth calculation using real historical data
 */
export declare function calculateVenueGrowth(venue: {
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
};
/**
 * Store current values as previous values for next growth calculation cycle
 * This should be called during the cron job before updating current values
 */
export declare function createHistoricalSnapshot<T extends Record<string, any>>(currentData: T, fieldsToTrack: Array<keyof T>): Partial<T>;
//# sourceMappingURL=growth-calculation.d.ts.map