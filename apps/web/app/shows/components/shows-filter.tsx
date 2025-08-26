"use client";
import { Button } from "@repo/design-system/button";
import { Calendar } from "@repo/design-system/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/select";
import { addDays, format, startOfWeek } from "date-fns";
import { CalendarIcon, MapPin, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchCities } from "../actions";

export const ShowsFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [city, setCity] = useState(searchParams.get("city") || "all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    searchParams.get("dateFrom")
      ? new Date(searchParams.get("dateFrom")!)
      : {},
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    searchParams.get("dateTo")
      ? new Date(searchParams.get("dateTo")!)
      : {},
  );
  const [orderBy, setOrderBy] = useState(searchParams.get("orderBy") || "date");
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  useEffect(() => {
    // Load available cities
    fetchCities().then((cities) => setAvailableCities(cities));
  }, []);

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (city && city !== "all") {
      params.set("city", city);
    }
    if (dateFrom) {
      params.set("dateFrom", format(dateFrom, "yyyy-MM-dd"));
    }
    if (dateTo) {
      params.set("dateTo", format(dateTo, "yyyy-MM-dd"));
    }
    if (orderBy !== "date") {
      params.set("orderBy", orderBy);
    }

    router.push(`/shows?${params.toString()}`);
  };

  const clearFilters = () => {
    setCity("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setOrderBy("date");
    router.push("/shows");
  };

  const setThisWeekend = () => {
    const now = new Date();
    // Get this weekend (Saturday and Sunday)
    const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
    const weekendStart = addDays(startOfCurrentWeek, 5); // Saturday
    const weekendEnd = addDays(startOfCurrentWeek, 6); // Sunday
    setDateFrom(weekendStart);
    setDateTo(weekendEnd);
  };

  const setNext30Days = () => {
    const now = new Date();
    setDateFrom(now);
    setDateTo(addDays(now, 30));
  };

  const hasActiveFilters =
    (city && city !== "all") || dateFrom || dateTo || orderBy !== "date";

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger>
            <MapPin className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {availableCities.map((cityName) => (
              <SelectItem key={cityName} value={cityName}>
                {cityName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom
                ? dateTo
                  ? `${format(dateFrom, "MMM d")} - ${format(dateTo, "MMM d")}`
                  : format(dateFrom, "PPP")
                : "Date range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="space-y-3 p-3">
              <div>
                <p className="mb-2 font-medium text-sm">From</p>
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </div>
              <div>
                <p className="mb-2 font-medium text-sm">To</p>
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  disabled={(date) => (dateFrom ? date < dateFrom : false)}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Select value={orderBy} onValueChange={setOrderBy}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="trending">Trending</SelectItem>
            <SelectItem value="popularity">Popularity</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button onClick={applyFilters} className="flex-1">
            Apply Filters
          </Button>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="icon"
              onClick={clearFilters}
              title="Clear filters"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <p className="text-muted-foreground text-sm">Quick filters:</p>
        <Button variant="outline" size="sm" onClick={setThisWeekend}>
          This Weekend
        </Button>
        <Button variant="outline" size="sm" onClick={setNext30Days}>
          Next 30 Days
        </Button>
      </div>
    </div>
  );
};
