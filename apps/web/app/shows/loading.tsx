import { Skeleton } from "@repo/design-system";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system";
import { List } from "lucide-react";
import { ShowListSkeleton } from "~/components/loading-states";

export default function ShowsLoading() {
  return (
    <div className="flex flex-col gap-8 py-8 md:py-16">
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h1 className="font-regular text-4xl tracking-tighter md:text-6xl">
              Upcoming Shows
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Discover live music happening near you and around the world
            </p>
          </div>

          {/* Filter skeleton */}
          <div className="flex gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>

          <Tabs defaultValue="list" className="w-full">
            <TabsList className="w-full max-w-[200px]">
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
            </TabsList>
            <TabsContent value="list" className="mt-6">
              <ShowListSkeleton count={6} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
