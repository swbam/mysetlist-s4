"use client";

import React, {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { createClient } from "~/lib/supabase/client";

type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"
  | "disabled";

interface RealtimeContextType {
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  error?: Error;
  retry: () => void;
  isRealtimeEnabled: boolean;
}

const RealtimeContext = createContext<RealtimeContextType>({
  connectionStatus: "disconnected",
  isConnected: false,
  retry: () => {},
  isRealtimeEnabled: false,
});

export function useRealtimeConnection() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error(
      "useRealtimeConnection must be used within RealtimeProvider",
    );
  }
  return context;
}

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<Error | undefined>();
  const [retryCount, setRetryCount] = useState(0);
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(true);

  const connectToRealtime = useCallback(() => {
    // Skip realtime if disabled
    if (!isRealtimeEnabled) {
      setConnectionStatus("disabled");
      return undefined;
    }

    try {
      const supabase = createClient();

      // Check if we're using placeholder Supabase config
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      if (url.includes("placeholder") || !url) {
        console.warn("Realtime disabled: Invalid Supabase configuration");
        setConnectionStatus("disabled");
        setIsRealtimeEnabled(false);
        return undefined;
      }

      // Clear any previous error
      setError(undefined);
      setConnectionStatus("connecting");

      // Create a presence channel to monitor connection status
      const presenceChannel = supabase.channel("global-presence", {
        config: {
          presence: {
            key: "anonymous",
          },
        },
      });

      let connectionTimeout: NodeJS.Timeout;

      // Set a timeout for the connection attempt
      connectionTimeout = setTimeout(() => {
        if (connectionStatus === "connecting") {
          console.warn(
            "Realtime connection timeout - continuing without realtime",
          );
          setConnectionStatus("disconnected");
          setIsRealtimeEnabled(false);
          try {
            supabase.removeChannel(presenceChannel);
          } catch (err) {
            // Ignore cleanup errors
          }
        }
      }, 10000); // 10 second timeout

      presenceChannel
        .on("presence", { event: "sync" }, () => {
          clearTimeout(connectionTimeout);
          setConnectionStatus("connected");
          setRetryCount(0);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            clearTimeout(connectionTimeout);
            setConnectionStatus("connected");
            setRetryCount(0);
          } else if (status === "CHANNEL_ERROR") {
            clearTimeout(connectionTimeout);
            setConnectionStatus("error");
            setError(new Error("Failed to connect to realtime channel"));

            // Disable realtime after 3 retries
            if (retryCount >= 3) {
              setIsRealtimeEnabled(false);
              setConnectionStatus("disabled");
            }
          } else if (status === "CLOSED") {
            clearTimeout(connectionTimeout);
            setConnectionStatus("disconnected");
          } else if (status === "TIMED_OUT") {
            clearTimeout(connectionTimeout);
            setConnectionStatus("disconnected");
            setIsRealtimeEnabled(false);
          }
        });

      return () => {
        clearTimeout(connectionTimeout);
        try {
          supabase.removeChannel(presenceChannel);
        } catch (err) {
          console.error("Error removing channel:", err);
        }
      };
    } catch (err) {
      console.error("Error in RealtimeProvider:", err);
      setConnectionStatus("error");
      setError(
        err instanceof Error ? err : new Error("Unknown error occurred"),
      );

      // Disable realtime on critical errors
      if (err instanceof Error && err.message.includes("WebSocket")) {
        setIsRealtimeEnabled(false);
        setConnectionStatus("disabled");
      }
      return undefined;
    }
  }, [retryCount, connectionStatus, isRealtimeEnabled]);

  useEffect(() => {
    const cleanup = connectToRealtime();
    return () => {
      if (cleanup) cleanup();
    };
  }, [connectToRealtime]);

  const retry = useCallback(() => {
    if (retryCount < 3) {
      setRetryCount((prev) => prev + 1);
      setIsRealtimeEnabled(true);
    }
  }, [retryCount]);

  const value: RealtimeContextType = {
    connectionStatus,
    isConnected: connectionStatus === "connected",
    ...(error !== undefined && { error }),
    retry,
    isRealtimeEnabled,
  };

  return React.createElement(
    RealtimeContext.Provider as any,
    { value },
    children,
  );
}
