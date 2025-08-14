"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "~/components/search-bar";
import { Button } from "@repo/design-system/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/design-system/components/ui/dialog";
import { ImportLogsDisplay } from "./import-logs-display";
import type { SearchResultItem } from "~/components/search/search-results-dropdown";

export function AdminSearchBar() {
  const router = useRouter();
  const [selectedArtist, setSelectedArtist] = useState<SearchResultItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleArtistSelect = async (result: SearchResultItem) => {
    // Set the selected artist and open the dialog
    setSelectedArtist(result);
    setIsDialogOpen(true);

    // Also trigger import if it's from Ticketmaster
    if (result.requiresSync && result.externalId) {
      try {
        const response = await fetch("/api/artists/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmAttractionId: result.externalId,
            adminImport: true, // Flag for admin imports to enable detailed logging
          }),
        });

        if (!response.ok) {
          console.error("Failed to trigger import:", await response.text());
        } else {
          const data = await response.json();
          console.log("Import triggered:", data);
        }
      } catch (error) {
        console.error("Error triggering import:", error);
      }
    }
  };

  return (
    <>
      <SearchBar
        placeholder="Search for an artist to view import logs..."
        variant="default"
        onSelect={handleArtistSelect}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-sm md:text-lg pr-6">
              Import Logs - {selectedArtist?.title || "Unknown Artist"}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            {selectedArtist && (
              <ImportLogsDisplay
                artistId={selectedArtist.id}
                artistName={selectedArtist.title}
                externalId={selectedArtist.externalId}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}