"use strict";
/**
 * Real Growth Calculation Utilities
 *
 * These functions replace all fake mathematical growth formulas with
 * real historical data comparisons for trending calculations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRealGrowth = calculateRealGrowth;
exports.calculateWeightedGrowth = calculateWeightedGrowth;
exports.calculateArtistGrowth = calculateArtistGrowth;
exports.calculateShowGrowth = calculateShowGrowth;
exports.calculateVenueGrowth = calculateVenueGrowth;
exports.createHistoricalSnapshot = createHistoricalSnapshot;
/**
 * Calculate real percentage growth between current and previous values
 * @param current - Current value
 * @param previous - Previous value (from historical tracking)
 * @returns Real growth percentage (can be negative)
 */
function calculateRealGrowth(current, previous) {
    // If no previous data, growth is 0 (no fake calculations)
    if (!previous || previous === 0)
        return 0;
    // Calculate real percentage change
    return ((current - previous) / previous) * 100;
}
/**
 * Calculate growth rate for multiple metrics and return weighted average
 * @param metrics - Array of {current, previous, weight} objects
 * @returns Weighted average growth rate based on real data
 */
function calculateWeightedGrowth(metrics) {
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
function calculateArtistGrowth(artist) {
    const followersGrowth = calculateRealGrowth(artist.followers, artist.previousFollowers);
    const popularityGrowth = calculateRealGrowth(artist.popularity, artist.previousPopularity);
    const monthlyListenersGrowth = calculateRealGrowth(artist.monthlyListeners || 0, artist.previousMonthlyListeners);
    const appFollowersGrowth = calculateRealGrowth(artist.followerCount, artist.previousFollowerCount);
    // Calculate weighted overall growth (no fake bonuses)
    const overallGrowth = calculateWeightedGrowth([
        {
            current: artist.followers,
            previous: artist.previousFollowers,
            weight: 0.3,
        },
        {
            current: artist.popularity,
            previous: artist.previousPopularity,
            weight: 0.25,
        },
        {
            current: artist.monthlyListeners || 0,
            previous: artist.previousMonthlyListeners,
            weight: 0.25,
        },
        {
            current: artist.followerCount,
            previous: artist.previousFollowerCount,
            weight: 0.2,
        },
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
function calculateShowGrowth(show) {
    const viewGrowth = calculateRealGrowth(show.viewCount, show.previousViewCount);
    const attendeeGrowth = calculateRealGrowth(show.attendeeCount, show.previousAttendeeCount);
    const voteGrowth = calculateRealGrowth(show.voteCount, show.previousVoteCount);
    const setlistGrowth = calculateRealGrowth(show.setlistCount || 0, show.previousSetlistCount);
    // Calculate weighted overall growth (no fake bonuses)
    const overallGrowth = calculateWeightedGrowth([
        { current: show.viewCount, previous: show.previousViewCount, weight: 0.2 },
        {
            current: show.attendeeCount,
            previous: show.previousAttendeeCount,
            weight: 0.25,
        },
        { current: show.voteCount, previous: show.previousVoteCount, weight: 0.3 },
        {
            current: show.setlistCount || 0,
            previous: show.previousSetlistCount,
            weight: 0.25,
        },
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
function calculateVenueGrowth(venue) {
    const totalShowsGrowth = calculateRealGrowth(venue.totalShows, venue.previousTotalShows);
    const upcomingShowsGrowth = calculateRealGrowth(venue.upcomingShows, venue.previousUpcomingShows);
    const attendanceGrowth = calculateRealGrowth(venue.totalAttendance || 0, venue.previousTotalAttendance);
    // Calculate weighted overall growth (no fake bonuses)
    const overallGrowth = calculateWeightedGrowth([
        {
            current: venue.totalShows,
            previous: venue.previousTotalShows,
            weight: 0.4,
        },
        {
            current: venue.upcomingShows,
            previous: venue.previousUpcomingShows,
            weight: 0.3,
        },
        {
            current: venue.totalAttendance || 0,
            previous: venue.previousTotalAttendance,
            weight: 0.3,
        },
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
function createHistoricalSnapshot(currentData, fieldsToTrack) {
    const snapshot = {};
    for (const field of fieldsToTrack) {
        const previousField = `previous${String(field).charAt(0).toUpperCase()}${String(field).slice(1)}`;
        snapshot[previousField] = currentData[field];
    }
    snapshot["lastGrowthCalculated"] = new Date();
    return snapshot;
}
