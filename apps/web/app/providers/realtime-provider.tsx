"use client";

import React, {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
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
  const [isMounted, setIsMounted] = useState(false);
  
  // Track cleanup functions to prevent memory leaks
  const cleanupRef = useRef<(() => void) | null>(null);
  
  // Prevent hydration mismatch by not running effects until mounted
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const connectToRealtime = useCallback(() => {
    // Skip realtime if disabled or not mounted
    if (!isRealtimeEnabled || !isMounted) {
      setConnectionStatus("disabled");
      return undefined;
    }

    try {
      const supabase = createClient();

      // Check if we have valid Supabase config
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      
      if (!url || !anonKey || url.includes("your_supabase") || anonKey.includes("your_supabase")) {
        if (process.env.NODE_ENV === "development") {
          console.error("🔴 Real-time disabled: Missing or invalid Supabase configuration", {
            hasUrl: !!url,
            hasKey: !!anonKey,
            urlIsPlaceholder: url.includes("your_supabase"),
            keyIsPlaceholder: anonKey.includes("your_supabase")
          });
        }
        setConnectionStatus("disabled");
        setError(new Error("Missing Supabase configuration"));
        return undefined;
      }

      // Clear any previous error
      setError(undefined);
      setConnectionStatus("connecting");

      // Create a presence channel to monitor connection status
      const presenceChannel = supabase.channel(`global-presence-${Date.now()}`, {
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
          if (process.env.NODE_ENV === "development") {
            console.error("🔴 Real-time connection timeout after 10 seconds");
          }
          setConnectionStatus("error");
          setError(new Error("Connection timeout"));
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
          if (process.env.NODE_ENV === "development") {
            console.log("🟢 Real-time connection established successfully");
          }
          setConnectionStatus("connected");
          setRetryCount(0);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            clearTimeout(connectionTimeout);
            if (process.env.NODE_ENV === "development") {
              console.log("🟢 Real-time subscription active");
            }
            setConnectionStatus("connected");
            setRetryCount(0);
          } else if (status === "CHANNEL_ERROR") {
            clearTimeout(connectionTimeout);
            if (process.env.NODE_ENV === "development") {
              console.error("🔴 Real-time channel error", status);
            }
            setConnectionStatus("error");
            setError(new Error("Failed to connect to realtime channel"));

            // Disable realtime after 3 retries
            if (retryCount >= 2) {
              if (process.env.NODE_ENV === "development") {
                console.error("🔴 Too many retry attempts, disabling real-time");
              }
              setIsRealtimeEnabled(false);
              setConnectionStatus("disabled");
            }
          } else if (status === "CLOSED") {
            clearTimeout(connectionTimeout);
            if (process.env.NODE_ENV === "development") {
              console.warn("🟡 Real-time connection closed");
            }
            setConnectionStatus("disconnected");
          } else if (status === "TIMED_OUT") {
            clearTimeout(connectionTimeout);
            if (process.env.NODE_ENV === "development") {
              console.error("🔴 Real-time connection timed out");
            }
            setConnectionStatus("error");
            setError(new Error("Connection timed out"));
          }
        });

      // Return cleanup function
      const cleanup = () => {
        clearTimeout(connectionTimeout);
        try {
          supabase.removeChannel(presenceChannel);
        } catch (err) {
          if (process.env.NODE_ENV === "development") {
            console.error("Error removing channel:", err);
          }
        }
      };
      
      cleanupRef.current = cleanup;
      return cleanup;
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("🔴 Critical error in RealtimeProvider:", err);
      }
      setConnectionStatus("error");
      const error = err instanceof Error ? err : new Error("Unknown real-time error occurred");
      setError(error);

      // Disable realtime on critical errors
      if (error.message.includes("WebSocket") || error.message.includes("Missing")) {
        if (process.env.NODE_ENV === "development") {
          console.error("🔴 Disabling real-time due to critical error:", error.message);
        }
        setIsRealtimeEnabled(false);
        setConnectionStatus("disabled");
      }
      return undefined;
    }
  }, [retryCount, connectionStatus, isRealtimeEnabled, isMounted]);

  // Only connect when mounted to prevent hydration issues
  useEffect(() => {
    if (!isMounted) return;
    
    const cleanup = connectToRealtime();
    return () => {
      if (cleanup) cleanup();
    };
  }, [connectToRealtime, isMounted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const retry = useCallback(() => {
    if (retryCount < 3) {
      if (process.env.NODE_ENV === "development") {
        console.log(`🔄 Retrying real-time connection (attempt ${retryCount + 1}/3)`);
      }
      setRetryCount((prev) => prev + 1);
      setIsRealtimeEnabled(true);
      setError(undefined);
    } else {
      if (process.env.NODE_ENV === "development") {
        console.error("🔴 Maximum retry attempts reached");
      }
    }
  }, [retryCount]);

  // Memoize the context value to prevent unnecessary re-renders
  const value: RealtimeContextType = useMemo(() => ({
    connectionStatus,
    isConnected: connectionStatus === "connected",
    ...(error !== undefined && { error }),
    retry,
    isRealtimeEnabled,
  }), [connectionStatus, error, retry, isRealtimeEnabled]);
  
  // Don't render children until mounted to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}