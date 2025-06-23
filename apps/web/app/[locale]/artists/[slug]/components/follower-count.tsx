'use client';

import { formatNumber } from '@/lib/utils';
import { useRealtimeArtist } from '@/hooks/use-realtime-artist';
import { motion, AnimatePresence } from 'framer-motion';

interface FollowerCountProps {
  initialCount: number;
  artistId: string;
}

export function FollowerCount({ initialCount, artistId }: FollowerCountProps) {
  const { followerCount } = useRealtimeArtist({
    artistId,
    initialFollowerCount: initialCount,
  });

  return (
    <AnimatePresence mode="wait">
      <motion.span 
        key={followerCount}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="inline-block"
      >
        {formatNumber(followerCount)} followers
      </motion.span>
    </AnimatePresence>
  );
}