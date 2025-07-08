'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
} from '@repo/design-system/components/ui/card';
import { motion } from 'framer-motion';
import {
  Calendar,
  ChevronRight,
  Heart,
  MapPin,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export function FeaturedContent() {
  // This would normally come from props/API
  const featuredShow = {
    id: '1',
    name: 'Taylor Swift | The Eras Tour',
    venue: 'SoFi Stadium, Los Angeles',
    date: '2024-08-05',
    imageUrl: '/api/placeholder/800/600',
    attendees: 70000,
    votesCount: 125000,
  };

  const topVotedSongs = [
    {
      id: '1',
      title: 'Anti-Hero',
      artist: 'Taylor Swift',
      votes: 45231,
      percentage: 89,
    },
    {
      id: '2',
      title: 'Blank Space',
      artist: 'Taylor Swift',
      votes: 42100,
      percentage: 83,
    },
    {
      id: '3',
      title: 'Shake It Off',
      artist: 'Taylor Swift',
      votes: 38500,
      percentage: 76,
    },
    {
      id: '4',
      title: 'Love Story',
      artist: 'Taylor Swift',
      votes: 35200,
      percentage: 69,
    },
  ];

  const upcomingHighlights = [
    {
      id: '1',
      artist: 'The Weeknd',
      venue: 'Madison Square Garden',
      date: '2024-07-20',
      ticketsLeft: 523,
    },
    {
      id: '2',
      artist: 'Drake',
      venue: 'United Center',
      date: '2024-07-22',
      ticketsLeft: 1200,
    },
    {
      id: '3',
      artist: 'Olivia Rodrigo',
      venue: 'The Forum',
      date: '2024-07-25',
      ticketsLeft: 89,
    },
  ];

  return (
    <section className="relative py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
            Featured This Week
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            The most anticipated shows and hottest votes from the MySetlist
            community
          </p>
        </motion.div>

        {/* Featured content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main featured show - spans 2 columns on large screens */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <Card className="h-full overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:bg-card/80">
              <div className="relative h-64 overflow-hidden md:h-96">
                <Image
                  src={featuredShow.imageUrl}
                  alt={featuredShow.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                {/* Overlay content */}
                <div className="absolute right-0 bottom-0 left-0 p-6 md:p-8">
                  <Badge className="mb-3 border-0 bg-primary/90 backdrop-blur-sm">
                    <Trophy className="mr-1 h-3 w-3" />
                    Most Voted Show This Week
                  </Badge>
                  <h3 className="mb-2 font-bold text-2xl text-white md:text-3xl">
                    {featuredShow.name}
                  </h3>
                  <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-white/80">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {featuredShow.venue}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(featuredShow.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {featuredShow.attendees.toLocaleString()} attending
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button size="lg" asChild>
                      <Link href={`/shows/${featuredShow.id}`}>
                        View Setlist Predictions
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <div className="text-white">
                      <span className="font-bold text-2xl">
                        {(featuredShow.votesCount / 1000).toFixed(0)}K
                      </span>
                      <span className="ml-1 text-sm text-white/70">
                        votes cast
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Top voted songs */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Top Voted Songs</h3>
                  <Badge variant="secondary">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Live Results
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {topVotedSongs.map((song, index) => (
                  <div key={song.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-2xl text-muted-foreground">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{song.title}</p>
                          <p className="text-muted-foreground text-xs">
                            {song.artist}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">
                          {song.percentage}%
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {(song.votes / 1000).toFixed(1)}K votes
                        </p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${song.percentage}%` }}
                        transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                        className="h-full bg-gradient-to-r from-primary to-blue-500"
                      />
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="mt-4 w-full" asChild>
                  <Link href="/voting">
                    <Heart className="mr-2 h-4 w-4" />
                    Vote for More Songs
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Upcoming highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-3"
          >
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-xl">
                    Upcoming Shows to Watch
                  </h3>
                  <Link
                    href="/shows"
                    className="flex items-center gap-1 text-primary text-sm hover:text-primary/80"
                  >
                    View All
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {upcomingHighlights.map((show, index) => (
                    <motion.div
                      key={show.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                    >
                      <Link
                        href={`/artists/${show.artist.toLowerCase().replace(' ', '-')}`}
                      >
                        <Card className="group border-border/30 transition-all duration-300 hover:bg-card/80">
                          <CardContent className="p-4">
                            <div className="mb-3 flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold transition-colors group-hover:text-primary">
                                  {show.artist}
                                </h4>
                                <p className="mt-1 text-muted-foreground text-sm">
                                  {show.venue}
                                </p>
                              </div>
                              {show.ticketsLeft < 100 && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  {show.ticketsLeft} left
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(show.date).toLocaleDateString()}
                              </span>
                              <span className="font-medium text-primary">
                                Vote Now →
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
