import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { cn } from "@repo/design-system/lib/utils";

interface ContentSkeletonProps {
  count?: number;
  className?: string;
  type?: "artist" | "show" | "card";
}

export function ContentSkeleton({
  count = 4,
  className,
  type = "card",
}: ContentSkeletonProps) {
  if (type === "artist") {
    return (
      <div
        className={cn(
          "grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6",
          className,
        )}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[3/4] rounded-xl" />
            <Skeleton className="mx-auto h-4 w-3/4" />
            <Skeleton className="mx-auto h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "show") {
    return (
      <div
        className={cn(
          "grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4",
          className,
        )}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-video rounded-lg" />
            <div className="space-y-2 p-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-48 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
