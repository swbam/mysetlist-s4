'use client';

import { useSyncStatus } from '~/hooks/use-sync-status';
import { Loader2, Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@repo/design-system/lib/utils';

interface SyncStatusIndicatorProps {
  jobId: string | null;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

export function SyncStatusIndicator({ 
  jobId, 
  size = 'md',
  showDetails = false,
  className 
}: SyncStatusIndicatorProps) {
  const { 
    job, 
    progress, 
    isLoading, 
    error, 
    currentStep, 
    overallProgress, 
    isCompleted, 
    isFailed 
  } = useSyncStatus(jobId);

  if (!jobId || isLoading) {
    return null;
  }

  if (isCompleted) {
    return (
      <div className={cn("flex items-center gap-2 text-green-600", className)}>
        <Check className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'}`} />
        {showDetails && <span className="text-sm">Sync completed</span>}
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className={cn("flex items-center gap-2 text-red-600", className)}>
        <X className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'}`} />
        {showDetails && <span className="text-sm">Sync failed</span>}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center gap-2 text-amber-600", className)}>
        <AlertCircle className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'}`} />
        {showDetails && <span className="text-sm">Sync error</span>}
      </div>
    );
  }

  // Currently syncing
  return (
    <div className={cn("flex items-center gap-2 text-blue-600", className)}>
      <Loader2 className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'} animate-spin`} />
      {showDetails && (
        <div className="flex flex-col gap-1">
          <span className="text-sm">
            {currentStep?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Syncing...'}
          </span>
          {overallProgress > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-16 bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-blue-600 h-1 rounded-full transition-all duration-300" 
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{overallProgress}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// More detailed sync progress component for dedicated sync views
export function SyncProgressDetails({ jobId }: { jobId: string | null }) {
  const { 
    job, 
    progress, 
    isLoading, 
    error, 
    currentStep, 
    overallProgress, 
    isCompleted, 
    isFailed 
  } = useSyncStatus(jobId);

  if (!jobId || isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading sync status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800 mb-2">
          <AlertCircle className="h-4 w-4" />
          <span className="font-medium">Sync Error</span>
        </div>
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-800">
          <Check className="h-4 w-4" />
          <span className="font-medium">Sync Completed</span>
        </div>
        <p className="text-green-700 text-sm mt-1">
          Artist data has been successfully imported
        </p>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800 mb-2">
          <X className="h-4 w-4" />
          <span className="font-medium">Sync Failed</span>
        </div>
        {job?.error && (
          <p className="text-red-700 text-sm">{job.error}</p>
        )}
      </div>
    );
  }

  // Active sync progress
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="font-medium text-blue-800">Importing Artist Data</span>
        </div>
        {overallProgress > 0 && (
          <span className="text-sm text-blue-700">{overallProgress}%</span>
        )}
      </div>
      
      {overallProgress > 0 && (
        <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      )}
      
      {currentStep && (
        <p className="text-blue-700 text-sm">
          {currentStep.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </p>
      )}

      {progress.length > 0 && (
        <div className="mt-3 space-y-1">
          {progress.slice(0, 3).map((step, index) => (
            <div key={index} className="flex items-center gap-2 text-xs text-blue-600">
              {step.status === 'completed' ? (
                <Check className="h-3 w-3" />
              ) : step.status === 'failed' ? (
                <X className="h-3 w-3 text-red-500" />
              ) : (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              <span>{step.message || step.step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}