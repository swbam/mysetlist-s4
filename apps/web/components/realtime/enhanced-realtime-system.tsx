"use client"

import { Badge } from "@repo/design-system/components/ui/badge"
import { Button } from "@repo/design-system/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card"
import { Progress } from "@repo/design-system/components/ui/progress"
import { cn } from "@repo/design-system/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import {
  Activity,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Signal,
  TrendingUp,
  Users,
  WifiOff,
  Zap,
} from "lucide-react"
import { memo, useCallback, useEffect, useRef, useState } from "react"
import { useScreenReaderAnnouncements } from "~/components/accessibility/enhanced-accessibility"
import { createClient } from "~/lib/supabase/client"

// Enhanced connection state
interface ConnectionState {
  status: "connecting" | "connected" | "disconnected" | "error" | "reconnecting"
  lastConnected?: Date
  disconnectedAt?: Date
  reconnectAttempts: number
  maxReconnectAttempts: number
  reconnectDelay: number
  latency?: number
  error?: string
}

// Real-time event types
interface RealtimeEvent {
  id: string
  type: string
  data: any
  timestamp: Date
  userId?: string
  processed: boolean
}

interface RealtimeMetrics {
  messagesReceived: number
  messagesProcessed: number
  averageLatency: number
  connectionUptime: number
  errorRate: number
  lastActivity: Date
}

// Enhanced real-time connection hook
export function useEnhancedRealtimeConnection() {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: "disconnected",
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
  })

  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    messagesReceived: 0,
    messagesProcessed: 0,
    averageLatency: 0,
    connectionUptime: 0,
    errorRate: 0,
    lastActivity: new Date(),
  })

  const [eventQueue, setEventQueue] = useState<RealtimeEvent[]>([])
  const [isProcessingQueue, setIsProcessingQueue] = useState(false)

  const supabase = createClient()
  const channelRef = useRef<any>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { announce } = useScreenReaderAnnouncements()

  // Calculate connection latency
  const measureLatency = useCallback(async () => {
    const start = performance.now()
    try {
      // Ping the server with a heartbeat
      const response = await fetch("/api/health/edge", { method: "HEAD" })
      if (response.ok) {
        const latency = performance.now() - start
        setConnectionState((prev) => ({ ...prev, latency }))

        // Update average latency in metrics
        setMetrics((prev) => ({
          ...prev,
          averageLatency: (prev.averageLatency + latency) / 2,
        }))
      }
    } catch (error) {
      console.warn("Latency measurement failed:", error)
    }
  }, [])

  // Process queued events
  const processEventQueue = useCallback(async () => {
    if (isProcessingQueue || eventQueue.length === 0) return

    setIsProcessingQueue(true)

    try {
      const eventsToProcess = eventQueue.filter((event) => !event.processed)

      for (const event of eventsToProcess) {
        // Process event based on type
        switch (event.type) {
          case "vote_update":
            // Handle vote updates
            break
          case "setlist_change":
            // Handle setlist changes
            break
          case "user_presence":
            // Handle user presence updates
            break
          default:
            console.warn("Unknown event type:", event.type)
        }

        // Mark as processed
        setEventQueue((prev) =>
          prev.map((e) => (e.id === event.id ? { ...e, processed: true } : e))
        )
      }

      setMetrics((prev) => ({
        ...prev,
        messagesProcessed: prev.messagesProcessed + eventsToProcess.length,
        lastActivity: new Date(),
      }))
    } catch (error) {
      console.error("Event processing failed:", error)
      setMetrics((prev) => ({
        ...prev,
        errorRate: prev.errorRate + 1,
      }))
    } finally {
      setIsProcessingQueue(false)
    }
  }, [eventQueue, isProcessingQueue])

  // Enhanced reconnection logic
  const reconnect = useCallback(() => {
    if (connectionState.status === "reconnecting") return

    setConnectionState((prev) => ({
      ...prev,
      status: "reconnecting",
      reconnectAttempts: prev.reconnectAttempts + 1,
    }))

    const delay = Math.min(
      connectionState.reconnectDelay *
        Math.pow(2, connectionState.reconnectAttempts),
      30000 // Max 30 seconds
    )

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        // Clean up existing connection
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current)
        }

        // Create new connection
        setupConnection()
      } catch (error) {
        console.error("Reconnection failed:", error)
        setConnectionState((prev) => ({
          ...prev,
          status: "error",
          error: "Reconnection failed",
        }))
      }
    }, delay)
  }, [connectionState.reconnectAttempts, connectionState.reconnectDelay])

  // Setup real-time connection
  const setupConnection = useCallback(() => {
    const channel = supabase.channel("enhanced-realtime")

    channel
      .on("presence", { event: "sync" }, () => {
        setConnectionState((prev) => {
          const { error, ...rest } = prev
          return {
            ...rest,
            status: "connected",
            lastConnected: new Date(),
            reconnectAttempts: 0,
          }
        })

        announce("Real-time connection established", "polite")
        measureLatency()
      })
      .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
        const event: RealtimeEvent = {
          id: crypto.randomUUID(),
          type: "postgres_change",
          data: payload,
          timestamp: new Date(),
          processed: false,
        }

        setEventQueue((prev) => [...prev, event])
        setMetrics((prev) => ({
          ...prev,
          messagesReceived: prev.messagesReceived + 1,
        }))
      })
      .subscribe(async (status) => {
        switch (status) {
          case "SUBSCRIBED":
            setConnectionState((prev) => ({
              ...prev,
              status: "connected",
              lastConnected: new Date(),
              reconnectAttempts: 0,
            }))
            break
          case "CHANNEL_ERROR":
            setConnectionState((prev) => ({
              ...prev,
              status: "error",
              error: "Channel error",
              disconnectedAt: new Date(),
            }))

            if (
              connectionState.reconnectAttempts <
              connectionState.maxReconnectAttempts
            ) {
              reconnect()
            }
            break
          case "CLOSED":
            setConnectionState((prev) => ({
              ...prev,
              status: "disconnected",
              disconnectedAt: new Date(),
            }))

            announce("Real-time connection lost", "assertive")
            break
          default:
            setConnectionState((prev) => ({
              ...prev,
              status: "connecting",
            }))
        }
      })

    channelRef.current = channel
  }, [
    announce,
    measureLatency,
    reconnect,
    connectionState.reconnectAttempts,
    connectionState.maxReconnectAttempts,
  ])

  // Start connection
  const connect = useCallback(() => {
    if (
      connectionState.status === "connected" ||
      connectionState.status === "connecting"
    ) {
      return
    }

    setupConnection()
  }, [connectionState.status, setupConnection])

  // Disconnect
  const disconnect = useCallback(async () => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    setConnectionState((prev) => ({
      ...prev,
      status: "disconnected",
      disconnectedAt: new Date(),
    }))
  }, [])

  // Force reconnect
  const forceReconnect = useCallback(() => {
    disconnect()
    setTimeout(connect, 100)
  }, [disconnect, connect])

  // Process events when queue changes
  useEffect(() => {
    if (eventQueue.length > 0) {
      processEventQueue()
    }
  }, [eventQueue, processEventQueue])

  // Update metrics periodically
  useEffect(() => {
    metricsIntervalRef.current = setInterval(() => {
      if (
        connectionState.status === "connected" &&
        connectionState.lastConnected
      ) {
        const uptime = Date.now() - connectionState.lastConnected.getTime()
        setMetrics((prev) => ({
          ...prev,
          connectionUptime: uptime,
        }))
      }
    }, 1000)

    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current)
      }
    }
  }, [connectionState.status, connectionState.lastConnected])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current)
      }
    }
  }, [disconnect])

  return {
    connectionState,
    metrics,
    eventQueue,
    isProcessingQueue,
    connect,
    disconnect,
    forceReconnect,
    measureLatency,
  }
}

