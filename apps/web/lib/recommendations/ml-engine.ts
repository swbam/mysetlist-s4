import { createClient } from "~/lib/supabase/server";

export interface MLRecommendationConfig {
  algorithm: "collaborative" | "content" | "hybrid" | "matrix_factorization";
  limit: number;
  minSimilarity: number;
  includeExplanations: boolean;
  useRealTimeData: boolean;
  diversityFactor: number; // 0-1, higher values prioritize diversity
  recencyWeight: number; // 0-1, higher values prioritize recent activity
}

export interface UserVector {
  userId: string;
  features: {
    genres: Record<string, number>;
    artists: Record<string, number>;
    venues: Record<string, number>;
    timePreferences: Record<string, number>; // hour of day preferences
    locationPreferences: Record<string, number>; // city preferences
    seasonalPreferences: Record<string, number>; // seasonal preferences
    votingBehavior: {
      avgVoteValue: number;
      voteFrequency: number;
      popularityBias: number; // preference for popular vs niche
    };
  };
  lastUpdated: Date;
}

export interface SimilarityMatrix {
  userA: string;
  userB: string;
  similarity: number;
  sharedItems: number;
  lastCalculated: Date;
}

export interface RecommendationExplanation {
  algorithm: string;
  reason: string;
  confidence: number;
  factors: Array<{
    factor: string;
    weight: number;
    contribution: number;
  }>;
}

export interface MLRecommendation {
  id: string;
  type: "show" | "artist" | "venue";
  name: string;
  score: number;
  imageUrl?: string;
  slug?: string;
  metadata: Record<string, any>;
  explanation: RecommendationExplanation;
  diversity_score: number;
  freshness_score: number;
}

class MLRecommendationEngine {
  private supabase: ReturnType<typeof createClient>;
  private userVectorCache = new Map<string, UserVector>();

  constructor() {
    this.supabase = createClient();
  }

  // Compute comprehensive user feature vector
  public async computeUserVector(userId: string): Promise<UserVector> {
    if (this.userVectorCache.has(userId)) {
      const cached = this.userVectorCache.get(userId)!;
      if (Date.now() - cached.lastUpdated.getTime() < 5 * 60 * 1000) {
        // 5 minutes
        return cached;
      }
    }

    const supabase = await this.supabase;

    // Get user's voting history
    const { data: votes } = await supabase
      .from("setlist_votes")
      .select(
        `
        vote_value,
        _creationTime,
        setlist_songs(
          songs(artistId, genre),
          setlists(
            shows(
              venueId,
              date,
              artists(id, name, genres)
            )
          )
        )
      `,
      )
      .eq("userId", userId)
      .order("_creationTime", { ascending: false })
      .limit(1000);

    // Get user's show attendance
    const { data: attendance } = await supabase
      .from("show_attendance")
      .select(
        `
        _creationTime,
        shows(
          id,
          date,
          venueId,
          artists(id, name, genres),
          venues(id, name, city)
        )
      `,
      )
      .eq("userId", userId)
      .order("_creationTime", { ascending: false })
      .limit(500);

    // Get user's followed artists
    const { data: follows } = await supabase
      .from("user_follows_artists")
      .select(
        `
        _creationTime,
        artists(id, name, genres)
      `,
      )
      .eq("userId", userId);

    // Process voting behavior
    const votingBehavior = this.computeVotingBehavior(votes || []);

    // Process genre preferences
    const genrePreferences = this.computeGenrePreferences(
      votes || [],
      attendance || [],
      follows || [],
    );

    // Process artist preferences
    const artistPreferences = this.computeArtistPreferences(
      votes || [],
      attendance || [],
      follows || [],
    );

    // Process venue preferences
    const venuePreferences = this.computeVenuePreferences(
      votes || [],
      attendance || [],
    );

    // Process temporal preferences
    const timePreferences = this.computeTimePreferences(
      votes || [],
      attendance || [],
    );

    // Process location preferences
    const locationPreferences = this.computeLocationPreferences(
      attendance || [],
    );

    // Process seasonal preferences
    const seasonalPreferences = this.computeSeasonalPreferences(
      votes || [],
      attendance || [],
    );

    const userVector: UserVector = {
      userId,
      features: {
        genres: genrePreferences,
        artists: artistPreferences,
        venues: venuePreferences,
        timePreferences,
        locationPreferences,
        seasonalPreferences,
        votingBehavior,
      },
      lastUpdated: new Date(),
    };

    this.userVectorCache.set(userId, userVector);
    return userVector;
  }

