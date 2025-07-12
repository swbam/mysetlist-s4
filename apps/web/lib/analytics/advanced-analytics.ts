import { createClient } from '~/lib/supabase/server';
import { getCachedQuery } from '~/lib/data-pipeline/optimization-service';

// Cohort Analysis Types
export interface CohortData {
  cohortMonth: string;
  cohortSize: number;
  retentionRates: number[];
  periods: string[];
  userIds: string[];
}

export interface CohortAnalysis {
  cohorts: CohortData[];
  averageRetention: number[];
  cohortInsights: string[];
  timeRange: string;
}

// Retention Metrics Types
export interface RetentionMetrics {
  dayOneRetention: number;
  daySevenRetention: number;
  dayThirtyRetention: number;
  rollingRetention: Array<{
    day: number;
    retention: number;
  }>;
  retentionBySegment: Record<string, number>;
  churnRate: number;
  stickiness: number;
}

// Predictive Analytics Types
export interface PredictiveMetrics {
  userGrowthPrediction: Array<{
    month: string;
    predicted: number;
    confidence: number;
  }>;
  churnPrediction: Array<{
    userId: string;
    churnProbability: number;
    riskFactors: string[];
  }>;
  ltv: Array<{
    segment: string;
    averageLTV: number;
    projectedLTV: number;
  }>;
  seasonalityAnalysis: {
    trends: Array<{
      month: string;
      seasonality: number;
    }>;
    peakPeriods: string[];
    lowPeriods: string[];
  };
}

// Funnel Analysis Types
export interface FunnelStep {
  step: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
  avgTimeToNext: number;
}

export interface FunnelAnalysis {
  funnel: FunnelStep[];
  overallConversion: number;
  bottlenecks: string[];
  optimizationSuggestions: string[];
}

// RFM Analysis Types
export interface RFMSegment {
  segment: string;
  recency: number;
  frequency: number;
  monetary: number;
  userCount: number;
  description: string;
}

export interface RFMAnalysis {
  segments: RFMSegment[];
  distribution: Record<string, number>;
  recommendations: Record<string, string[]>;
}

