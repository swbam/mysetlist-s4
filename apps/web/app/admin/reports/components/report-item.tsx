"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar"
import { Badge } from "@repo/design-system/components/ui/badge"
import { Button } from "@repo/design-system/components/ui/button"
import { Card, CardContent } from "@repo/design-system/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog"
import { Label } from "@repo/design-system/components/ui/label"
import { Textarea } from "@repo/design-system/components/ui/textarea"
import { toast } from "@repo/design-system/components/ui/use-toast"
import { format } from "date-fns"
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  FileText,
  Flag,
  Image,
  Lightbulb,
  MessageSquare,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createClient } from "~/lib/supabase/client"

interface ReportItemProps {
  report: any
  isResolved?: boolean
}

export default function ReportItem({
  report,
  isResolved = false,
}: ReportItemProps) {
  const [loading, setLoading] = useState(false)
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState("")
  const [selectedAction, setSelectedAction] = useState<
    "dismiss" | "warn" | "delete" | "ban"
  >("dismiss")

  const router = useRouter()
  const supabase = createClient()

  const getContentIcon = () => {
    switch (report.content_type) {
      case "setlist":
        return FileText
      case "review":
        return MessageSquare
      case "photo":
        return Image
      case "tip":
        return Lightbulb
      default:
        return AlertTriangle
    }
  }

  const getReasonBadgeColor = () => {
    switch (report.reason) {
      case "spam":
        return "secondary"
      case "inappropriate_content":
        return "destructive"
      case "harassment":
        return "destructive"
      case "misinformation":
        return "outline"
      case "copyright":
        return "outline"
      default:
        return "secondary"
    }
  }

  const handleResolve = async () => {
    setLoading(true)
    try {
      // Update report status
      const { error: reportError } = await supabase
        .from("reports")
        .update({
          status: selectedAction === "dismiss" ? "resolved" : "approved",
          resolved_by: (await supabase.auth.getUser()).data.user?.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
        })
        .eq("id", report.id)

      if (reportError) {
        throw reportError
      }

      // Take action based on selection
      switch (selectedAction) {
        case "delete": {
          // Update content moderation status
          await supabase.from("content_moderation").upsert({
            content_type: report.content_type,
            content_id: report.content_id,
            status: "deleted",
            reviewed_by: (await supabase.auth.getUser()).data.user?.id,
            reviewed_at: new Date().toISOString(),
            review_notes: `Deleted due to report: ${report.reason}`,
          })

          // Delete the actual content
          const table =
            report.content_type === "setlist"
              ? "setlists"
              : report.content_type === "review"
                ? "venue_reviews"
                : report.content_type === "photo"
                  ? "venue_photos"
                  : "venue_insider_tips"

          await supabase
            .from(table)
            .update({ moderation_status: "deleted" })
            .eq("id", report.content_id)
          break
        }

        case "warn":
          if (report.reported_user_id) {
            // Update user warning count
            await supabase.rpc("increment_user_warnings", {
              user_id: report.reported_user_id,
            })

            // Log moderation action
            await supabase.from("moderation_logs").insert({
              moderator_id: (await supabase.auth.getUser()).data.user?.id,
              action: "warn_user",
              target_type: "user",
              target_id: report.reported_user_id,
              reason: `Warning issued for ${report.reason}: ${resolutionNotes}`,
            })
          }
          break

        case "ban":
          if (report.reported_user_id) {
            // Create ban record
            await supabase.from("user_bans").insert({
              user_id: report.reported_user_id,
              banned_by: (await supabase.auth.getUser()).data.user?.id,
              reason: `Banned due to report: ${report.reason} - ${resolutionNotes}`,
              ban_type: "temporary",
              banned_until: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
              ).toISOString(), // 7 days
            })

            // Update user record
            await supabase
              .from("users")
              .update({
                is_banned: true,
                ban_reason: `Banned due to report: ${report.reason}`,
              })
              .eq("id", report.reported_user_id)

            // Log moderation action
            await supabase.from("moderation_logs").insert({
              moderator_id: (await supabase.auth.getUser()).data.user?.id,
              action: "ban_user",
              target_type: "user",
              target_id: report.reported_user_id,
              reason: `Banned due to report: ${report.reason}`,
            })
          }
          break
      }

      // Log report resolution
      await supabase.from("moderation_logs").insert({
        moderator_id: (await supabase.auth.getUser()).data.user?.id,
        action: "resolve_report",
        target_type: "report",
        target_id: report.id,
        reason: resolutionNotes,
        metadata: { action: selectedAction },
      })

      toast({
        title: "Report resolved",
        description: `The report has been resolved with action: ${selectedAction}.`,
      })

      setResolveDialogOpen(false)
      router.refresh()
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to resolve report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const ContentIcon = getContentIcon()

  return (
    <>
      <Card className={isResolved ? "opacity-75" : ""}>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Report Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-muted p-2">
                  <Flag className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">
                      Report #{report.id.slice(0, 8)}
                    </h4>
                    <Badge variant={getReasonBadgeColor()}>
                      {report.reason.replace("_", " ")}
                    </Badge>
                    {isResolved && (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Resolved
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {format(new Date(report.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>

              {!isResolved && (
                <Button size="sm" onClick={() => setResolveDialogOpen(true)}>
                  Resolve
                </Button>
              )}
            </div>

            {/* Reporter Info */}
            <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={report.reporter?.avatar_url} />
                <AvatarFallback>
                  {report.reporter?.display_name?.[0] ||
                    report.reporter?.email?.[0] ||
                    "R"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-sm">
                  Reported by{" "}
                  {report.reporter?.display_name || report.reporter?.email}
                </p>
                {report.description && (
                  <p className="mt-1 text-muted-foreground text-sm">
                    "{report.description}"
                  </p>
                )}
              </div>
            </div>

            {/* Content Info */}
            <div className="flex items-center gap-3 rounded-md border p-3">
              <ContentIcon className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium text-sm capitalize">
                  {report.content_type} Content
                </p>
                <div className="mt-1 flex items-center gap-2">
                  {report.reported_user_id && (
                    <>
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={report.reported_user?.avatar_url} />
                        <AvatarFallback>
                          {report.reported_user?.display_name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground text-sm">
                        by{" "}
                        {report.reported_user?.display_name ||
                          report.reported_user?.email}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline">
                <Eye className="mr-1 h-4 w-4" />
                View Content
              </Button>
            </div>

            {/* Resolution Info */}
            {isResolved && report.resolved_by && (
              <div className="rounded-md bg-green-50 p-3 dark:bg-green-950/20">
                <p className="text-sm">
                  <span className="font-medium">Resolved by:</span>{" "}
                  {report.resolved_by_user?.display_name ||
                    report.resolved_by_user?.email}
                </p>
                {report.resolution_notes && (
                  <p className="mt-1 text-sm">
                    <span className="font-medium">Notes:</span>{" "}
                    {report.resolution_notes}
                  </p>
                )}
                <p className="mt-1 text-muted-foreground text-xs">
                  {format(new Date(report.resolved_at), "MMM d, yyyy h:mm a")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
            <DialogDescription>
              Choose an action to resolve this report
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Action</Label>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 hover:bg-accent">
                  <input
                    type="radio"
                    value="dismiss"
                    checked={selectedAction === "dismiss"}
                    onChange={(e) => setSelectedAction(e.target.value as any)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">Dismiss Report</p>
                    <p className="text-muted-foreground text-sm">
                      No action needed
                    </p>
                  </div>
                </label>

                <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 hover:bg-accent">
                  <input
                    type="radio"
                    value="warn"
                    checked={selectedAction === "warn"}
                    onChange={(e) => setSelectedAction(e.target.value as any)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">Warn User</p>
                    <p className="text-muted-foreground text-sm">
                      Issue a warning
                    </p>
                  </div>
                </label>

                <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 hover:bg-accent">
                  <input
                    type="radio"
                    value="delete"
                    checked={selectedAction === "delete"}
                    onChange={(e) => setSelectedAction(e.target.value as any)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">Delete Content</p>
                    <p className="text-muted-foreground text-sm">
                      Remove the reported content
                    </p>
                  </div>
                </label>

                <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 hover:bg-accent">
                  <input
                    type="radio"
                    value="ban"
                    checked={selectedAction === "ban"}
                    onChange={(e) => setSelectedAction(e.target.value as any)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">Ban User</p>
                    <p className="text-muted-foreground text-sm">
                      Temporary 7-day ban
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolution-notes">Resolution Notes</Label>
              <Textarea
                id="resolution-notes"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Add notes about your decision..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={loading || !resolutionNotes}
            >
              {loading ? "Resolving..." : "Resolve Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
