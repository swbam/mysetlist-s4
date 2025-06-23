import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';
import { Badge } from '@repo/design-system/components/ui/badge';
import ReportItem from './components/report-item';
import { 
  Flag, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';

export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const supabase = await createClient();
  const { locale } = await params;
  
  // Fetch reports with related data
  const { data: reports } = await supabase
    .from('reports')
    .select(`
      *,
      reporter:users!reports_reporter_id_fkey(display_name, email, avatar_url),
      reported_user:users!reports_reported_user_id_fkey(display_name, email, avatar_url),
      resolved_by_user:users!reports_resolved_by_fkey(display_name, email)
    `)
    .order('created_at', { ascending: false });
  
  const pendingReports = reports?.filter(r => r.status === 'pending') ?? [];
  const resolvedReports = reports?.filter(r => r.status !== 'pending') ?? [];
  
  // Get report statistics
  const reportsByReason = reports?.reduce((acc, report) => {
    acc[report.reason] = (acc[report.reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};
  
  const reportsByType = reports?.reduce((acc, report) => {
    acc[report.content_type] = (acc[report.content_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">User Reports</h1>
        <p className="text-muted-foreground mt-2">
          Review and resolve user-submitted reports
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReports.length}</div>
            <p className="text-xs text-muted-foreground">awaiting review</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {resolvedReports.filter(r => 
                r.resolved_at && new Date(r.resolved_at).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">reports resolved</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Common</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.entries(reportsByReason).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">report reason</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">all time</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Report Categories */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reports by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(reportsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{type}</span>
                  <Badge variant="secondary">{String(count)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reports by Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(reportsByReason).map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{reason.replace('_', ' ')}</span>
                  <Badge variant="secondary">{String(count)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Report Queue</CardTitle>
          <CardDescription>
            Review user reports and take appropriate action
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">
                Pending ({pendingReports.length})
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved ({resolvedReports.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="space-y-4 mt-6">
              {pendingReports.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">No pending reports</p>
                  <p className="text-muted-foreground">All reports have been reviewed.</p>
                </div>
              ) : (
                pendingReports.map((report) => (
                  <ReportItem
                    key={report.id}
                    report={report}
                    locale={locale}
                  />
                ))
              )}
            </TabsContent>
            
            <TabsContent value="resolved" className="space-y-4 mt-6">
              {resolvedReports.length === 0 ? (
                <div className="text-center py-12">
                  <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No resolved reports yet</p>
                </div>
              ) : (
                resolvedReports.map((report) => (
                  <ReportItem
                    key={report.id}
                    report={report}
                    locale={locale}
                    isResolved
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}