"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "~/app/providers/auth-provider";

interface SocialStatus {
  liked: boolean;
  saved: boolean;
}

interface UseSocialInteractionsOptions {
  targetType: "show" | "artist" | "venue" | "setlist";
  targetId: string;
  onLike?: () => void;
  onUnlike?: () => void;
  onSave?: () => void;
  onUnsave?: () => void;
}

export function useSocialInteractions({
  targetType,
  targetId,
  onLike,
  onUnlike,
  onSave,
  onUnsave,
}: UseSocialInteractionsOptions) {
  const { user } = useAuth();
  const [status, setStatus] = useState<SocialStatus>({
    liked: false,
    saved: false,
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Fetch initial status
  useEffect(() => {
    if (!user || !targetId) {
      setInitialLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `/api/social?type=${targetType}&ids=${targetId}`,
        );

        if (response.ok) {
          const data = await response.json();
          if (data.status[targetId]) {
            setStatus(data.status[targetId]);
          }
        }
      } catch (_error) {
      } finally {
        setInitialLoading(false);
      }
    };

    fetchStatus();
  }, [user, targetType, targetId]);

  const handleAction = useCallback(
    async (action: "like" | "unlike" | "save" | "unsave") => {
      if (!user) {
        toast.error("Please sign in to continue");
        return;
      }

      setLoading(true);

      try {
        const response = await fetch("/api/social", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            targetType,
            targetId,
          }),
        });

        if (response.ok) {
          await response.json();

          // Update local state
          setStatus((prev) => ({
            ...prev,
            liked:
              action === "like"
                ? true
                : action === "unlike"
                  ? false
                  : prev.liked,
            saved:
              action === "save"
                ? true
                : action === "unsave"
                  ? false
                  : prev.saved,
          }));

          // Call callbacks
          if (action === "like") {
            onLike?.();
            toast.success("Added to likes");
          } else if (action === "unlike") {
            onUnlike?.();
            toast.success("Removed from likes");
          } else if (action === "save") {
            onSave?.();
            toast.success("Saved for later");
          } else if (action === "unsave") {
            onUnsave?.();
            toast.success("Removed from saved");
          }
        } else {
          throw new Error("Failed to update");
        }
      } catch (_error) {
        toast.error("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [user, targetType, targetId, onLike, onUnlike, onSave, onUnsave],
  );

  const toggleLike = useCallback(() => {
    handleAction(status.liked ? "unlike" : "like");
  }, [status.liked, handleAction]);

  const toggleSave = useCallback(() => {
    handleAction(status.saved ? "unsave" : "save");
  }, [status.saved, handleAction]);

  return {
    liked: status.liked,
    saved: status.saved,
    loading,
    initialLoading,
    toggleLike,
    toggleSave,
  };
}

// Hook for multiple items
export function useSocialInteractionsBatch(
  targetType: "show" | "artist" | "venue" | "setlist",
  targetIds: string[],
) {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<Record<string, SocialStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || targetIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchStatuses = async () => {
      try {
        const response = await fetch(
          `/api/social?type=${targetType}&ids=${targetIds.join(",")}`,
        );

        if (response.ok) {
          const data = await response.json();
          setStatuses(data.status || {});
        }
      } catch (_error) {
      } finally {
        setLoading(false);
      }
    };

    fetchStatuses();
  }, [user, targetType, targetIds.join(",")]);

  const updateStatus = useCallback(
    (targetId: string, updates: Partial<SocialStatus>) => {
      setStatuses((prev) => ({
        ...prev,
        [targetId]: {
          liked: false,
          saved: false,
          ...prev[targetId],
          ...updates,
        },
      }));
    },
    [],
  );

  return {
    statuses,
    loading,
    updateStatus,
  };
}
