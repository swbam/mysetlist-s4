'use client';

import { useState } from 'react';
import { 
  BarChart3, 
  Trophy, 
  History, 
  TrendingUp,
  Users,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';
import { Button } from '@repo/design-system/components/ui/button';
import { Switch } from '@repo/design-system/components/ui/switch';
import { Label } from '@repo/design-system/components/ui/label';
import { Badge } from '@repo/design-system/components/ui/badge';
import { cn } from '@repo/design-system/lib/utils';
import { VoteAnalyticsDashboard } from './vote-analytics-dashboard';
import { VoteStatistics } from './vote-statistics';
import { VoteLeaderboard } from './vote-leaderboard';
import { VoteHistory } from './vote-history';
import { VoteSummary } from './vote-summary';

interface ComprehensiveVotingDashboardProps {
  showId: string;
  setlistId?: string;
  userId?: string;
  userRole?: 'admin' | 'user';
  className?: string;
  compact?: boolean;
}

export function ComprehensiveVotingDashboard({
  showId,
  setlistId,
  userId,
  userRole = 'user',
  className,
  compact = false
}: ComprehensiveVotingDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [showPersonalData, setShowPersonalData] = useState(true);
  
  const isAdmin = userRole === 'admin';
  const hasUserId = Boolean(userId);

  // Simplified compact view for embedding in other components
  if (compact) {
    return (
      <div className={cn("space-y-4", className)}>
        <VoteSummary
          totalVotes={0}
          totalUpvotes={0}
          totalDownvotes={0}
          className="h-auto"
        />
        {isAdmin && (
          <VoteAnalyticsDashboard 
            showId={showId}
            className="h-auto"
          />
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Voting Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive voting analytics and user engagement
          </p>
        </div>
        
        {/* Dashboard Controls */}
        <div className="flex items-center gap-4">
          {hasUserId && (
            <div className="flex items-center space-x-2">
              <Switch
                id="personal-data"
                checked={showPersonalData}
                onCheckedChange={setShowPersonalData}
              />
              <Label htmlFor="personal-data" className="text-sm">
                {showPersonalData ? (
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Show Personal
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <EyeOff className="h-3 w-3" />
                    Hide Personal
                  </span>
                )}
              </Label>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Switch
              id="realtime"
              checked={realtimeEnabled}
              onCheckedChange={setRealtimeEnabled}
            />
            <Label htmlFor="realtime" className="text-sm">
              Real-time Updates
            </Label>
          </div>
          
          {isAdmin && (
            <Badge variant="outline" className="gap-1">
              <Settings className="h-3 w-3" />
              Admin View
            </Badge>
          )}
        </div>
      </div>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            Leaderboard
          </TabsTrigger>
          {hasUserId && showPersonalData && (
            <TabsTrigger value="history" className="flex items-center gap-1">
              <History className="h-3 w-3" />
              My Votes
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="analytics" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Analytics
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Quick Stats */}
            <div className="lg:col-span-2">
              <VoteSummary
                totalVotes={0}
                totalUpvotes={0}
                totalDownvotes={0}
              />
            </div>
            
            {/* Mini Leaderboard */}
            <div>
              <VoteLeaderboard
                showId={showId}
                setlistId={setlistId}
                className="h-fit"
              />
            </div>
          </div>
          
          {/* Recent Activity Preview */}
          {hasUserId && showPersonalData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Recent Activity
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setActiveTab('history')}
                  >
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VoteHistory
                  userId={userId}
                  showId={showId}
                  className="max-h-64 overflow-hidden"
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-6">
          <VoteStatistics
            showId={showId}
            setlistId={setlistId}
            realtime={realtimeEnabled}
          />
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          <VoteLeaderboard
            showId={showId}
            setlistId={setlistId}
          />
        </TabsContent>

        {/* Personal History Tab */}
        {hasUserId && showPersonalData && (
          <TabsContent value="history" className="space-y-6">
            <VoteHistory
              userId={userId}
              showId={showId}
            />
          </TabsContent>
        )}

        {/* Admin Analytics Tab */}
        {isAdmin && (
          <TabsContent value="analytics" className="space-y-6">
            <VoteAnalyticsDashboard
              showId={showId}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Real-time Status Indicator */}
      {realtimeEnabled && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="p-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-muted-foreground">Live updates enabled</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}