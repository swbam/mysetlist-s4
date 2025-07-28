import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  CheckCircle,
  Clock,
  FileText,
  Image,
  Lightbulb,
  MessageSquare,
} from "lucide-react";
import { createClient } from "~/lib/supabase/server";
import ModerationItem from "./components/moderation-item";

// Force dynamic rendering due to user-specific data fetching
export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  const supabase = await createClient();

  // Fetch pending content for moderation
  const [
    { data: pendingSetlists },
    { data: pendingReviews },
    { data: pendingPhotos },
    { data: pendingTips },
  ] = await Promise.all([
    supabase
      .from("setlists")
      .select(
        `
        *,
        show:shows(name, date, venue:venues(name)),
        artist:artists(name),
        created_by:users(display_name, email)
      `,
      )
      .eq("moderation_status", "pending")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("venue_reviews")
      .select(
        `
        *,
        venue:venues(name),
        user:users(display_name, email, avatar_url)
      `,
      )
      .eq("moderation_status", "pending")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("venue_photos")
      .select(
        `
        *,
        venue:venues(name),
        user:users(display_name, email)
      `,
      )
      .eq("moderation_status", "pending")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("venue_insider_tips")
      .select(
        `
        *,
        venue:venues(name),
        user:users(display_name, email)
      `,
      )
      .eq("moderation_status", "pending")
      .order("created_at", { ascending: false })
      .limit(20),
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
        <h1 className="font-bold text-3xl">Content Moderation</h1>
        <p className="mt-2 text-muted-foreground">
          Review and moderate user-generated content
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{totalPending}</div>
            <p className="text-muted-foreground text-xs">
              items awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Setlists</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {pendingSetlists?.length ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">pending approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {pendingReviews?.length ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Photos</CardTitle>
            <Image
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {pendingPhotos?.length ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">to moderate</p>
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
              <TabsTrigger value="all">All ({totalPending})</TabsTrigger>
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

            <TabsContent value="all" className="mt-6 space-y-4">
              {totalPending === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
                  <p className="font-medium text-lg">All caught up!</p>
                  <p className="text-muted-foreground">
                    No pending items to moderate.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingSetlists?.map((setlist) => (
                    <ModerationItem
                      key={setlist.id}
                      type="setlist"
                      item={setlist}
                    />
                  ))}
                  {pendingReviews?.map((review) => (
                    <ModerationItem
                      key={review.id}
                      type="review"
                      item={review}
                    />
                  ))}
                  {pendingPhotos?.map((photo) => (
                    <ModerationItem key={photo.id} type="photo" item={photo} />
                  ))}
                  {pendingTips?.map((tip) => (
                    <ModerationItem key={tip.id} type="tip" item={tip} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="setlists" className="mt-6 space-y-4">
              {pendingSetlists?.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No pending setlists</p>
                </div>
              ) : (
                pendingSetlists?.map((setlist) => (
                  <ModerationItem
                    key={setlist.id}
                    type="setlist"
                    item={setlist}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="reviews" className="mt-6 space-y-4">
              {pendingReviews?.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No pending reviews</p>
                </div>
              ) : (
                pendingReviews?.map((review) => (
                  <ModerationItem key={review.id} type="review" item={review} />
                ))
              )}
            </TabsContent>

            <TabsContent value="photos" className="mt-6 space-y-4">
              {pendingPhotos?.length === 0 ? (
                <div className="py-12 text-center">
                  <Image
                    className="mx-auto mb-4 h-12 w-12 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="text-muted-foreground">No pending photos</p>
                </div>
              ) : (
                pendingPhotos?.map((photo) => (
                  <ModerationItem key={photo.id} type="photo" item={photo} />
                ))
              )}
            </TabsContent>

            <TabsContent value="tips" className="mt-6 space-y-4">
              {pendingTips?.length === 0 ? (
                <div className="py-12 text-center">
                  <Lightbulb className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No pending tips</p>
                </div>
              ) : (
                pendingTips?.map((tip) => (
                  <ModerationItem key={tip.id} type="tip" item={tip} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
