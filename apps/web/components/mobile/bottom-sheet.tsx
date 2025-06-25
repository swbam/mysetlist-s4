'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Button } from '@repo/design-system/components/ui/button';
import { X, GripHorizontal } from 'lucide-react';
import { cn } from '@repo/design-system/lib/utils';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  height?: 'auto' | 'half' | 'full';
  draggable?: boolean;
  showHandle?: boolean;
  showCloseButton?: boolean;
  snapPoints?: number[]; // Array of percentages (0-100)
  onSnapChange?: (snapIndex: number) => void;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  description,
  className,
  height = 'auto',
  draggable = true,
  showHandle = true,
  showCloseButton = true,
  snapPoints = [25, 50, 90],
  onSnapChange
}: BottomSheetProps) {
  const [currentSnapIndex, setCurrentSnapIndex] = useState(1); // Start at middle snap point
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  
  // Calculate height based on props and snap points
  const getHeight = () => {
    if (height === 'full') return '100vh';
    if (height === 'half') return '50vh';
    if (snapPoints && snapPoints.length > 0) {
      return `${snapPoints[currentSnapIndex]}vh`;
    }
    return 'auto';
  };

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.touchAction = 'auto';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.touchAction = 'auto';
    };
  }, [isOpen]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);
    
    if (!draggable || !snapPoints) return;

    const { offset, velocity } = info;
    const sheetHeight = sheetRef.current?.offsetHeight || 0;
    const viewportHeight = window.innerHeight;
    
    // Calculate current position as percentage
    const currentPosition = ((viewportHeight - sheetHeight) / viewportHeight) * 100;
    
    // Determine which snap point to go to based on drag direction and velocity
    let targetSnapIndex = currentSnapIndex;
    
    if (velocity.y > 300) {
      // Fast downward swipe - go to lower snap point or close
      if (currentSnapIndex === 0) {
        onClose();
        return;
      } else {
        targetSnapIndex = Math.max(0, currentSnapIndex - 1);
      }
    } else if (velocity.y < -300) {
      // Fast upward swipe - go to higher snap point
      targetSnapIndex = Math.min(snapPoints.length - 1, currentSnapIndex + 1);
    } else {
      // Slow drag - snap to nearest point
      const dragDistance = offset.y;
      const threshold = 50;
      
      if (dragDistance > threshold && currentSnapIndex > 0) {
        targetSnapIndex = currentSnapIndex - 1;
      } else if (dragDistance < -threshold && currentSnapIndex < snapPoints.length - 1) {
        targetSnapIndex = currentSnapIndex + 1;
      }
      
      // Close if dragged down past minimum height
      if (dragDistance > 150 && currentSnapIndex === 0) {
        onClose();
        return;
      }
    }
    
    setCurrentSnapIndex(targetSnapIndex);
    onSnapChange?.(targetSnapIndex);
  };

  const handleBackdropTap = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const variants = {
    hidden: {
      y: '100%',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    },
    visible: {
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={handleBackdropTap}
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            variants={variants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            drag={draggable ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 bg-background border-t rounded-t-xl shadow-xl",
              "max-h-[95vh] flex flex-col",
              isDragging && "cursor-grabbing",
              className
            )}
            style={{
              height: getHeight(),
            }}
          >
            {/* Handle */}
            {showHandle && (
              <div className="flex justify-center py-3">
                <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
            )}

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex-1">
                  {title && (
                    <h2 className="text-lg font-semibold">{title}</h2>
                  )}
                  {description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>

            {/* Snap Points Indicator */}
            {snapPoints && snapPoints.length > 1 && (
              <div className="flex justify-center gap-1 py-2">
                {snapPoints.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-colors",
                      index === currentSnapIndex 
                        ? "bg-primary" 
                        : "bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}