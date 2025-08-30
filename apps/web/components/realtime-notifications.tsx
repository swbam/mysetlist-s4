"use client";

import { Button } from "@repo/design-system";
import { cn } from "@repo/design-system";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Music,
  PlayCircle,
  ThumbsUp,
  UserPlus,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

export type NotificationType =
  | "song_played"
  | "vote_update"
  | "user_joined"
  | "setlist_update";

export interface RealtimeNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  data?: any;
}

interface RealtimeNotificationsProps {
  notifications: RealtimeNotification[];
  onDismiss?: (id: string) => void;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  autoHideDuration?: number;
  maxVisible?: number;
}

export function RealtimeNotifications({
  notifications,
  onDismiss,
  position = "top-right",
  autoHideDuration = 5000,
  maxVisible = 3,
}: RealtimeNotificationsProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleNotifications = notifications
    .filter((n) => !dismissedIds.has(n.id))
    .slice(0, maxVisible);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
    if (onDismiss) {
      onDismiss(id);
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "song_played":
        return PlayCircle;
      case "vote_update":
        return ThumbsUp;
      case "user_joined":
        return UserPlus;
      case "setlist_update":
        return Music;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case "song_played":
        return "from-green-500 to-green-600";
      case "vote_update":
        return "from-blue-500 to-blue-600";
      case "user_joined":
        return "from-blue-500 to-purple-600";
      case "setlist_update":
        return "from-orange-500 to-orange-600";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
  };

  useEffect(() => {
    if (autoHideDuration <= 0) {
      return;
    }

    const timers = visibleNotifications.map((notification) => {
      return setTimeout(() => {
        handleDismiss(notification.id);
      }, autoHideDuration);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [visibleNotifications, autoHideDuration]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-50",
        positionClasses[position],
      )}
    >
      <AnimatePresence>
        {visibleNotifications.map((notification, index) => {
          const Icon = getIcon(notification.type);
          const gradientColor = getNotificationColor(notification.type);

          return (
            <motion.div
              key={notification.id}
              initial={{
                opacity: 0,
                x: position.includes("right") ? 100 : -100,
                scale: 0.8,
              }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                y: index * 10,
              }}
              exit={{
                opacity: 0,
                x: position.includes("right") ? 100 : -100,
                scale: 0.8,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              className="pointer-events-auto mb-3"
            >
              <div className="relative overflow-hidden rounded-lg shadow-xl">
                {/* Gradient background */}
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-r opacity-90",
                    gradientColor,
                  )}
                />

                {/* Content */}
                <div className="relative bg-white/10 p-4 pr-12 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-white/20 p-2">
                      <Icon className="h-5 w-5 text-white" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1 font-semibold text-sm text-white">
                        {notification.title}
                      </h4>
                      <p className="line-clamp-2 text-white/90 text-xs">
                        {notification.message}
                      </p>
                    </div>
                  </div>

                  {/* Dismiss button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 p-0 text-white hover:bg-white/20"
                    onClick={() => handleDismiss(notification.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Audio indicator */}
                <div className="absolute right-1 bottom-1">
                  <Volume2 className="h-3 w-3 animate-pulse text-white/50" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Hook for managing notifications
export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>(
    [],
  );

  const addNotification = (
    notification: Omit<RealtimeNotification, "id" | "timestamp">,
  ) => {
    const newNotification: RealtimeNotification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };

    setNotifications((prev) => [newNotification, ...prev]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
  };
}