  // Collaborative filtering using cosine similarity
  public async getCollaborativeRecommendations(
    userId: string,
    config: MLRecommendationConfig,
  ): Promise<MLRecommendation[]> {
    const userVector = await this.computeUserVector(userId);
    const similarUsers = await this.findSimilarUsers(
      userId,
      config.minSimilarity,
    );

    const recommendations: MLRecommendation[] = [];
    const seenItems = new Set<string>();

    // Get items liked by similar users
    for (const similarUser of similarUsers) {
      const supabase = await this.supabase;
      const { data: similarUserItems } = await supabase
        .from("setlist_votes")
        .select(
          `
          vote_value,
          setlist_songs(
            songs(id, title, artistId),
            setlists(
              shows(id, name, slug, date, artists(id, name, imageUrl))
            )
          )
        `,
        )
        .eq("userId", similarUser.userB)
        .gte("vote_value", 3) // Only positive votes
        .order("_creationTime", { ascending: false })
        .limit(100);

      if (similarUserItems) {
        for (const item of similarUserItems) {
          const setlistSongs = Array.isArray(item.setlist_songs)
            ? item.setlist_songs[0]
            : item.setlist_songs;
          const setlists = Array.isArray(setlistSongs?.setlists)
            ? setlistSongs.setlists[0]
            : setlistSongs?.setlists;
          const show = Array.isArray(setlists?.shows)
            ? setlists.shows[0]
            : setlists?.shows;
          if (show && !seenItems.has(show.id)) {
            seenItems.add(show.id);

            const artist = Array.isArray(show.artists)
              ? show.artists[0]
              : show.artists;

            const score = this.calculateCollaborativeScore(
              item.vote_value,
              similarUser.similarity,
              userVector,
              show,
            );

            recommendations.push({
              id: show.id,
              type: "show",
              name: show.name,
              score,
              imageUrl: artist?.imageUrl,
              slug: show.slug,
              metadata: {
                artist_name: artist?.name,
                show_date: show.date,
                similarity_source: similarUser.userB,
              },
              explanation: {
                algorithm: "collaborative_filtering",
                reason: `Users similar to you (${(similarUser.similarity * 100).toFixed(1)}% match) enjoyed this show`,
                confidence: score,
                factors: [
                  {
                    factor: "user_similarity",
                    weight: 0.7,
                    contribution: similarUser.similarity,
                  },
                  {
                    factor: "vote_value",
                    weight: 0.3,
                    contribution: item.vote_value / 5,
                  },
                ],
              },
              diversity_score: this.calculateDiversityScore(show, userVector),
              freshness_score: this.calculateFreshnessScore(show.date),
            });
          }
        }
      }
    }

    return this.rankAndDiversify(recommendations, config);
  }

  // Content-based filtering using feature similarity
  public async getContentBasedRecommendations(
    userId: string,
    config: MLRecommendationConfig,
  ): Promise<MLRecommendation[]> {
    const userVector = await this.computeUserVector(userId);
    const recommendations: MLRecommendation[] = [];

    // Get shows matching user's genre preferences
    const topGenres = Object.entries(userVector.features.genres)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([genre]) => genre);

    if (topGenres.length > 0) {
      const supabase = await this.supabase;
      const { data: genreShows } = await supabase
        api.shows
        .select(
          `
          id,
          name,
          slug,
          date,
          artists(id, name, imageUrl, genres),
          venues(id, name, city)
        `,
        )
        .contains("artists.genres", topGenres)
        .gte("date", new Date().toISOString())
        .order("date", { ascending: true })
        .limit(100);

      if (genreShows) {
        for (const show of genreShows) {
          const artist = Array.isArray(show.artists)
            ? show.artists[0]
            : show.artists;
          const venue = Array.isArray(show.venues)
            ? show.venues[0]
            : show.venues;
          const score = this.calculateContentScore(show, userVector);

          recommendations.push({
            id: show.id,
            type: "show",
            name: show.name,
            score,
            imageUrl: artist?.imageUrl,
            slug: show.slug,
            metadata: {
              artist_name: artist?.name,
              venue_name: venue?.name,
              city: venue?.city,
              show_date: show.date,
              genres: artist?.genres,
            },
            explanation: {
              algorithm: "content_based",
              reason: `Matches your genre preferences: ${topGenres.join(", ")}`,
              confidence: score,
              factors: [
                {
                  factor: "genre_match",
                  weight: 0.5,
                  contribution: score * 0.5,
                },
                {
                  factor: "artist_preference",
                  weight: 0.3,
                  contribution: score * 0.3,
                },
                {
                  factor: "venue_preference",
                  weight: 0.2,
                  contribution: score * 0.2,
                },
              ],
            },
            diversity_score: this.calculateDiversityScore(show, userVector),
            freshness_score: this.calculateFreshnessScore(show.date),
          });
        }
      }
    }