// Enhanced connection status component
interface EnhancedConnectionStatusProps {
  showDetails?: boolean
  showMetrics?: boolean
  className?: string
}

export const EnhancedConnectionStatus = memo(function EnhancedConnectionStatus({
  showDetails = false,
  showMetrics = false,
  className,
}: EnhancedConnectionStatusProps) {
  const { connectionState, metrics, forceReconnect } =
    useEnhancedRealtimeConnection()

  const statusConfig = {
    connecting: {
      icon: Activity,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      label: "Connecting...",
      description: "Establishing connection",
    },
    connected: {
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      label: "Connected",
      description: "Real-time updates active",
    },
    disconnected: {
      icon: WifiOff,
      color: "text-gray-500",
      bgColor: "bg-gray-500/10",
      label: "Disconnected",
      description: "No real-time updates",
    },
    reconnecting: {
      icon: RefreshCw,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      label: "Reconnecting...",
      description: `Attempt ${connectionState.reconnectAttempts}/${connectionState.maxReconnectAttempts}`,
    },
    error: {
      icon: AlertCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      label: "Error",
      description: connectionState.error || "Connection failed",
    },
  }

  const config = statusConfig[connectionState.status]
  const Icon = config.icon

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-full", config.bgColor)}>
              <Icon className={cn("h-4 w-4", config.color)} />
            </div>
            <div>
              <span className="text-sm font-medium">{config.label}</span>
              <p className="text-xs text-muted-foreground">
                {config.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {connectionState.latency && (
              <Badge variant="outline" className="text-xs">
                {connectionState.latency.toFixed(0)}ms
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={forceReconnect}
              disabled={connectionState.status === "connecting"}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      {showDetails && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Connection Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-medium">{connectionState.status}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Attempts:</span>
                <p className="font-medium">
                  {connectionState.reconnectAttempts}/
                  {connectionState.maxReconnectAttempts}
                </p>
              </div>
              {connectionState.lastConnected && (
                <div>
                  <span className="text-muted-foreground">Connected:</span>
                  <p className="font-medium">
                    {connectionState.lastConnected.toLocaleTimeString()}
                  </p>
                </div>
              )}
              {connectionState.disconnectedAt && (
                <div>
                  <span className="text-muted-foreground">Disconnected:</span>
                  <p className="font-medium">
                    {connectionState.disconnectedAt.toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>

            {/* Reconnection Progress */}
            {connectionState.status === "reconnecting" && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Reconnecting...</span>
                  <span>
                    {connectionState.reconnectAttempts}/
                    {connectionState.maxReconnectAttempts}
                  </span>
                </div>
                <Progress
                  value={
                    (connectionState.reconnectAttempts /
                      connectionState.maxReconnectAttempts) *
                    100
                  }
                  className="h-2"
                />
              </div>
            )}
          </div>
        </CardContent>
      )}

      {showMetrics && (
        <CardContent className="pt-0 border-t">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Metrics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Messages:</span>
                <p className="font-medium">{metrics.messagesReceived}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Processed:</span>
                <p className="font-medium">{metrics.messagesProcessed}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Avg Latency:</span>
                <p className="font-medium">
                  {metrics.averageLatency.toFixed(0)}ms
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Uptime:</span>
                <p className="font-medium">
                  {formatUptime(metrics.connectionUptime)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
})

// Real-time activity feed component
interface ActivityFeedProps {
  maxItems?: number
  showTimestamps?: boolean
  className?: string
}

export const RealtimeActivityFeed = memo(function RealtimeActivityFeed({
  maxItems = 50,
  showTimestamps = true,
  className,
}: ActivityFeedProps) {
  const { eventQueue } = useEnhancedRealtimeConnection()
  const [displayEvents, setDisplayEvents] = useState<RealtimeEvent[]>([])

  // Update display events when queue changes
  useEffect(() => {
    const processed = eventQueue
      .filter((event) => event.processed)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxItems)

    setDisplayEvents(processed)
  }, [eventQueue, maxItems])

  const getEventIcon = (type: string) => {
    switch (type) {
      case "vote_update":
        return TrendingUp
      case "setlist_change":
        return Activity
      case "user_presence":
        return Users
      default:
        return Zap
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case "vote_update":
        return "text-green-500"
      case "setlist_change":
        return "text-blue-500"
      case "user_presence":
        return "text-purple-500"
      default:
        return "text-gray-500"
    }
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Live Activity
          <Badge variant="secondary">{displayEvents.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {displayEvents.map((event) => {
              const Icon = getEventIcon(event.type)
              const color = getEventColor(event.type)

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <Icon className={cn("h-4 w-4", color)} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {event.type.replace("_", " ")}
                    </p>
                    {showTimestamps && (
                      <p className="text-xs text-muted-foreground">
                        {event.timestamp.toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {displayEvents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

// Real-time presence indicator
interface PresenceIndicatorProps {
  userId?: string
  showCount?: boolean
  className?: string
}

export const RealtimePresenceIndicator = memo(
  function RealtimePresenceIndicator({
    userId: _userId,
    showCount = true,
    className,
  }: PresenceIndicatorProps) {
    const [onlineUsers, setOnlineUsers] = useState<number>(0)
    const [isUserOnline, setIsUserOnline] = useState(false)

    // This would typically sync with your presence system
    useEffect(() => {
      // Simulate presence tracking
      const interval = setInterval(() => {
        setOnlineUsers(Math.floor(Math.random() * 50) + 10)
        setIsUserOnline(Math.random() > 0.3)
      }, 5000)

      return () => clearInterval(interval)
    }, [])

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative">
          <Signal className="h-4 w-4 text-muted-foreground" />
          <div
            className={cn(
              "absolute -top-1 -right-1 w-3 h-3 rounded-full",
              isUserOnline ? "bg-green-500" : "bg-gray-400"
            )}
          />
        </div>

        {showCount && (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{onlineUsers}</span>
          </div>
        )}
      </div>
    )
  }
)
