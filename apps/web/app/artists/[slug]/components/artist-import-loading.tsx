"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Loader2, Music, Calendar, MapPin, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface ArtistImportLoadingProps {
  artistName: string;
  artistId?: string;
}

interface ImportStatusData {
  stage: 'initializing' | 'fetching-artist' | 'syncing-identifiers' | 'importing-songs' | 'importing-shows' | 'creating-setlists' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  estimatedTimeRemaining?: number;
}

const STAGE_LABELS = {
  'initializing': 'Initializing',
  'fetching-artist': 'Fetching Artist',
  'syncing-identifiers': 'Syncing Data',
  'importing-songs': 'Importing Songs',
  'importing-shows': 'Importing Shows',
  'creating-setlists': 'Creating Setlists',
  'completed': 'Completed',
  'failed': 'Failed'
};

const STAGE_ICONS = {
  'initializing': Loader2,
  'fetching-artist': Loader2,
  'syncing-identifiers': Loader2,
  'importing-songs': Music,
  'importing-shows': Calendar,
  'creating-setlists': MapPin,
  'completed': CheckCircle,
  'failed': XCircle
};

export function ArtistImportLoading({ artistName, artistId }: ArtistImportLoadingProps) {
  const [importStatus, setImportStatus] = useState<ImportStatusData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState("Importing artist data...");
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 30; // 5 minutes of polling

  // Fallback loading messages when real-time status isn't available
  useEffect(() => {
    const messages = [
      "Importing artist data...",
      "Fetching song catalog...",
      "Loading upcoming shows...",
      "Setting up venues...",
      "Almost ready..."
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setFallbackMessage(messages[index] || "Importing artist data...");
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Real-time status updates when artistId is available
  useEffect(() => {
    if (!artistId) return;

    let pollInterval: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/artists/${artistId}/import-status`);
        if (response.ok) {
          const status = await response.json();
          setImportStatus(status);
          setIsConnected(true);
          setRetryCount(0); // Reset retry count on success

          // If completed, refresh the page after a short delay
          if (status.stage === 'completed') {
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
        } else if (response.status === 404) {
          // Import status not found - might be completed or never started
          console.warn('Import status not found, checking if artist is complete...');
          setIsConnected(false);
          
          // Check if this might be a completed import by trying to access the artist page
          setTimeout(() => {
            window.location.reload();
          }, 5000);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.warn('Failed to fetch import status:', error);
        setIsConnected(false);
        setRetryCount(prev => prev + 1);
        
        // Stop polling after too many failures
        if (retryCount >= maxRetries) {
          console.warn('Max retries reached, assuming import completed');
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      }
    };

    // Start polling immediately, then every 2 seconds
    pollStatus();
    pollInterval = setInterval(pollStatus, 2000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [artistId, retryCount, maxRetries]);

  const displayMessage = importStatus?.message || fallbackMessage;
  const displayProgress = importStatus?.progress || 0;
  const isError = importStatus?.stage === 'failed';
  const isCompleted = importStatus?.stage === 'completed';
  const currentStage = importStatus?.stage || 'initializing';
  const Icon = STAGE_ICONS[currentStage];

  // Calculate estimated time remaining
  const getEstimatedTimeRemaining = () => {
    if (!importStatus?.startedAt) return null;
    
    const startTime = new Date(importStatus.startedAt).getTime();
    const now = Date.now();
    const elapsed = now - startTime;
    const progress = importStatus.progress || 1;
    
    if (progress < 5) return null; // Not enough data
    
    const totalEstimated = (elapsed / progress) * 100;
    const remaining = Math.max(0, totalEstimated - elapsed);
    
    return Math.round(remaining / 1000); // Convert to seconds
  };

  const estimatedSeconds = getEstimatedTimeRemaining();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto text-center">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Icon className={`h-6 w-6 ${
                  isError ? 'text-red-500' : 
                  isCompleted ? 'text-green-500' : 
                  'animate-spin text-blue-500'
                }`} />
                {artistName}
              </CardTitle>
              
              <Badge variant={
                isError ? 'destructive' : 
                isCompleted ? 'default' : 
                'secondary'
              }>
                {STAGE_LABELS[currentStage]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg font-medium">{displayMessage}</p>
            
            {/* Progress Bar */}
            {importStatus && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Import Progress</span>
                  <span>{Math.round(displayProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${displayProgress}%` }}
                  ></div>
                </div>
                
                {estimatedSeconds && estimatedSeconds > 5 && (
                  <div className="text-xs text-gray-500 text-center">
                    Estimated time remaining: {Math.round(estimatedSeconds / 60)}m {estimatedSeconds % 60}s
                  </div>
                )}
              </div>
            )}
            
            {/* Error Message */}
            {isError && importStatus?.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Import Failed</span>
                </div>
                <p className="text-red-600 text-sm mt-1">{importStatus.error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                >
                  Retry Import
                </button>
              </div>
            )}
            
            {/* Import Categories with Stage Indicators */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center gap-2">
                <Music className={`h-8 w-8 ${
                  currentStage === 'importing-songs' ? 'text-blue-500 animate-pulse' : 
                  ['importing-shows', 'creating-setlists', 'completed'].includes(currentStage) ? 'text-green-500' :
                  'text-gray-400'
                }`} />
                <span className="text-sm text-gray-600">Songs</span>
                {['importing-shows', 'creating-setlists', 'completed'].includes(currentStage) && (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                )}
              </div>
              <div className="flex flex-col items-center gap-2">
                <Calendar className={`h-8 w-8 ${
                  currentStage === 'importing-shows' ? 'text-blue-500 animate-pulse' : 
                  ['creating-setlists', 'completed'].includes(currentStage) ? 'text-green-500' :
                  'text-gray-400'
                }`} />
                <span className="text-sm text-gray-600">Shows</span>
                {['creating-setlists', 'completed'].includes(currentStage) && (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                )}
              </div>
              <div className="flex flex-col items-center gap-2">
                <MapPin className={`h-8 w-8 ${
                  currentStage === 'creating-setlists' ? 'text-blue-500 animate-pulse' : 
                  currentStage === 'completed' ? 'text-green-500' :
                  'text-gray-400'
                }`} />
                <span className="text-sm text-gray-600">Venues</span>
                {currentStage === 'completed' && (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                )}
              </div>
            </div>
            
            {/* Status Footer */}
            <div className="text-sm text-gray-500 space-y-1">
              <div>This usually takes 30-60 seconds. Please wait while we import all the data.</div>
              {artistId && (
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-orange-500'}`} />
                  <span className="text-xs">
                    {isConnected ? 'Connected to import service' : 
                     retryCount > 15 ? 'Connection lost - checking completion...' :
                     'Connecting to import service...'}
                  </span>
                </div>
              )}
              
              {!artistId && (
                <div className="text-xs text-orange-600">
                  Real-time progress unavailable - using fallback display
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
