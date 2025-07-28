import { db, shows } from "@repo/database"
import { Card, CardContent } from "@repo/design-system/components/ui/card"
import { gte, sql } from "drizzle-orm"
import { Calendar, Heart, TrendingUp } from "lucide-react"

interface MyArtistsHeaderProps {
  userId?: string // userId not used anymore, kept for compatibility
}

export async function MyArtistsHeader({ userId }: MyArtistsHeaderProps) {
  // Get general stats since userFollowsArtists table doesn't exist
  const upcomingShowsCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(shows)
    .where(gte(shows.date, new Date().toISOString().substring(0, 10)))

  const stats = [
    {
      label: "Following",
      value: 0, // No following functionality available
      icon: Heart,
      color: "text-pink-600",
    },
    {
      label: "Upcoming Shows",
      value: upcomingShowsCount[0]?.count || 0,
      icon: Calendar,
      color: "text-blue-600",
    },
    {
      label: "This Month",
      value: 0, // Would calculate shows this month
      icon: TrendingUp,
      color: "text-green-600",
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-bold text-3xl">Popular Artists</h1>
        <p className="mt-2 text-muted-foreground">
          Discover trending artists and upcoming shows
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-full bg-muted p-3 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-2xl">{stat.value}</p>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
