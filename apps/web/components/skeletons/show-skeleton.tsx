"use client";

import {
  Card,
  CardContent,
  CardHeader,
} from "@repo/design-system/card";
import { Skeleton } from "@repo/design-system/skeleton";

export function ShowCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Date column */}
          <div className="flex-shrink-0 text-center w-16">
            <Skeleton className="h-6 w-12 mb-1 mx-auto" />
            <Skeleton className="h-4 w-8 mx-auto" />
          </div>

          {/* Show details */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>

          {/* Action button */}
          <Skeleton className="h-9 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ShowListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ShowCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ShowDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Show Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Venue Info */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-20" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setlists */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <SetlistCardSkeleton />
        <SetlistCardSkeleton />
      </div>
    </div>
  );
}

function SetlistCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-2 border rounded"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
