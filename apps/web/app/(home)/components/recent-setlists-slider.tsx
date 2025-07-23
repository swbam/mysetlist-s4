'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Calendar, Lock, Music, ThumbsDown, ThumbsUp, Trophy, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import {
  ContentSlider,
  ContentSliderItem,
} from '~/components/ui/content-slider';
import type { RecentSetlist } from '~/types/api';

interface RecentSetlistsSliderProps {
  setlists: RecentSetlist[];
}

// Helper function to format vote counts
const formatVoteCount = (num: number) => {
  if (Math.abs(num) >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

// Helper function to get setlist type badge
const getSetlistTypeBadge = (type: 'predicted' | 'actual', isLocked: boolean) => {
  if (type === 'actual') {
    return (
      <Badge className="border-0 bg-green-500/90 text-white shadow-lg">
        <Trophy className="mr-1 h-3 w-3" />
        Actual
      </Badge>
    );
  }
  
  if (isLocked) {
    return (
      <Badge className="border-0 bg-orange-500/90 text-white shadow-lg">
        <Lock className="mr-1 h-3 w-3" />
        Locked
      </Badge>
    );
  }
  
  return (
    <Badge className="border-0 bg-blue-500/90 text-white shadow-lg">
      <Music className="mr-1 h-3 w-3" />
      Predicted
    </Badge>
  );
};

function RecentSetlistsSlider({ setlists }: RecentSetlistsSliderProps) {
  if (!setlists || setlists.length === 0) {
    return null;
  }

  return (
    <ContentSlider
      title="Recent Setlists"
      subtitle="Community predictions and actual setlists from recent shows"
      viewAllLink="/setlists"
      viewAllText="Explore All Setlists"
      autoPlay={true}
      autoPlayInterval={5000}
      itemsPerView={{
        mobile: 1.1,
        tablet: 2.2,
        desktop: 3.2,
        wide: 4.5,
      }}
      showDots={true}
      className="bg-gradient-to-b from-background via-background/95 to-background"
    >
      {setlists.map((setlist, index) => (
        <ContentSliderItem key={setlist.id}>
          <Link href={`/shows/${setlist.show.slug}`} className="block h-full">
            <Card className="group h-full overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-card/80 hover:shadow-xl">
              <CardContent className="flex h-full flex-col p-0">
                {/* Header image with artist */}
                <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/10 to-purple-600/10">
                  {setlist.artist.imageUrl ? (
                    <>
                      <Image
                        src={setlist.artist.imageUrl}
                        alt={setlist.artist.name}
                        fill
                        sizes="(max-width: 640px) 90vw, (max-width: 768px) 45vw, (max-width: 1024px) 35vw, 280px"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl opacity-30">🎵</div>
                        <div className="mt-1 font-semibold text-sm text-muted-foreground/60">
                          {setlist.artist.name}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Setlist type badge */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="absolute top-3 left-3"
                  >
                    {getSetlistTypeBadge(setlist.type, setlist.isLocked)}
                  </motion.div>

                  {/* Date overlay */}
                  {setlist.show.date && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/70 px-3 py-1.5 backdrop-blur-sm">
                      <Calendar className="h-3.5 w-3.5 text-white/80" />
                      <span className="font-medium text-sm text-white">
                        {formatDistanceToNow(new Date(setlist.show.date), { addSuffix: true })}
                      </span>
                    </div>
                  )}

                  {/* Vote indicator */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    {setlist.voteCount !== 0 && (
                      <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 backdrop-blur-sm ${
                        setlist.voteCount > 0 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {setlist.voteCount > 0 ? (
                          <ThumbsUp className="h-3 w-3" />
                        ) : (
                          <ThumbsDown className="h-3 w-3" />
                        )}
                        <span className="font-medium text-xs">
                          {formatVoteCount(Math.abs(setlist.voteCount))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content section */}
                <div className="flex-1 space-y-2 p-3 sm:space-y-3 sm:p-4">
                  <div>
                    <h3 className="line-clamp-2 font-semibold text-base transition-colors group-hover:text-primary sm:text-lg">
                      {setlist.name}
                    </h3>
                    <p className="mt-0.5 text-muted-foreground text-xs sm:mt-1 sm:text-sm">
                      by {setlist.artist.name}
                    </p>
                  </div>

                  {/* Venue and show info */}
                  {setlist.venue.name && (
                    <p className="line-clamp-1 text-muted-foreground text-sm">
                      {setlist.venue.name}
                      {setlist.venue.city && `, ${setlist.venue.city}`}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3 text-xs sm:text-sm">
                      <div className="flex items-center gap-1">
                        <Music className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{setlist.songCount}</span>
                        <span className="text-muted-foreground">songs</span>
                      </div>
                      
                      {setlist.totalVotes > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{setlist.totalVotes}</span>
                          <span className="text-muted-foreground">votes</span>
                        </div>
                      )}
                    </div>

                    {/* Accuracy score for predicted setlists */}
                    {setlist.type === 'predicted' && setlist.accuracyScore > 0 && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-muted-foreground">Accuracy:</span>
                        <span className="font-medium text-primary">
                          {setlist.accuracyScore}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Creator info */}
                  {setlist.creator && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={setlist.creator.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {setlist.creator.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground text-xs">
                        Created by {setlist.creator.name}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        </ContentSliderItem>
      ))}
    </ContentSlider>
  );
}

export default RecentSetlistsSlider;