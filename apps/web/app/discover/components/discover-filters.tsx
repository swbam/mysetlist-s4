"use client";

import { Button } from "@repo/design-system/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/select";
import { Calendar, MapPin, Music, TrendingUp, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function DiscoverFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const timeframe = searchParams.get("timeframe") || "week";
  const category = searchParams.get("category") || "all";
  const location = searchParams.get("location") || "";

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      router.push(`/discover?${params.toString()}`);
    },
    [router, searchParams],
  );

  const clearFilters = useCallback(() => {
    router.push("/discover");
  }, [router]);

  const hasActiveFilters =
    timeframe !== "week" || category !== "all" || location;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">Filters:</span>
      </div>

      <Select
        value={timeframe}
        onValueChange={(value) => updateFilter("timeframe", value)}
      >
        <SelectTrigger className="w-[140px]">
          <Calendar className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Timeframe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Today</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="all">All Time</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={category}
        onValueChange={(value) => updateFilter("category", value)}
      >
        <SelectTrigger className="w-[140px]">
          <Music className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="artists">Artists</SelectItem>
          <SelectItem value="shows">Shows</SelectItem>
          <SelectItem value="venues">Venues</SelectItem>
          <SelectItem value="setlists">Setlists</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={location || "all"}
        onValueChange={(value) =>
          updateFilter("location", value === "all" ? "" : value)
        }
      >
        <SelectTrigger className="w-[160px]">
          <MapPin className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Location" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locations</SelectItem>
          <SelectItem value="new-york">New York</SelectItem>
          <SelectItem value="los-angeles">Los Angeles</SelectItem>
          <SelectItem value="chicago">Chicago</SelectItem>
          <SelectItem value="london">London</SelectItem>
          <SelectItem value="tokyo">Tokyo</SelectItem>
          <SelectItem value="sydney">Sydney</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="ml-auto"
        >
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