    return this.rankAndDiversify(recommendations, config);
  }

  // Hybrid recommendation combining multiple approaches
  public async getHybridRecommendations(
    userId: string,
    config: MLRecommendationConfig,
  ): Promise<MLRecommendation[]> {
    const [collaborative, contentBased] = await Promise.all([
      this.getCollaborativeRecommendations(userId, {
        ...config,
        limit: config.limit * 2,
      }),
      this.getContentBasedRecommendations(userId, {
        ...config,
        limit: config.limit * 2,
      }),
    ]);

    // Combine and rerank with hybrid scoring
    const combinedRecommendations = new Map<string, MLRecommendation>();

    // Add collaborative recommendations with weight
    for (const rec of collaborative) {
      combinedRecommendations.set(rec.id, {
        ...rec,
        score: rec.score * 0.6, // 60% weight for collaborative
        explanation: {
          ...rec.explanation,
          algorithm: "hybrid",
          reason: `Hybrid: ${rec.explanation.reason} (collaborative)`,
        },
      });
    }

    // Add content-based recommendations with weight
    for (const rec of contentBased) {
      if (combinedRecommendations.has(rec.id)) {
        const existing = combinedRecommendations.get(rec.id)!;
        existing.score += rec.score * 0.4; // 40% weight for content
        existing.explanation.reason += ` + ${rec.explanation.reason} (content-based)`;
        existing.explanation.confidence = Math.max(
          existing.explanation.confidence,
          rec.explanation.confidence,
        );
      } else {
        combinedRecommendations.set(rec.id, {
          ...rec,
          score: rec.score * 0.4,
          explanation: {
            ...rec.explanation,
            algorithm: "hybrid",
            reason: `Hybrid: ${rec.explanation.reason} (content-based)`,
          },
        });
      }
    }

    return this.rankAndDiversify(
      Array.from(combinedRecommendations.values()),
      config,
    );
  }

  // Matrix factorization for latent factor modeling
  public async getMatrixFactorizationRecommendations(
    userId: string,
    config: MLRecommendationConfig,
  ): Promise<MLRecommendation[]> {
    // This is a simplified version - in production, you'd use a proper ML library
    // For now, we'll simulate the results of matrix factorization

    const userVector = await this.computeUserVector(userId);
    const recommendations: MLRecommendation[] = [];

    // Simulate latent factors discovery
    const latentFactors = this.simulateLatentFactors(userVector);

    // Get shows that match discovered latent factors
    const supabase = await this.supabase;
    const { data: shows } = await supabase
      api.shows
      .select(
        `
        id,
        name,
        slug,
        date,
        artists(id, name, imageUrl, genres),
        venues(id, name, city)
      `,
      )
      .gte("date", new Date().toISOString())
      .order("date", { ascending: true })
      .limit(200);

    if (shows) {
      for (const show of shows) {
        const artist = Array.isArray(show.artists)
          ? show.artists[0]
          : show.artists;
        const venue = Array.isArray(show.venues) ? show.venues[0] : show.venues;
        const score = this.calculateMatrixFactorizationScore(
          show,
          latentFactors,
        );

        if (score > config.minSimilarity) {
          recommendations.push({
            id: show.id,
            type: "show",
            name: show.name,
            score,
            imageUrl: artist?.imageUrl,
            slug: show.slug,
            metadata: {
              artist_name: artist?.name,
              venue_name: venue?.name,
              city: venue?.city,
              show_date: show.date,
              latent_factors: latentFactors,
            },
            explanation: {
              algorithm: "matrix_factorization",
              reason:
                "Discovered through latent factor analysis of your preferences",
              confidence: score,
              factors: [
                {
                  factor: "latent_factor_1",
                  weight: 0.4,
                  contribution: score * 0.4,
                },
                {
                  factor: "latent_factor_2",
                  weight: 0.3,
                  contribution: score * 0.3,
                },
                {
                  factor: "latent_factor_3",
                  weight: 0.3,
                  contribution: score * 0.3,
                },
              ],
            },
            diversity_score: this.calculateDiversityScore(show, userVector),
            freshness_score: this.calculateFreshnessScore(show.date),
          });
        }
      }
    }

    return this.rankAndDiversify(recommendations, config);
  }

  // Helper methods
  private computeVotingBehavior(
    votes: any[],
  ): UserVector["features"]["votingBehavior"] {
    if (votes.length === 0) {
      return { avgVoteValue: 3, voteFrequency: 0, popularityBias: 0.5 };
    }

    const avgVoteValue =
      votes.reduce((sum, vote) => sum + vote.vote_value, 0) / votes.length;
    const voteFrequency = votes.length;

    // Calculate popularity bias (preference for popular vs niche items)
    const popularityBias = 0.5; // Simplified for now

    return { avgVoteValue, voteFrequency, popularityBias };
  }

  private computeGenrePreferences(
    votes: any[],
    attendance: any[],
    follows: any[],
  ): Record<string, number> {
    const genreCounts: Record<string, number> = {};

    // Process votes
    votes.forEach((vote) => {
      const genres = vote.setlist_songs?.setlists?.shows?.artists?.genres || [];
      genres.forEach((genre: string) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + vote.vote_value;
      });
    });

    // Process attendance
    attendance.forEach((att) => {
      const genres = att.shows?.artists?.genres || [];
      genres.forEach((genre: string) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 5; // High weight for attendance
      });
    });

    // Process follows
    follows.forEach((follow) => {
      const genres = follow.artists?.genres || [];
      genres.forEach((genre: string) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 3; // Medium weight for follows
      });
    });

    // Normalize scores
    const maxScore = Math.max(...Object.values(genreCounts));
    if (maxScore > 0) {
      Object.keys(genreCounts).forEach((genre) => {
        if (genreCounts[genre] !== undefined) {
          genreCounts[genre] /= maxScore;
        }
      });
    }

    return genreCounts;
  }

  private computeArtistPreferences(
    votes: any[],
    attendance: any[],
    follows: any[],
  ): Record<string, number> {
    const artistCounts: Record<string, number> = {};

    // Process votes
    votes.forEach((vote) => {
      const artistId = vote.setlist_songs?.setlists?.shows?.artists?.id;
      if (artistId) {
        artistCounts[artistId] =
          (artistCounts[artistId] || 0) + vote.vote_value;
      }
    });

    // Process attendance
    attendance.forEach((att) => {
      const artistId = att.shows?.artists?.id;
      if (artistId) {
        artistCounts[artistId] = (artistCounts[artistId] || 0) + 5;
      }
    });

    // Process follows
    follows.forEach((follow) => {
      const artistId = follow.artists?.id;
      if (artistId) {
        artistCounts[artistId] = (artistCounts[artistId] || 0) + 3;
      }
    });

    // Normalize scores
    const maxScore = Math.max(...Object.values(artistCounts));
    if (maxScore > 0) {
      Object.keys(artistCounts).forEach((artistId) => {
        if (artistCounts[artistId] !== undefined) {
          artistCounts[artistId] /= maxScore;
        }
      });
    }

    return artistCounts;
  }

  private computeVenuePreferences(
    votes: any[],
    attendance: any[],
  ): Record<string, number> {
    const venueCounts: Record<string, number> = {};

    // Process votes
    votes.forEach((vote) => {
      const venueId = vote.setlist_songs?.setlists?.shows?.venueId;
      if (venueId) {
        venueCounts[venueId] = (venueCounts[venueId] || 0) + vote.vote_value;
      }
    });

    // Process attendance
    attendance.forEach((att) => {
      const venueId = att.shows?.venueId;
      if (venueId) {
        venueCounts[venueId] = (venueCounts[venueId] || 0) + 5;
      }
    });

    // Normalize scores
    const maxScore = Math.max(...Object.values(venueCounts));
    if (maxScore > 0) {
      Object.keys(venueCounts).forEach((venueId) => {
        if (venueCounts[venueId] !== undefined) {
          venueCounts[venueId] /= maxScore;
        }
      });
    }

    return venueCounts;
  }

  private computeTimePreferences(
    votes: any[],
    attendance: any[],
  ): Record<string, number> {
    const timeCounts: Record<string, number> = {};

    [...votes, ...attendance].forEach((item) => {
      const date = new Date(item._creationTime);
      const hour = date.getHours();
      const timeSlot = Math.floor(hour / 4); // 6 time slots per day
      timeCounts[timeSlot] = (timeCounts[timeSlot] || 0) + 1;
    });

    // Normalize scores
    const maxScore = Math.max(...Object.values(timeCounts));
    if (maxScore > 0) {
      Object.keys(timeCounts).forEach((timeSlot) => {
        if (timeCounts[timeSlot] !== undefined) {
          timeCounts[timeSlot] /= maxScore;
        }
      });
    }

    return timeCounts;
  }

  private computeLocationPreferences(
    attendance: any[],
  ): Record<string, number> {
    const locationCounts: Record<string, number> = {};

    attendance.forEach((att) => {
      const city = att.shows?.venues?.city;
      if (city) {
        locationCounts[city] = (locationCounts[city] || 0) + 1;
      }
    });

    // Normalize scores
    const maxScore = Math.max(...Object.values(locationCounts));
    if (maxScore > 0) {
      Object.keys(locationCounts).forEach((city) => {
        if (locationCounts[city] !== undefined) {
          locationCounts[city] /= maxScore;
        }
      });
    }

    return locationCounts;
  }

  private computeSeasonalPreferences(
    votes: any[],
    attendance: any[],
  ): Record<string, number> {
    const seasonCounts: Record<string, number> = {};

    [...votes, ...attendance].forEach((item) => {
      const date = new Date(item._creationTime);
      const month = date.getMonth();
      const season = Math.floor(month / 3); // 4 seasons
      seasonCounts[season] = (seasonCounts[season] || 0) + 1;
    });

    // Normalize scores
    const maxScore = Math.max(...Object.values(seasonCounts));
    if (maxScore > 0) {
      Object.keys(seasonCounts).forEach((season) => {
        if (seasonCounts[season] !== undefined) {
          seasonCounts[season] /= maxScore;
        }
      });
    }

    return seasonCounts;
  }

  private async findSimilarUsers(
    userId: string,
    minSimilarity: number,
  ): Promise<SimilarityMatrix[]> {
    // In a real implementation, you'd calculate user similarities using cosine similarity
    // For now, we'll return a mock similarity matrix
    return [
      {
        userA: userId,
        userB: "user1",
        similarity: 0.85,
        sharedItems: 15,
        lastCalculated: new Date(),
      },
      {
        userA: userId,
        userB: "user2",
        similarity: 0.72,
        sharedItems: 12,
        lastCalculated: new Date(),
      },
      {
        userA: userId,
        userB: "user3",
        similarity: 0.68,
        sharedItems: 8,
        lastCalculated: new Date(),
      },
    ].filter((sim) => sim.similarity >= minSimilarity);
  }

  private calculateCollaborativeScore(
    voteValue: number,
    userSimilarity: number,
    _userVector: UserVector,
    show: any,
  ): number {
    const baseScore = (voteValue / 5) * userSimilarity;
    const recencyBonus = this.calculateFreshnessScore(show.date) * 0.1;
    return Math.min(baseScore + recencyBonus, 1.0);
  }

  private calculateContentScore(show: any, userVector: UserVector): number {
    let score = 0;

    // Genre matching
    const showGenres = show.artists?.genres || [];
    const genreScore =
      showGenres.reduce((sum: number, genre: string) => {
        return sum + (userVector.features.genres[genre] || 0);
      }, 0) / Math.max(showGenres.length, 1);

    score += genreScore * 0.5;

    // Artist preference
    const artistScore = userVector.features.artists[show.artists?.id] || 0;
    score += artistScore * 0.3;

    // Venue preference
    const venueScore = userVector.features.venues[show.venueId] || 0;
    score += venueScore * 0.2;

    return Math.min(score, 1.0);
  }

  private calculateDiversityScore(show: any, userVector: UserVector): number {
    // Calculate how diverse this recommendation is from user's typical preferences
    const showGenres = show.artists?.genres || [];
    const topUserGenres = Object.entries(userVector.features.genres)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);

    const genreOverlap = showGenres.filter((genre: string) =>
      topUserGenres.includes(genre),
    ).length;
    return 1 - genreOverlap / Math.max(showGenres.length, 1);
  }

  private calculateFreshnessScore(date: string): number {
    const showDate = new Date(date);
    const now = new Date();
    const daysDiff =
      (showDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff < 0) return 0; // Past shows
    if (daysDiff > 365) return 0.1; // Too far in future

    // Peak freshness for shows 1-30 days away
    if (daysDiff <= 30) return 1.0;

    // Diminishing returns for shows further out
    return Math.max(0.1, 1 - (daysDiff - 30) / 335);
  }

  private simulateLatentFactors(
    _userVector: UserVector,
  ): Record<string, number> {
    // In a real implementation, this would be learned from matrix factorization
    return {
      factor1: Math.random() * 0.8 + 0.2,
      factor2: Math.random() * 0.8 + 0.2,
      factor3: Math.random() * 0.8 + 0.2,
    };
  }

  private calculateMatrixFactorizationScore(
    _show: any,
    latentFactors: Record<string, number>,
  ): number {
    // Simplified scoring based on latent factors
    const showFactors: Record<string, number> = {
      factor1: Math.random() * 0.8 + 0.2,
      factor2: Math.random() * 0.8 + 0.2,
      factor3: Math.random() * 0.8 + 0.2,
    };

    let score = 0;
    Object.keys(latentFactors).forEach((factor) => {
      const latentValue = latentFactors[factor];
      const showValue = showFactors[factor];
      if (latentValue !== undefined && showValue !== undefined) {
        score += latentValue * showValue;
      }
    });

    return Math.min(score / Object.keys(latentFactors).length, 1.0);
  }

  private rankAndDiversify(
    recommendations: MLRecommendation[],
    config: MLRecommendationConfig,
  ): MLRecommendation[] {
    // Sort by score
    recommendations.sort((a, b) => b.score - a.score);

    // Apply diversity filtering
    const diversifiedRecommendations: MLRecommendation[] = [];
    const seenArtists = new Set<string>();
    const seenVenues = new Set<string>();

    for (const rec of recommendations) {
      if (diversifiedRecommendations.length >= config.limit) break;

      // Apply diversity constraints
      const artistId = rec.metadata.artistId;
      const venueId = rec.metadata.venueId;

      const artistCount = seenArtists.has(artistId) ? 1 : 0;
      const venueCount = seenVenues.has(venueId) ? 1 : 0;

      // Allow some repetition but favor diversity
      const diversityPenalty =
        (artistCount + venueCount) * config.diversityFactor;
      const finalScore = rec.score * (1 - diversityPenalty);

      if (finalScore > 0.1) {
        // Minimum threshold
        diversifiedRecommendations.push({
          ...rec,
          score: finalScore,
        });

        if (artistId) seenArtists.add(artistId);
        if (venueId) seenVenues.add(venueId);
      }
    }

    return diversifiedRecommendations.slice(0, config.limit);
  }
}