class AdvancedAnalyticsService {
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    this.supabase = createClient();
  }

  // Cohort Analysis Implementation
  async getCohortAnalysis(
    startDate: string,
    endDate: string,
    cohortType: 'monthly' | 'weekly' = 'monthly'
  ): Promise<CohortAnalysis> {
    const cacheKey = `cohort_analysis:${startDate}:${endDate}:${cohortType}`;
    
    return getCachedQuery(
      cacheKey,
      async () => {
        const supabase = await this.supabase;
        
        // Get user registration cohorts
        const { data: users, error } = await supabase
          .from('users')
          .select('id, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        
        if (error) throw error;
        
        // Get user activity data
        const { data: activities, error: activityError } = await supabase
          .from('user_sessions')
          .select('user_id, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        
        if (activityError) throw activityError;
        
        // Build cohort data
        const cohorts = this.buildCohortData(users || [], activities || [], cohortType);
        const averageRetention = this.calculateAverageRetention(cohorts);
        const cohortInsights = this.generateCohortInsights(cohorts, averageRetention);
        
        return {
          cohorts,
          averageRetention,
          cohortInsights,
          timeRange: `${startDate} to ${endDate}`
        };
      },
      {
        key: cacheKey,
        ttl: 3600, // 1 hour
        invalidateOn: ['users', 'user_sessions'],
        compression: true,
        tags: ['analytics', 'cohort']
      }
    );
  }

  private buildCohortData(users: any[], activities: any[], cohortType: 'monthly' | 'weekly'): CohortData[] {
    const cohorts: Record<string, CohortData> = {};
    
    // Group users by cohort period
    users.forEach(user => {
      const cohortKey = this.getCohortKey(user.created_at, cohortType);
      
      if (!cohorts[cohortKey]) {
        cohorts[cohortKey] = {
          cohortMonth: cohortKey,
          cohortSize: 0,
          retentionRates: [],
          periods: [],
          userIds: []
        };
      }
      
      cohorts[cohortKey].cohortSize++;
      cohorts[cohortKey].userIds.push(user.id);
    });
    
    // Calculate retention rates for each cohort
    Object.keys(cohorts).forEach(cohortKey => {
      const cohort = cohorts[cohortKey];
      if (!cohort) return;
      
      const retentionData = this.calculateRetentionRates(
        cohort.userIds,
        cohortKey,
        activities,
        cohortType
      );
      
      cohort.retentionRates = retentionData.rates;
      cohort.periods = retentionData.periods;
    });
    
    return Object.values(cohorts);
  }

  private getCohortKey(date: string, cohortType: 'monthly' | 'weekly'): string {
    const d = new Date(date);
    if (cohortType === 'monthly') {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else {
      // Weekly cohort
      const weekNumber = Math.ceil(d.getDate() / 7);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-W${weekNumber}`;
    }
  }

  private calculateRetentionRates(
    userIds: string[],
    cohortKey: string,
    activities: any[],
    cohortType: 'monthly' | 'weekly'
  ): { rates: number[]; periods: string[] } {
    const rates: number[] = [];
    const periods: string[] = [];
    const cohortStartDate = new Date(cohortKey);
    
    // Calculate retention for up to 12 periods
    for (let i = 0; i < 12; i++) {
      const periodStart = new Date(cohortStartDate);
      const periodEnd = new Date(cohortStartDate);
      
      if (cohortType === 'monthly') {
        periodStart.setMonth(periodStart.getMonth() + i);
        periodEnd.setMonth(periodEnd.getMonth() + i + 1);
      } else {
        periodStart.setDate(periodStart.getDate() + (i * 7));
        periodEnd.setDate(periodEnd.getDate() + ((i + 1) * 7));
      }
      
      const activeUsers = activities.filter(activity => {
        const activityDate = new Date(activity.created_at);
        return userIds.includes(activity.user_id) &&
               activityDate >= periodStart &&
               activityDate < periodEnd;
      }).length;
      
      const retentionRate = (activeUsers / userIds.length) * 100;
      rates.push(retentionRate);
      periods.push(`${cohortType === 'monthly' ? 'M' : 'W'}${i}`);
    }
    
    return { rates, periods };
  }

  private calculateAverageRetention(cohorts: CohortData[]): number[] {
    if (cohorts.length === 0) return [];
    
    const maxPeriods = Math.max(...cohorts.map(c => c.retentionRates.length));
    const averageRetention: number[] = [];
    
    for (let i = 0; i < maxPeriods; i++) {
      const validCohorts = cohorts.filter(c => c.retentionRates[i] !== undefined);
      if (validCohorts.length > 0) {
        const sum = validCohorts.reduce((acc, c) => acc + (c.retentionRates[i] ?? 0), 0);
        averageRetention.push(sum / validCohorts.length);
      }
    }
    
    return averageRetention;
  }

  private generateCohortInsights(cohorts: CohortData[], averageRetention: number[]): string[] {
    const insights: string[] = [];
    
    // Best performing cohort
    const bestCohort = cohorts.length > 0 ? cohorts.reduce((best, current) => {
      if (!best || !current) return current || best;
      const bestAvg = best.retentionRates.reduce((sum, rate) => sum + rate, 0) / best.retentionRates.length;
      const currentAvg = current.retentionRates.reduce((sum, rate) => sum + rate, 0) / current.retentionRates.length;
      return currentAvg > bestAvg ? current : best;
    }, cohorts[0]) : null;
    
    if (bestCohort) {
      insights.push(`Best performing cohort: ${bestCohort.cohortMonth} with ${bestCohort.cohortSize} users`);
    }
    
    // Retention trends
    if (averageRetention.length >= 2) {
      const trend = (averageRetention[1] ?? 0) - (averageRetention[0] ?? 0);
      insights.push(
        trend > 0 
          ? `Retention is improving: ${trend.toFixed(1)}% increase from M0 to M1`
          : `Retention is declining: ${Math.abs(trend).toFixed(1)}% decrease from M0 to M1`
      );
    }
    
    // Long-term retention
    if (averageRetention.length >= 6) {
      const sixMonthRetention = averageRetention[5];
      if (sixMonthRetention !== undefined) {
        insights.push(`Six-month retention rate: ${sixMonthRetention.toFixed(1)}%`);
      }
    }
    
    return insights;
  }

  // Retention Metrics Implementation
  async getRetentionMetrics(startDate: string, endDate: string): Promise<RetentionMetrics> {
    const cacheKey = `retention_metrics:${startDate}:${endDate}`;
    
    return getCachedQuery(
      cacheKey,
      async () => {
        const supabase = await this.supabase;
        
        // Get user registration and activity data
        const { data: users, error } = await supabase
          .from('users')
          .select('id, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        
        if (error) throw error;
        
        const { data: sessions, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        
        if (sessionError) throw sessionError;
        
        // Calculate retention metrics
        const dayOneRetention = this.calculateDayNRetention(users || [], sessions || [], 1);
        const daySevenRetention = this.calculateDayNRetention(users || [], sessions || [], 7);
        const dayThirtyRetention = this.calculateDayNRetention(users || [], sessions || [], 30);
        
        const rollingRetention = this.calculateRollingRetention(users || [], sessions || []);
        const retentionBySegment = await this.calculateRetentionBySegment(users || [], sessions || []);
        const churnRate = this.calculateChurnRate(users || [], sessions || []);
        const stickiness = this.calculateStickiness(sessions || []);
        
        return {
          dayOneRetention,
          daySevenRetention,
          dayThirtyRetention,
          rollingRetention,
          retentionBySegment,
          churnRate,
          stickiness
        };
      },
      {
        key: cacheKey,
        ttl: 1800, // 30 minutes
        invalidateOn: ['users', 'user_sessions'],
        compression: true,
        tags: ['analytics', 'retention']
      }
    );
  }

  private calculateDayNRetention(users: any[], sessions: any[], dayN: number): number {
    let retainedUsers = 0;
    
    users.forEach(user => {
      const signupDate = new Date(user.created_at);
      const dayNDate = new Date(signupDate);
      dayNDate.setDate(dayNDate.getDate() + dayN);
      
      // Check if user was active on day N
      const wasActive = sessions.some(session => {
        const sessionDate = new Date(session.created_at);
        return session.user_id === user.id &&
               sessionDate >= dayNDate &&
               sessionDate < new Date(dayNDate.getTime() + 24 * 60 * 60 * 1000);
      });
      
      if (wasActive) retainedUsers++;
    });
    
    return users.length > 0 ? (retainedUsers / users.length) * 100 : 0;
  }

  private calculateRollingRetention(users: any[], sessions: any[]): Array<{ day: number; retention: number }> {
    const rollingRetention: Array<{ day: number; retention: number }> = [];
    
    for (let day = 1; day <= 30; day++) {
      const retention = this.calculateDayNRetention(users, sessions, day);
      rollingRetention.push({ day, retention });
    }
    
    return rollingRetention;
  }

  private async calculateRetentionBySegment(users: any[], sessions: any[]): Promise<Record<string, number>> {
    const segments = {
      'New Users': users.filter(u => {
        const signupDate = new Date(u.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return signupDate >= thirtyDaysAgo;
      }),
      'Returning Users': users.filter(u => {
        const signupDate = new Date(u.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return signupDate < thirtyDaysAgo;
      })
    };
    
    const retentionBySegment: Record<string, number> = {};
    
    Object.keys(segments).forEach(segment => {
      const segmentUsers = (segments as any)[segment];
      retentionBySegment[segment] = this.calculateDayNRetention(segmentUsers, sessions, 7);
    });
    
    return retentionBySegment;
  }

  private calculateChurnRate(users: any[], sessions: any[]): number {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeUsers = new Set(
      sessions
        .filter(session => new Date(session.created_at) >= thirtyDaysAgo)
        .map(session => session.user_id)
    );
    
    const totalUsers = users.length;
    const churnedUsers = totalUsers - activeUsers.size;
    
    return totalUsers > 0 ? (churnedUsers / totalUsers) * 100 : 0;
  }

  private calculateStickiness(sessions: any[]): number {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSessions = sessions.filter(
      session => new Date(session.created_at) >= thirtyDaysAgo
    );
    
    // Calculate daily active users
    const dailyActiveUsers = new Map<string, Set<string>>();
    
    recentSessions.forEach(session => {
      const day = new Date(session.created_at).toISOString().split('T')[0];
      if (day && !dailyActiveUsers.has(day)) {
        dailyActiveUsers.set(day, new Set());
      }
      if (day) {
        dailyActiveUsers.get(day)!.add(session.user_id);
      }
    });
    
    // Calculate average DAU
    const dau = Array.from(dailyActiveUsers.values())
      .reduce((sum, users) => sum + users.size, 0) / dailyActiveUsers.size;
    
    // Calculate MAU
    const mau = new Set(recentSessions.map(s => s.user_id)).size;
    
    return mau > 0 ? (dau / mau) * 100 : 0;
  }

  // Predictive Analytics Implementation
  async getPredictiveAnalytics(startDate: string, endDate: string): Promise<PredictiveMetrics> {
    const cacheKey = `predictive_analytics:${startDate}:${endDate}`;
    
    return getCachedQuery(
      cacheKey,
      async () => {
        const supabase = await this.supabase;
        
        // Get historical data
        const { data: users, error } = await supabase
          .from('users')
          .select('id, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        
        if (error) throw error;
        
        const { data: sessions, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        
        if (sessionError) throw sessionError;
        
        // Generate predictions
        const userGrowthPrediction = this.predictUserGrowth(users || []);
        const churnPrediction = this.predictChurn(users || [], sessions || []);
        const ltv = this.calculateLTV(users || [], sessions || []);
        const seasonalityAnalysis = this.analyzeSeasonality(users || []);
        
        return {
          userGrowthPrediction,
          churnPrediction,
          ltv,
          seasonalityAnalysis
        };
      },
      {
        key: cacheKey,
        ttl: 7200, // 2 hours
        invalidateOn: ['users', 'user_sessions'],
        compression: true,
        tags: ['analytics', 'predictive']
      }
    );
  }

  private predictUserGrowth(users: any[]): Array<{ month: string; predicted: number; confidence: number }> {
    // Simple linear regression for user growth prediction
    const monthlyData = this.groupUsersByMonth(users);
    const months = Object.keys(monthlyData).sort();
    
    if (months.length < 3) {
      return [];
    }
    
    // Calculate growth rate
    const growthRates = [];
    for (let i = 1; i < months.length; i++) {
      const prevMonthKey = months[i - 1];
      const currentMonthKey = months[i];
      if (prevMonthKey && currentMonthKey) {
        const prevMonth = monthlyData[prevMonthKey];
        const currentMonth = monthlyData[currentMonthKey];
        if (prevMonth !== undefined && currentMonth !== undefined) {
          const rate = (currentMonth - prevMonth) / prevMonth;
          growthRates.push(rate);
        }
      }
    }
    
    const avgGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    const lastMonthKey = months[months.length - 1];
    const lastMonthUsers = lastMonthKey ? (monthlyData[lastMonthKey] ?? 0) : 0;
    
    // Predict next 6 months
    const predictions = [];
    for (let i = 1; i <= 6; i++) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + i);
      const monthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
      
      const predicted = Math.round(lastMonthUsers * Math.pow(1 + avgGrowthRate, i));
      const confidence = Math.max(0.5, 1 - (i * 0.1)); // Confidence decreases with time
      
      predictions.push({
        month: monthKey,
        predicted,
        confidence
      });
    }
    
    return predictions;
  }

  private predictChurn(users: any[], sessions: any[]): Array<{ userId: string; churnProbability: number; riskFactors: string[] }> {
    const churnPredictions: Array<{ userId: string; churnProbability: number; riskFactors: string[] }> = [];
    
    users.forEach(user => {
      const userSessions = sessions.filter(s => s.user_id === user.id);
      const riskFactors: string[] = [];
      let churnProbability = 0;
      
      // Factor 1: Days since last activity
      if (userSessions.length > 0) {
        const lastActivity = new Date(Math.max(...userSessions.map(s => new Date(s.created_at).getTime())));
        const daysSinceLastActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastActivity > 30) {
          riskFactors.push('Inactive for 30+ days');
          churnProbability += 0.4;
        } else if (daysSinceLastActivity > 14) {
          riskFactors.push('Inactive for 14+ days');
          churnProbability += 0.2;
        }
      }
      
      // Factor 2: Session frequency
      const sessionFrequency = userSessions.length;
      if (sessionFrequency < 5) {
        riskFactors.push('Low session frequency');
        churnProbability += 0.3;
      }
      
      // Factor 3: Account age
      const accountAge = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));
      if (accountAge < 7) {
        riskFactors.push('New user (< 7 days)');
        churnProbability += 0.2;
      }
      
      // Cap probability at 1.0
      churnProbability = Math.min(1.0, churnProbability);
      
      // Only include users with significant churn risk
      if (churnProbability > 0.3) {
        churnPredictions.push({
          userId: user.id,
          churnProbability,
          riskFactors
        });
      }
    });
    
    return churnPredictions.sort((a, b) => b.churnProbability - a.churnProbability);
  }

  private calculateLTV(users: any[], sessions: any[]): Array<{ segment: string; averageLTV: number; projectedLTV: number }> {
    // Simplified LTV calculation
    const segments = {
      'High Activity': users.filter(u => {
        const userSessions = sessions.filter(s => s.user_id === u.id);
        return userSessions.length > 10;
      }),
      'Medium Activity': users.filter(u => {
        const userSessions = sessions.filter(s => s.user_id === u.id);
        return userSessions.length >= 5 && userSessions.length <= 10;
      }),
      'Low Activity': users.filter(u => {
        const userSessions = sessions.filter(s => s.user_id === u.id);
        return userSessions.length < 5;
      })
    };
    
    const ltv = Object.keys(segments).map(segment => {
      const segmentUsers = (segments as any)[segment];
      const avgSessionsPerUser = segmentUsers.length > 0 
        ? sessions.filter(s => segmentUsers.some((u: any) => u.id === s.user_id)).length / segmentUsers.length 
        : 0;
      
      // Simplified LTV calculation (sessions * value per session)
      const averageLTV = avgSessionsPerUser * 2.5; // Assume $2.5 value per session
      const projectedLTV = averageLTV * 1.2; // Assume 20% growth
      
      return {
        segment,
        averageLTV,
        projectedLTV
      };
    });
    
    return ltv;
  }

  private analyzeSeasonality(users: any[]): {
    trends: Array<{ month: string; seasonality: number }>;
    peakPeriods: string[];
    lowPeriods: string[];
  } {
    const monthlyData = this.groupUsersByMonth(users);
    const months = Object.keys(monthlyData).sort();
    
    if (months.length < 12) {
      return {
        trends: [],
        peakPeriods: [],
        lowPeriods: []
      };
    }
    
    // Calculate seasonality index
    const total = Object.values(monthlyData).reduce((sum, count) => sum + count, 0);
    const average = total / months.length;
    
    const trends = months.map(month => ({
      month,
      seasonality: ((monthlyData[month] ?? 0) / average) * 100
    }));
    
    // Identify peak and low periods
    const peakPeriods = trends
      .filter(t => t.seasonality > 120)
      .map(t => t.month);
    
    const lowPeriods = trends
      .filter(t => t.seasonality < 80)
      .map(t => t.month);
    
    return {
      trends,
      peakPeriods,
      lowPeriods
    };
  }

  private groupUsersByMonth(users: any[]): Record<string, number> {
    const monthlyData: Record<string, number> = {};
    
    users.forEach(user => {
      const date = new Date(user.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });
    
    return monthlyData;
  }

  // Funnel Analysis Implementation
  async getFunnelAnalysis(funnelSteps: string[], startDate: string, endDate: string): Promise<FunnelAnalysis> {
    const cacheKey = `funnel_analysis:${funnelSteps.join(':')}:${startDate}:${endDate}`;
    
    return getCachedQuery(
      cacheKey,
      async () => {
        const supabase = await this.supabase;
        
        const funnel: FunnelStep[] = [];
        let previousUsers = 0;
        
        for (let i = 0; i < funnelSteps.length; i++) {
          const step = funnelSteps[i];
          if (!step) continue;
          
          // Get users for this step (simplified example)
          const { data: events, error } = await supabase
            .from('events')
            .select('user_id, created_at')
            .eq('event_type', step)
            .gte('created_at', startDate)
            .lte('created_at', endDate);
          
          if (error) throw error;
          
          const uniqueUsers = new Set(events?.map(e => e.user_id) || []).size;
          const conversionRate = i === 0 ? 100 : previousUsers > 0 ? (uniqueUsers / previousUsers) * 100 : 0;
          const dropoffRate = 100 - conversionRate;
          
          funnel.push({
            step,
            users: uniqueUsers,
            conversionRate,
            dropoffRate,
            avgTimeToNext: 0 // Would need to calculate based on event timestamps
          });
          
          previousUsers = uniqueUsers;
        }
        
        const firstStep = funnel[0];
        const lastStep = funnel[funnel.length - 1];
        const overallConversion = funnel.length > 0 && firstStep && lastStep ? 
          (lastStep.users / firstStep.users) * 100 : 0;
        
        const bottlenecks = funnel
          .filter(step => step.dropoffRate > 50)
          .map(step => step.step);
        
        const optimizationSuggestions = this.generateOptimizationSuggestions(funnel);
        
        return {
          funnel,
          overallConversion,
          bottlenecks,
          optimizationSuggestions
        };
      },
      {
        key: cacheKey,
        ttl: 1800, // 30 minutes
        invalidateOn: ['events'],
        compression: true,
        tags: ['analytics', 'funnel']
      }
    );
  }

  private generateOptimizationSuggestions(funnel: FunnelStep[]): string[] {
    const suggestions: string[] = [];
    
    funnel.forEach((step, _index) => {
      if (step.dropoffRate > 50) {
        suggestions.push(`Optimize ${step.step} - high drop-off rate of ${step.dropoffRate.toFixed(1)}%`);
      }
      
      if (step.avgTimeToNext > 300) { // 5 minutes
        suggestions.push(`Reduce friction in ${step.step} - users taking too long to proceed`);
      }
    });
    
    return suggestions;
  }

  // RFM Analysis Implementation
  async getRFMAnalysis(startDate: string, endDate: string): Promise<RFMAnalysis> {
    const cacheKey = `rfm_analysis:${startDate}:${endDate}`;
    
    return getCachedQuery(
      cacheKey,
      async () => {
        const supabase = await this.supabase;
        
        // Get user activity data
        const { data: users, error } = await supabase
          .from('users')
          .select('id, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        
        if (error) throw error;
        
        const { data: sessions, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        
        if (sessionError) throw sessionError;
        
        // Calculate RFM scores for each user
        const rfmData = this.calculateRFMScores(users || [], sessions || []);
        
        // Segment users based on RFM scores
        const segments = this.createRFMSegments(rfmData);
        
        // Calculate distribution
        const distribution = this.calculateSegmentDistribution(segments);
        
        // Generate recommendations
        const recommendations = this.generateRFMRecommendations(segments);
        
        return {
          segments,
          distribution,
          recommendations
        };
      },
      {
        key: cacheKey,
        ttl: 3600, // 1 hour
        invalidateOn: ['users', 'user_sessions'],
        compression: true,
        tags: ['analytics', 'rfm']
      }
    );
  }

  private calculateRFMScores(users: any[], sessions: any[]): Array<{
    userId: string;
    recency: number;
    frequency: number;
    monetary: number;
  }> {
    return users.map(user => {
      const userSessions = sessions.filter(s => s.user_id === user.id);
      
      // Recency: Days since last activity
      const lastActivity = userSessions.length > 0 
        ? Math.max(...userSessions.map(s => new Date(s.created_at).getTime()))
        : new Date(user.created_at).getTime();
      
      const recency = Math.floor((Date.now() - lastActivity) / (1000 * 60 * 60 * 24));
      
      // Frequency: Number of sessions
      const frequency = userSessions.length;
      
      // Monetary: Simplified value based on session count
      const monetary = frequency * 2.5;
      
      return {
        userId: user.id,
        recency,
        frequency,
        monetary
      };
    });
  }

  private createRFMSegments(rfmData: any[]): RFMSegment[] {
    const segments = [
      {
        segment: 'Champions',
        recency: 0,
        frequency: 0,
        monetary: 0,
        userCount: 0,
        description: 'High value, recent, frequent customers'
      },
      {
        segment: 'Loyal Customers',
        recency: 0,
        frequency: 0,
        monetary: 0,
        userCount: 0,
        description: 'Regular customers with good value'
      },
      {
        segment: 'Potential Loyalists',
        recency: 0,
        frequency: 0,
        monetary: 0,
        userCount: 0,
        description: 'Recent customers with potential'
      },
      {
        segment: 'At Risk',
        recency: 0,
        frequency: 0,
        monetary: 0,
        userCount: 0,
        description: 'Previously good customers who are becoming inactive'
      },
      {
        segment: 'Hibernating',
        recency: 0,
        frequency: 0,
        monetary: 0,
        userCount: 0,
        description: 'Inactive customers who may be lost'
      }
    ];
    
    // Segment users based on RFM scores
    rfmData.forEach(user => {
      if (user.recency <= 7 && user.frequency >= 10 && user.monetary >= 25 && segments[0]) {
        segments[0].userCount++;
      } else if (user.recency <= 14 && user.frequency >= 5 && user.monetary >= 12.5 && segments[1]) {
        segments[1].userCount++;
      } else if (user.recency <= 7 && user.frequency >= 2 && segments[2]) {
        segments[2].userCount++;
      } else if (user.recency > 30 && user.frequency >= 3 && segments[3]) {
        segments[3].userCount++;
      } else if (segments[4]) {
        segments[4].userCount++;
      }
    });
    
    return segments;
  }

  private calculateSegmentDistribution(segments: RFMSegment[]): Record<string, number> {
    const total = segments.reduce((sum, segment) => sum + segment.userCount, 0);
    const distribution: Record<string, number> = {};
    
    segments.forEach(segment => {
      distribution[segment.segment] = total > 0 ? (segment.userCount / total) * 100 : 0;
    });
    
    return distribution;
  }

  private generateRFMRecommendations(_segments: RFMSegment[]): Record<string, string[]> {
    return {
      'Champions': [
        'Reward them with exclusive offers',
        'Ask for reviews and referrals',
        'Create VIP program'
      ],
      'Loyal Customers': [
        'Upsell higher value products',
        'Ask for feedback',
        'Engage with loyalty program'
      ],
      'Potential Loyalists': [
        'Offer membership or loyalty program',
        'Personalized recommendations',
        'Special offers on related products'
      ],
      'At Risk': [
        'Send win-back campaigns',
        'Provide support and assistance',
        'Offer limited-time promotions'
      ],
      'Hibernating': [
        'Recreate brand awareness',
        'Offer deep discounts',
        'Survey to understand issues'
      ]
    };
  }
}

// Export singleton instance
export const advancedAnalyticsService = new AdvancedAnalyticsService();

// Utility functions
export async function getCohortAnalysis(
  startDate: string,
  endDate: string,
  cohortType: 'monthly' | 'weekly' = 'monthly'
): Promise<CohortAnalysis> {
  return advancedAnalyticsService.getCohortAnalysis(startDate, endDate, cohortType);
}

export async function getRetentionMetrics(
  startDate: string,
  endDate: string
): Promise<RetentionMetrics> {
  return advancedAnalyticsService.getRetentionMetrics(startDate, endDate);
}

export async function getPredictiveAnalytics(
  startDate: string,
  endDate: string
): Promise<PredictiveMetrics> {
  return advancedAnalyticsService.getPredictiveAnalytics(startDate, endDate);
}

export async function getFunnelAnalysis(
  funnelSteps: string[],
  startDate: string,
  endDate: string
): Promise<FunnelAnalysis> {
  return advancedAnalyticsService.getFunnelAnalysis(funnelSteps, startDate, endDate);
}

export async function getRFMAnalysis(
  startDate: string,
  endDate: string
): Promise<RFMAnalysis> {
  return advancedAnalyticsService.getRFMAnalysis(startDate, endDate);
}