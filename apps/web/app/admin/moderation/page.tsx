import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { 
  FileText, 
  Image, 
  MessageSquare, 
  Lightbulb,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import ModerationItem from './components/moderation-item';

// Force dynamic rendering due to user-specific data fetching
export const dynamic = 'force-dynamic';

export default async function ModerationPage({ params }: { params: Promise<{ locale: string }> }) {
  const supabase = await createClient();
  const { locale } = await params;
  
  // Fetch pending content for moderation
  const [
    { data: pendingSetlists },
    { data: pendingReviews },
    { data: pendingPhotos },
    { data: pendingTips }
  ] = await Promise.all([
    supabase
      .from('setlists')
      .select(`
        *,
        show:shows(name, date, venue:venues(name)),
        artist:artists(name),
        created_by:users(display_name, email)
      `)
      .eq('moderation_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('venue_reviews')
      .select(`
        *,
        venue:venues(name),
        user:users(display_name, email, avatar_url)
      `)
      .eq('moderation_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('venue_photos')
      .select(`
        *,
        venue:venues(name),
        user:users(display_name, email)
      `)
      .eq('moderation_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('venue_insider_tips')
      .select(`
        *,
        venue:venues(name),
        user:users(display_name, email)
      `)
      .eq('moderation_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)
  ]);
  
  const totalPending = 
    (pendingSetlists?.length ?? 0) + 
    (pendingReviews?.length ?? 0) + 
    (pendingPhotos?.length ?? 0) + 
    (pendingTips?.length ?? 0);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Content Moderation</h1>
        <p className="text-muted-foreground mt-2">
          Review and moderate user-generated content
        </p>
      </div>
      
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPending}</div>
            <p className="text-xs text-muted-foreground">items awaiting review</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Setlists</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingSetlists?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">pending approval</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReviews?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">awaiting review</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Photos</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPhotos?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">to moderate</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Moderation Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Moderation Queue</CardTitle>
          <CardDescription>
            Review and approve or reject user-generated content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                All ({totalPending})
              </TabsTrigger>
              <TabsTrigger value="setlists">
                Setlists ({pendingSetlists?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="reviews">
                Reviews ({pendingReviews?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="photos">
                Photos ({pendingPhotos?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="tips">
                Tips ({pendingTips?.length ?? 0})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4 mt-6">
              {totalPending === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">All caught up!</p>
                  <p className="text-muted-foreground">No pending items to moderate.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingSetlists?.map((setlist) => (
                    <ModerationItem
                      key={setlist.id}
                      type="setlist"
                      item={setlist}
                      locale={locale}
                    />
                  ))}
                  {pendingReviews?.map((review) => (
                    <ModerationItem
                      key={review.id}
                      type="review"
                      item={review}
                      locale={locale}
                    />
                  ))}
                  {pendingPhotos?.map((photo) => (
                    <ModerationItem
                      key={photo.id}
                      type="photo"
                      item={photo}
                      locale={locale}
                    />
                  ))}
                  {pendingTips?.map((tip) => (
                    <ModerationItem
                      key={tip.id}
                      type="tip"
                      item={tip}
                      locale={locale}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="setlists" className="space-y-4 mt-6">
              {pendingSetlists?.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending setlists</p>
                </div>
              ) : (
                pendingSetlists?.map((setlist) => (
                  <ModerationItem
                    key={setlist.id}
                    type="setlist"
                    item={setlist}
                    locale={locale}
                  />
                ))
              )}
            </TabsContent>
            
            <TabsContent value="reviews" className="space-y-4 mt-6">
              {pendingReviews?.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending reviews</p>
                </div>
              ) : (
                pendingReviews?.map((review) => (
                  <ModerationItem
                    key={review.id}
                    type="review"
                    item={review}
                    locale={locale}
                  />
                ))
              )}
            </TabsContent>
            
            <TabsContent value="photos" className="space-y-4 mt-6">
              {pendingPhotos?.length === 0 ? (
                <div className="text-center py-12">
                  <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending photos</p>
                </div>
              ) : (
                pendingPhotos?.map((photo) => (
                  <ModerationItem
                    key={photo.id}
                    type="photo"
                    item={photo}
                    locale={locale}
                  />
                ))
              )}
            </TabsContent>
            
            <TabsContent value="tips" className="space-y-4 mt-6">
              {pendingTips?.length === 0 ? (
                <div className="text-center py-12">
                  <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending tips</p>
                </div>
              ) : (
                pendingTips?.map((tip) => (
                  <ModerationItem
                    key={tip.id}
                    type="tip"
                    item={tip}
                    locale={locale}
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