// Export singleton instance
export const mlRecommendationEngine = new MLRecommendationEngine();

// Main recommendation function
export async function getMLRecommendations(
  userId: string,
  config: MLRecommendationConfig = {
    algorithm: "hybrid",
    limit: 20,
    minSimilarity: 0.3,
    includeExplanations: true,
    useRealTimeData: true,
    diversityFactor: 0.3,
    recencyWeight: 0.2,
  },
): Promise<MLRecommendation[]> {
  switch (config.algorithm) {
    case "collaborative":
      return mlRecommendationEngine.getCollaborativeRecommendations(
        userId,
        config,
      );
    case "content":
      return mlRecommendationEngine.getContentBasedRecommendations(
        userId,
        config,
      );
    case "matrix_factorization":
      return mlRecommendationEngine.getMatrixFactorizationRecommendations(
        userId,
        config,
      );
    default:
      return mlRecommendationEngine.getHybridRecommendations(userId, config);
  }
}

// Analytics function to track recommendation performance
export async function trackRecommendationPerformance(
  userId: string,
  recommendationId: string,
  action: "view" | "click" | "convert",
  metadata?: Record<string, any>,
): Promise<void> {
  const supabase = await createClient();

  await supabase.from("recommendation_analytics").insert({
    userId: userId,
    recommendation_id: recommendationId,
    action,
    metadata,
    _creationTime: new Date().toISOString(),
  });
}
