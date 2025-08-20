"use client";

import { useState, useEffect } from "react";
import { ImportProgress } from "./components/import/ImportProgress";
import { ImportButton } from "./components/import/ImportButton";
import { useArtistImport } from "./hooks/use-artist-import";

/**
 * Test component to verify frontend-backend integration
 */
export function TestImportIntegration() {
  const [testArtistId, setTestArtistId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  
  const {
    progress,
    connectionStatus,
    error,
    estimatedTimeRemaining,
    isComplete,
    hasFailed,
    isImporting,
    startImport,
    startMonitoring,
    retry,
  } = useArtistImport();

  const handleImportStart = (artistId: string, slug: string) => {
    console.log("[TestImportIntegration] Import started:", { artistId, slug });
    setTestArtistId(artistId);
    setShowImport(true);
  };

  const handleImportError = (error: string) => {
    console.error("[TestImportIntegration] Import error:", error);
  };

  const testSSEConnection = async () => {
    const testId = "test-artist-123";
    console.log("[TestImportIntegration] Testing SSE connection for:", testId);
    
    try {
      await startImport(testId);
    } catch (err) {
      console.error("[TestImportIntegration] SSE test failed:", err);
    }
  };

  const testAPIEndpoint = async () => {
    const testId = "test-artist-123";
    console.log("[TestImportIntegration] Testing API endpoint for:", testId);
    
    try {
      const response = await fetch(`/api/artists/${testId}/status`);
      const data = await response.json();
      console.log("[TestImportIntegration] API response:", data);
    } catch (err) {
      console.error("[TestImportIntegration] API test failed:", err);
    }
  };

  const testTicketmasterSearch = async () => {
    const query = "Taylor Swift";
    console.log("[TestImportIntegration] Testing Ticketmaster search:", query);
    
    try {
      const response = await fetch(`/api/search/artists?q=${encodeURIComponent(query)}&limit=5`);
      const data = await response.json();
      console.log("[TestImportIntegration] Search response:", data);
    } catch (err) {
      console.error("[TestImportIntegration] Search test failed:", err);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Frontend-Backend Integration Test</h1>
      
      {/* Test Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={testAPIEndpoint}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test API Endpoint
        </button>
        
        <button
          onClick={testSSEConnection}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Test SSE Connection
        </button>
        
        <button
          onClick={testTicketmasterSearch}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Test Search API
        </button>
      </div>

      {/* Import Button */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Import Artist</h2>
        <ImportButton
          onImportStart={handleImportStart}
          onImportError={handleImportError}
          variant="default"
          size="default"
        />
      </div>

      {/* Progress Display */}
      {showImport && testArtistId && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Import Progress</h2>
          <ImportProgress
            artistId={testArtistId}
            onComplete={(data) => {
              console.log("[TestImportIntegration] Import completed:", data);
            }}
            onError={(error) => {
              console.error("[TestImportIntegration] Import error:", error);
            }}
            showTitle={true}
            showEstimatedTime={true}
            autoRetry={true}
          />
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-gray-100 p-4 rounded">
        <h3 className="font-medium mb-2">Connection Status</h3>
        <div className="space-y-1 text-sm">
          <div>Status: <span className="font-mono">{connectionStatus}</span></div>
          <div>Is Importing: <span className="font-mono">{isImporting ? "Yes" : "No"}</span></div>
          <div>Is Complete: <span className="font-mono">{isComplete ? "Yes" : "No"}</span></div>
          <div>Has Failed: <span className="font-mono">{hasFailed ? "Yes" : "No"}</span></div>
          {error && <div>Error: <span className="font-mono text-red-600">{error}</span></div>}
          {estimatedTimeRemaining && (
            <div>ETA: <span className="font-mono">{estimatedTimeRemaining}s</span></div>
          )}
        </div>
      </div>

      {/* Progress Data */}
      {progress && (
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-medium mb-2">Progress Data</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(progress, null, 2)}
          </pre>
        </div>
      )}

      {/* Debug Console */}
      <div className="text-xs text-gray-600">
        Open browser console to see detailed logs and network requests.
      </div>
    </div>
  );
}