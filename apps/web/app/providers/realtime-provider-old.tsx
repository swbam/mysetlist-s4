'use client';

import React, {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { createClient } from '~/lib/supabase/client';
import { AlertCircle } from 'lucide-react';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface RealtimeContextType {
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  error?: Error;
  retry: () => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  connectionStatus: 'disconnected',
  isConnected: false,
  retry: () => {},
});

export function useRealtimeConnection() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error(
      'useRealtimeConnection must be used within RealtimeProvider'
    );
  }
  return context;
}

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<Error>();
  const [retryCount, setRetryCount] = useState(0);

  const connectToRealtime = useCallback(() => {
    try {
      const supabase = createClient();
      
      // Clear any previous error
      setError(undefined);
      setConnectionStatus('connecting');

      // Create a presence channel to monitor connection status
      const presenceChannel = supabase.channel('global-presence');

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          setConnectionStatus('connected');
          setRetryCount(0); // Reset retry count on successful connection
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            setRetryCount(0);
          } else if (status === 'CHANNEL_ERROR') {
            setConnectionStatus('error');
            setError(new Error('Failed to connect to realtime channel'));
          } else if (status === 'CLOSED') {
            setConnectionStatus('disconnected');
          } else {
            setConnectionStatus('connecting');
          }
        });

      return () => {
        try {
          supabase.removeChannel(presenceChannel);
        } catch (err) {
          console.error('Error removing channel:', err);
        }
      };
    } catch (err) {
      console.error('Error in RealtimeProvider:', err);
      setConnectionStatus('error');
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      return undefined;
    }
  }, [retryCount]);

  useEffect(() => {
    const cleanup = connectToRealtime();
    return () => {
      if (cleanup) cleanup();
    };
  }, [connectToRealtime]);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  const value: RealtimeContextType = {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    ...(error !== undefined && { error }),
    retry,
  };

  // Show error UI if connection failed and we're not in a connecting state
  if (connectionStatus === 'error' && error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-yellow-500" />
          <h2 className="mb-2 text-xl font-semibold">Realtime Connection Issue</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Unable to establish realtime connection. The app will continue to work but live updates will be disabled.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={retry}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Retry Connection
            </button>
            <button
              onClick={() => setConnectionStatus('disconnected')}
              className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
            >
              Continue Without Realtime
            </button>
          </div>
          {process.env['NODE_ENV'] === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Error details
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                {error.toString()}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  return React.createElement(
    RealtimeContext.Provider as any,
    { value },
    children
  );
}
