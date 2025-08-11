"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { cn } from "@repo/design-system/lib/utils";
import { Search, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LiteSearchProps {
  placeholder?: string;
  className?: string;
}

export function LiteSearch({
  placeholder = "Search artists...",
  className,
}: LiteSearchProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className={cn("relative w-full max-w-lg", className)}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground sm:left-4 sm:h-5 sm:w-5" />
          <Input
            type="search"
            placeholder={placeholder}
            className="pr-10 pl-10 sm:pl-12 h-12 text-base sm:h-14 sm:text-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            inputMode="search"
            aria-label="Search for artists"
          />
          <Button
            type="submit"
            size="sm"
            className="absolute top-1/2 right-1 -translate-y-1/2 h-10 sm:h-12"
          >
            Search
          </Button>
        </div>
      </form>
    </div>
  );
}