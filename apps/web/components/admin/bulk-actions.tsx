"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  Settings,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface BulkActionsProps {
  selectedItems: any[];
  contentType: "content" | "users" | "venues" | "shows";
  onActionComplete: () => void;
  onClearSelection: () => void;
}

export default function BulkActions({
  selectedItems,
  contentType,
  onActionComplete,
  onClearSelection,
}: BulkActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: string) => {
    if (selectedItems.length === 0) {
      return;
    }

    const actionsNeedingDialog = [
      "reject_content",
      "ban_users",
      "delete_content",
    ];

    if (actionsNeedingDialog.includes(action)) {
      setCurrentAction(action);
      setIsDialogOpen(true);
      return;
    }

    await executeAction(action);
  };

  const executeAction = async (action: string, options: any = {}) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          items: selectedItems,
          options: {
            reason: reason || undefined,
            duration_days: duration ? Number.parseInt(duration) : undefined,
            hard_delete: options.hardDelete || false,
            ...options,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        onActionComplete();
        onClearSelection();
        setIsDialogOpen(false);
        setReason("");
        setDuration("");
      } else {
        toast.error(result.error || "Action failed");
      }
    } catch (_error) {
      toast.error("Network error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogConfirm = () => {
    if (currentAction) {
      executeAction(currentAction);
    }
  };

  const getActionTitle = () => {
    switch (currentAction) {
      case "reject_content":
        return "Reject Content";
      case "ban_users":
        return "Ban Users";
      case "delete_content":
        return "Delete Content";
      default:
        return "Confirm Action";
    }
  };

  const getActionDescription = () => {
    const count = selectedItems.length;
    switch (currentAction) {
      case "reject_content":
        return `Are you sure you want to reject ${count} selected item${count > 1 ? "s" : ""}? This action cannot be undone.`;
      case "ban_users":
        return `Are you sure you want to ban ${count} selected user${count > 1 ? "s" : ""}? This will prevent them from accessing the platform.`;
      case "delete_content":
        return `Are you sure you want to delete ${count} selected item${count > 1 ? "s" : ""}? This action cannot be undone.`;
      default:
        return `Are you sure you want to perform this action on ${count} selected item${count > 1 ? "s" : ""}?`;
    }
  };

  if (selectedItems.length === 0) {
    return null;
  }

  const getAvailableActions = () => {
    switch (contentType) {
      case "content":
        return [
          {
            label: "Approve",
            action: "approve_content",
            icon: CheckCircle,
            variant: "default" as const,
          },
          {
            label: "Reject",
            action: "reject_content",
            icon: XCircle,
            variant: "destructive" as const,
          },
          {
            label: "Delete",
            action: "delete_content",
            icon: Trash2,
            variant: "destructive" as const,
          },
        ];
      case "users":
        return [
          {
            label: "Ban Users",
            action: "ban_users",
            icon: Ban,
            variant: "destructive" as const,
          },
          {
            label: "Remove Warning",
            action: "remove_warning",
            icon: CheckCircle,
            variant: "default" as const,
          },
        ];
      case "venues":
        return [
          {
            label: "Verify Venues",
            action: "verify_venues",
            icon: ShieldCheck,
            variant: "default" as const,
          },
          {
            label: "Delete",
            action: "delete_content",
            icon: Trash2,
            variant: "destructive" as const,
          },
        ];
      case "shows":
        return [
          {
            label: "Mark as Completed",
            action: "update_show_status",
            icon: CheckCircle,
            variant: "default" as const,
          },
          {
            label: "Mark as Cancelled",
            action: "update_show_status",
            icon: XCircle,
            variant: "destructive" as const,
          },
          {
            label: "Delete",
            action: "delete_content",
            icon: Trash2,
            variant: "destructive" as const,
          },
        ];
      default:
        return [];
    }
  };

  return (
    <>
      <div className="mb-6 rounded-lg border bg-muted/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {selectedItems.length} item{selectedItems.length > 1 ? "s" : ""}{" "}
              selected
            </p>
            <p className="text-muted-foreground text-sm">
              Choose an action to apply to all selected items
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClearSelection}>
              Clear Selection
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={isLoading}>
                  <Settings className="mr-2 h-4 w-4" />
                  Bulk Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Available Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {getAvailableActions().map((action) => (
                  <DropdownMenuItem
                    key={action.action}
                    onClick={() => handleAction(action.action)}
                    className={
                      action.variant === "destructive" ? "text-destructive" : ""
                    }
                  >
                    <action.icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {getActionTitle()}
            </DialogTitle>
            <DialogDescription>{getActionDescription()}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {(currentAction === "reject_content" ||
              currentAction === "ban_users") && (
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Provide a reason for this action..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            )}

            {currentAction === "ban_users" && (
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (days)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="Leave empty for permanent ban"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDialogConfirm}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
