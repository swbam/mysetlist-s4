'use client';

import { useState, useTransition, useCallback } from 'react';
import { Check, Users } from 'lucide-react';
import { Button } from '@repo/design-system/components/ui/button';
import { cn } from '@repo/design-system/lib/utils';
import { toast } from 'sonner';
import { toggleAttendance } from '../actions';
import { useRouter } from 'next/navigation';
import { useRealtimeShow } from '@/hooks/use-realtime-show';
import { motion, AnimatePresence } from 'framer-motion';

type AttendanceTrackerProps = {
  showId: string;
  initialCount: number;
  initialIsAttending?: boolean;
  showStatus?: 'upcoming' | 'ongoing' | 'completed';
  onAttendanceChange?: () => void;
};

export function AttendanceTracker({ 
  showId, 
  initialCount, 
  initialIsAttending = false,
  showStatus = 'upcoming',
  onAttendanceChange
}: AttendanceTrackerProps) {
  const router = useRouter();
  const [isAttending, setIsAttending] = useState(initialIsAttending);
  const [optimisticCount, setOptimisticCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();
  
  // Use real-time updates
  const { attendanceCount } = useRealtimeShow({
    showId,
    initialAttendanceCount: initialCount,
    initialStatus: showStatus,
    onAttendanceChange: useCallback((count: number) => {
      // Only update if not in optimistic state
      if (!isPending) {
        setOptimisticCount(count);
      }
    }, [isPending]),
  });
  
  const handleToggleAttendance = () => {
    // Optimistic update
    const newAttending = !isAttending;
    setIsAttending(newAttending);
    setOptimisticCount(prev => newAttending ? prev + 1 : prev - 1);
    
    startTransition(async () => {
      try {
        const result = await toggleAttendance(showId);
        setIsAttending(result.attending);
        
        
        toast.success(
          result.attending 
            ? "You're attending this show!" 
            : "Removed from attendance list"
        );
        
        // Call callback if provided (for AttendeeList)
        onAttendanceChange?.();
        router.refresh();
      } catch (error: any) {
        // Revert optimistic update on error
        setIsAttending(!newAttending);
        setOptimisticCount(attendanceCount);
        
        if (error.message.includes('logged in')) {
          toast.error('Please sign in to mark attendance');
          router.push('/auth/sign-in');
        } else {
          toast.error('Failed to update attendance');
        }
      }
    });
  };
  
  return (
    <div className="flex items-center gap-4">
      <Button
        variant={isAttending ? "default" : "outline"}
        size="lg"
        onClick={handleToggleAttendance}
        disabled={isPending}
        className={cn(
          "gap-2 transition-all",
          isAttending && "bg-green-600 hover:bg-green-700"
        )}
      >
        {isAttending ? (
          <>
            <Check className="h-4 w-4" />
            I was there
          </>
        ) : (
          <>
            <Users className="h-4 w-4" />
            I'm going
          </>
        )}
      </Button>
      
      <div className="flex items-center gap-2 text-muted-foreground">
        <Users className="h-4 w-4" />
        <AnimatePresence mode="wait">
          <motion.span 
            key={optimisticCount}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="font-medium inline-block"
          >
            {optimisticCount}
          </motion.span>
        </AnimatePresence>
        <span>attending</span>
      </div>
    </div>
  );
}