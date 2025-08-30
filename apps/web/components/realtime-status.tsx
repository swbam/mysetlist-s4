"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/design-system";
import { cn } from "@repo/design-system";
import { AlertCircle, Wifi, WifiOff } from "lucide-react";
import React, { useMemo } from "react";
import { useRealtimeConnection } from "~/app/providers/realtime-provider";

export const RealtimeStatus = React.memo(function RealtimeStatus() {
  const { connectionStatus, isConnected } = useRealtimeConnection();

  const statusConfig = useMemo(
    () => ({
      connecting: {
        icon: Wifi,
        className: "text-yellow-500 animate-pulse",
        label: "Connecting...",
      },
      connected: {
        icon: Wifi,
        className: "text-green-500",
        label: "Live updates active",
      },
      disconnected: {
        icon: WifiOff,
        className: "text-orange-500",
        label: "Reconnecting",
      },
      error: {
        icon: AlertCircle,
        className: "text-red-500",
        label: "Setup required",
      },
      disabled: {
        icon: WifiOff,
        className: "text-gray-400",
        label: "Unavailable",
      },
    }),
    [],
  );

  const config = statusConfig[connectionStatus];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2 py-1 font-medium text-xs transition-all duration-300",
              connectionStatus === "connected" && "bg-green-500/10 border border-green-200/50",
              connectionStatus === "connecting" && "bg-yellow-500/10 border border-yellow-200/50",
              connectionStatus === "disconnected" && "bg-orange-500/10 border border-orange-200/50",
              connectionStatus === "error" && "bg-red-500/10 border border-red-200/50",
              connectionStatus === "disabled" && "bg-gray-500/10 border border-gray-200/50",
            )}
          >
            <Icon className={cn("h-3 w-3", config.className)} />
            <span className={cn("hidden sm:inline-block", config.className)}>
              {config.label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            {connectionStatus === "connected" && (
              <p>✅ Real-time updates active. Changes appear instantly.</p>
            )}
            {connectionStatus === "connecting" && (
              <p>🔄 Establishing real-time connection...</p>
            )}
            {connectionStatus === "disconnected" && (
              <p>🔄 Connection lost. Attempting to reconnect...</p>
            )}
            {connectionStatus === "error" && (
              <p>❌ Configuration error. Check console for details.</p>
            )}
            {connectionStatus === "disabled" && (
              <p>⚠️ Real-time features unavailable. Refresh to see latest changes.</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
