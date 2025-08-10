"use client";

import { toast } from "@repo/design-system/components/ui/use-toast";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle,
  FileText,
  Flag,
  Image as ImageIcon,
  Lightbulb,
  MapPin,
  MessageSquare,
  Star,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from "~/components/ui-exports";
import { createClient } from "~/lib/supabase/client";

interface ModerationItemProps {
  type: "setlist" | "review" | "photo" | "tip";
  item: any;
}

export default function ModerationItem({ type, item }: ModerationItemProps) {
  const [loading, setLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const router = useRouter();
  const supabase = createClient();

  const getIcon = () => {
    switch (type) {
      case "setlist":
        return FileText;
      case "review":
        return MessageSquare;
      case "photo":
        return ImageIcon;
      case "tip":
        return Lightbulb;
    }
  };

  const getTitle = () => {
    switch (type) {
      case "setlist":
        return `Setlist for ${item.show?.name} - ${item.artist?.name}`;
      case "review":
        return `Review of ${item.venue?.name}`;
      case "photo":
        return `Photo at ${item.venue?.name}`;
      case "tip":
        return `Tip for ${item.venue?.name}`;
    }
  };

  const getContent = () => {
    switch (type) {
      case "setlist":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="h-4 w-4" />
              {item.show?.date &&
                format(new Date(item.show.date), "MMM d, yyyy")}
              <MapPin className="ml-2 h-4 w-4" />
              {item.show?.venue?.name}
            </div>
            <p className="text-sm">Type: {item.type}</p>
          </div>
        );
      case "review":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {[...new Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < item.rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
              <span className="font-medium text-sm">{item.rating}/5</span>
            </div>
            <p className="line-clamp-3 text-sm">{item.review}</p>
            <p className="text-muted-foreground text-xs">
              Visited: {format(new Date(item.visited_at), "MMM d, yyyy")}
            </p>
          </div>
        );
      case "photo":
        return (
          <div className="space-y-2">
            <img
              src={item.image_url}
              alt={item.caption || "Venue photo"}
              className="h-48 w-full rounded-md object-cover"
            />
            {item.caption && <p className="text-sm">{item.caption}</p>}
          </div>
        );
      case "tip":
        return (
          <div className="space-y-2">
            <Badge variant="secondary">{item.tip_category}</Badge>
            <p className="text-sm">{item.tip}</p>
          </div>
        );
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      const table =
        type === "setlist"
          ? "setlists"
          : type === "review"
            ? "venue_reviews"
            : type === "photo"
              ? "venue_photos"
              : "venue_insider_tips";

      // Update moderation status
      const { error } = await supabase
        .from(table)
        .update({
          moderation_status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", item.id);

      if (error) {
        throw error;
      }

      // Log action
      await supabase.from("moderation_logs").insert({
        moderator_id: (await supabase.auth.getUser()).data.user?.id,
        action: "approve",
        target_type: type,
        target_id: item.id,
        reason: "Content approved",
      });

      toast({
        title: "Content approved",
        description: "The content has been approved and is now visible.",
      });

      router.refresh();
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to approve content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const table =
        type === "setlist"
          ? "setlists"
          : type === "review"
            ? "venue_reviews"
            : type === "photo"
              ? "venue_photos"
              : "venue_insider_tips";

      // Update moderation status
      const { error } = await supabase
        .from(table)
        .update({
          moderation_status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", item.id);

      if (error) {
        throw error;
      }

      // Log action
      await supabase.from("moderation_logs").insert({
        moderator_id: (await supabase.auth.getUser()).data.user?.id,
        action: "reject",
        target_type: type,
        target_id: item.id,
        reason: rejectReason,
      });

      toast({
        title: "Content rejected",
        description: "The content has been rejected.",
      });

      setRejectDialogOpen(false);
      router.refresh();
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to reject content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const Icon = getIcon();
  const user = item.created_by || item.user;

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-md bg-muted p-2">
              <Icon className="h-5 w-5" />
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h4 className="font-medium">{getTitle()}</h4>
                <div className="mt-1 flex items-center gap-2">
                  {/* Avatar temporarily disabled due to TypeScript issues */}
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {user?.display_name?.[0] || user?.email?.[0] || "U"}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {user?.display_name || user?.email}
                  </span>
                  <span className="text-muted-foreground text-sm">•</span>
                  <span className="text-muted-foreground text-sm">
                    {format(new Date(item.created_at), "MMM d, h:mm a")}
                  </span>
                </div>
              </div>

              {getContent()}

              <div className="flex items-center gap-2 pt-2">
                <Button size="sm" onClick={handleApprove} disabled={loading}>
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={loading}
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  Reject
                </Button>
                <Button size="sm" variant="ghost" disabled={loading}>
                  <Flag className="mr-1 h-4 w-4" />
                  Flag for Review
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Content</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejection..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading || !rejectReason}
            >
              {loading ? "Rejecting..." : "Reject Content"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
