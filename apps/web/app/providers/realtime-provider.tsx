'use client';

import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { createClient } from '~/lib/supabase/client';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface RealtimeContextType {
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType>({
  connectionStatus: 'disconnected',
  isConnected: false,
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
  const supabase = createClient();

  useEffect(() => {
    // Create a presence channel to monitor connection status
    const presenceChannel = supabase.channel('global-presence');

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        setConnectionStatus('connected');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error');
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        } else {
          setConnectionStatus('connecting');
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [supabase]);

  const value: RealtimeContextType = {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}
