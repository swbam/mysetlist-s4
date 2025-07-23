'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { cn } from '@repo/design-system/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Radio,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  WifiOff,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '~/lib/supabase/client';

interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  latency?: number;
  lastUpdate?: Date;
  activeSubscriptions: number;
  reconnectAttempts: number;
}

export function MobileRealtimeStatus() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'connecting',
    activeSubscriptions: 0,
    reconnectAttempts: 0,
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>(
    typeof window !== 'undefined' && navigator.onLine ? 'online' : 'offline'
  );
  const [isMounted, setIsMounted] = useState(false);

  const supabase = createClient();

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Ensure we're on the client before accessing window
    if (typeof window === 'undefined' || !isMounted) {
      return;
    }

    let latencyInterval: NodeJS.Timeout;
    let reconnectTimer: NodeJS.Timeout | undefined;

    // Monitor network status
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor Supabase realtime connection
    const channel = supabase.channel('connection-monitor');

    // Track connection events
    channel
      .on('system', { event: 'realtime' }, (payload) => {
        switch (payload.type) {
          case 'connected':
            setConnectionStatus((prev) => ({
              ...prev,
              status: 'connected',
              lastUpdate: new Date(),
              reconnectAttempts: 0,
            }));
            break;
          case 'connecting':
            setConnectionStatus((prev) => ({
              ...prev,
              status: 'connecting',
            }));
            break;
          case 'disconnected':
            setConnectionStatus((prev) => ({
              ...prev,
              status: 'disconnected',
              reconnectAttempts: prev.reconnectAttempts + 1,
            }));
            break;
          case 'error':
            setConnectionStatus((prev) => ({
              ...prev,
              status: 'error',
            }));
            break;
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus((prev) => ({
            ...prev,
            status: 'connected',
            activeSubscriptions: prev.activeSubscriptions + 1,
            lastUpdate: new Date(),
          }));
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus((prev) => ({
            ...prev,
            status: 'error',
          }));
        }
      });

    // Measure latency periodically
    if (connectionStatus.status === 'connected') {
      latencyInterval = setInterval(async () => {
        const start = Date.now();
        try {
          // Simple ping by getting current time
          await supabase.from('shows').select('count').limit(1).single();
          const latency = Date.now() - start;

          setConnectionStatus((prev) => ({
            ...prev,
            latency,
            lastUpdate: new Date(),
          }));
        } catch (_error) {}
      }, 10000); // Check every 10 seconds
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (latencyInterval) {
        clearInterval(latencyInterval);
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      supabase.removeChannel(channel);
    };
  }, [connectionStatus.status, isMounted]);

  const getStatusIcon = () => {
    if (networkStatus === 'offline') {
      return WifiOff;
    }

    switch (connectionStatus.status) {
      case 'connected': {
        if (connectionStatus.latency) {
          if (connectionStatus.latency < 100) {
            return SignalHigh;
          }
          if (connectionStatus.latency < 300) {
            return SignalMedium;
          }
          return SignalLow;
        }
        return CheckCircle;
      }
      case 'connecting':
        return Loader2;
      case 'disconnected':
        return Radio;
      case 'error':
        return AlertCircle;
      default:
        return Signal;
    }
  };

  const getStatusColor = () => {
    if (networkStatus === 'offline') {
      return 'bg-gray-500';
    }

    switch (connectionStatus.status) {
      case 'connected': {
        if (connectionStatus.latency) {
          if (connectionStatus.latency < 100) {
            return 'bg-green-500';
          }
          if (connectionStatus.latency < 300) {
            return 'bg-yellow-500';
          }
          return 'bg-orange-500';
        }
        return 'bg-green-500';
      }
      case 'connecting':
        return 'bg-blue-500';
      case 'disconnected':
        return 'bg-red-500';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    if (networkStatus === 'offline') {
      return 'Offline';
    }

    switch (connectionStatus.status) {
      case 'connected':
        return 'Live';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const handleRetry = async () => {
    setConnectionStatus((prev) => ({ ...prev, status: 'connecting' }));

    try {
      // Force reconnection
      await supabase.realtime.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await supabase.realtime.connect();
    } catch (_error) {
      setConnectionStatus((prev) => ({ ...prev, status: 'error' }));
    }
  };

  const StatusIcon = getStatusIcon();

  // Don't render until mounted to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 z-40 md:relative md:right-auto md:bottom-auto">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="relative"
        >
          {/* Compact Status Indicator */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'h-8 gap-1 border px-2 shadow-lg backdrop-blur-sm',
              'md:h-6 md:gap-0.5 md:px-1.5',
              connectionStatus.status === 'connected' &&
                'border-green-200 bg-green-50 hover:bg-green-100',
              connectionStatus.status === 'error' &&
                'border-red-200 bg-red-50 hover:bg-red-100',
              connectionStatus.status === 'disconnected' &&
                'border-red-200 bg-red-50 hover:bg-red-100',
              networkStatus === 'offline' &&
                'border-gray-200 bg-gray-50 hover:bg-gray-100'
            )}
          >
            {/* Animated Status Dot */}
            <div className="relative">
              <motion.div
                className={cn('h-2 w-2 rounded-full', getStatusColor())}
                animate={
                  connectionStatus.status === 'connecting'
                    ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }
                    : {}
                }
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
              />

              {/* Connection strength rings for connected state */}
              {connectionStatus.status === 'connected' && (
                <motion.div
                  className="absolute inset-0 h-2 w-2 rounded-full border border-green-400"
                  animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                />
              )}
            </div>

            {/* Status Icon (mobile only) */}
            <StatusIcon
              className={cn(
                'h-3 w-3 md:hidden',
                connectionStatus.status === 'connecting' && 'animate-spin'
              )}
            />

            {/* Status Text (desktop) */}
            <span className="hidden font-medium text-xs md:inline">
              {getStatusText()}
            </span>

            {/* Latency (if available) */}
            {connectionStatus.latency &&
              connectionStatus.status === 'connected' && (
                <Badge variant="secondary" className="h-4 px-1 text-xs md:h-3">
                  {connectionStatus.latency}ms
                </Badge>
              )}
          </Button>

          {/* Expanded Status Panel (mobile only) */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 bottom-full mb-2 min-w-[200px] rounded-lg border bg-background p-3 shadow-lg md:hidden"
              >
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Connection Status</span>
                    <Badge
                      variant={
                        connectionStatus.status === 'connected'
                          ? 'default'
                          : 'destructive'
                      }
                      className="text-xs"
                    >
                      {getStatusText()}
                    </Badge>
                  </div>

                  {connectionStatus.latency && (
                    <div className="flex items-center justify-between">
                      <span>Latency</span>
                      <span className="font-mono">
                        {connectionStatus.latency}ms
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span>Network</span>
                    <span
                      className={cn(
                        'capitalize',
                        networkStatus === 'online'
                          ? 'text-green-600'
                          : 'text-red-600'
                      )}
                    >
                      {networkStatus}
                    </span>
                  </div>

                  {connectionStatus.lastUpdate && (
                    <div className="flex items-center justify-between">
                      <span>Last Update</span>
                      <span className="font-mono">
                        {connectionStatus.lastUpdate.toLocaleTimeString()}
                      </span>
                    </div>
                  )}

                  {connectionStatus.reconnectAttempts > 0 && (
                    <div className="flex items-center justify-between">
                      <span>Reconnect Attempts</span>
                      <span>{connectionStatus.reconnectAttempts}</span>
                    </div>
                  )}

                  {connectionStatus.status !== 'connected' &&
                    networkStatus === 'online' && (
                      <Button
                        size="sm"
                        onClick={handleRetry}
                        className="h-7 w-full text-xs"
                        disabled={connectionStatus.status === 'connecting'}
                      >
                        {connectionStatus.status === 'connecting' ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          'Retry Connection'
                        )}
                      </Button>
                    )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
