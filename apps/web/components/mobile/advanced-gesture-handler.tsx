"use client";

import { cn } from "@repo/design-system";
import {
  type PanInfo,
  motion,
  useAnimation,
  useMotionValue,
  useSpring,
} from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Share,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { memo, useCallback, useRef, useState } from "react";

interface GestureAction {
  id: string;
  label: string;
  icon: any;
  color: string;
  threshold: number;
  hapticPattern?: number[];
  onTrigger: () => void;
}

interface AdvancedGestureHandlerProps {
  children: React.ReactNode;
  leftActions?: GestureAction[];
  rightActions?: GestureAction[];
  enableHapticFeedback?: boolean;
  enableVisualFeedback?: boolean;
  snapBackDuration?: number;
  className?: string;
  onGestureStart?: (direction: "left" | "right") => void;
  onGestureEnd?: (direction: "left" | "right", triggered: boolean) => void;
}

const defaultLeftActions: GestureAction[] = [
  {
    id: "favorite",
    label: "Favorite",
    icon: Heart,
    color: "bg-red-500",
    threshold: 80,
    hapticPattern: [10, 50, 10],
    onTrigger: () => console.log("Favorited"),
  },
  {
    id: "star",
    label: "Star",
    icon: Star,
    color: "bg-yellow-500",
    threshold: 120,
    hapticPattern: [25],
    onTrigger: () => console.log("Starred"),
  },
];

const defaultRightActions: GestureAction[] = [
  {
    id: "share",
    label: "Share",
    icon: Share,
    color: "bg-blue-500",
    threshold: 80,
    hapticPattern: [10, 50, 10],
    onTrigger: () => console.log("Shared"),
  },
  {
    id: "delete",
    label: "Delete",
    icon: Trash2,
    color: "bg-red-600",
    threshold: 120,
    hapticPattern: [50, 100, 50],
    onTrigger: () => console.log("Deleted"),
  },
];

const ActionButton = memo(function ActionButton({
  action,
  isActive,
  progress,
}: {
  action: GestureAction;
  isActive: boolean;
  progress: number;
}) {
  const Icon = action.icon;
  const scale = useSpring(isActive ? 1.2 : 1, { stiffness: 400, damping: 30 });
  const opacity = useSpring(progress, { stiffness: 400, damping: 30 });

  return (
    <motion.div
      className={cn(
        "flex items-center justify-center rounded-full w-12 h-12 text-white",
        action.color,
        isActive && "shadow-lg",
      )}
      style={{
        scale,
        opacity,
      }}
    >
      <Icon className="w-5 h-5" />
    </motion.div>
  );
}) as any;

const GestureBackground = (({
  direction,
  progress,
  action,
}: {
  direction: "left" | "right";
  progress: number;
  action?: GestureAction;
}) => {
  const backgroundOpacity = Math.min(progress / 100, 0.3);

  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center",
        direction === "left" ? "justify-start pl-4" : "justify-end pr-4",
        action?.color.replace("bg-", "bg-opacity-20 bg-"),
      )}
      style={{ opacity: backgroundOpacity }}
    >
      {action && (
        <div className="flex items-center space-x-2 text-white">
          <action.icon className="w-4 h-4" />
          <span className="text-sm font-medium">{action.label}</span>
        </div>
      )}
    </div>
  );
}) as any;

const AdvancedGestureHandlerComponent = function AdvancedGestureHandler({
  children,
  leftActions = defaultLeftActions,
  rightActions = defaultRightActions,
  enableHapticFeedback = true,
  enableVisualFeedback = true,
  snapBackDuration = 0.3,
  className,
  onGestureStart,
  onGestureEnd,
}: AdvancedGestureHandlerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentAction, setCurrentAction] = useState<GestureAction | null>(
    null,
  );
  const [dragDirection, setDragDirection] = useState<"left" | "right" | null>(
    null,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const controls = useAnimation();
  const lastHapticThreshold = useRef(0);

  // Haptic feedback function
  const triggerHaptic = useCallback(
    (pattern: number[] = [10]) => {
      if (enableHapticFeedback && "vibrate" in navigator) {
        navigator.vibrate(pattern);
      }
    },
    [enableHapticFeedback],
  );

  // Get action based on drag distance and direction
  const getActionForDistance = useCallback(
    (distance: number, direction: "left" | "right") => {
      const actions = direction === "left" ? leftActions : rightActions;
      const absDistance = Math.abs(distance);

      // Find the action with the highest threshold that's been exceeded
      const activeAction = actions
        .filter((action) => absDistance >= action.threshold)
        .sort((a, b) => b.threshold - a.threshold)[0];

      return activeAction || null;
    },
    [leftActions, rightActions],
  );

  // Handle drag start
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    lastHapticThreshold.current = 0;
    triggerHaptic([5]); // Light tap to indicate drag start
  }, [triggerHaptic]);

  // Handle drag
  const handleDrag = useCallback(
    (_event: any, info: PanInfo) => {
      const { offset } = info;
      const direction = offset.x > 0 ? "right" : "left";

      if (dragDirection !== direction) {
        setDragDirection(direction);
        onGestureStart?.(direction);
      }

      const action = getActionForDistance(offset.x, direction);

      if (action !== currentAction) {
        setCurrentAction(action);

        // Haptic feedback when crossing action threshold
        if (action?.hapticPattern) {
          const distanceFromLast = Math.abs(
            Math.abs(offset.x) - lastHapticThreshold.current,
          );
          if (distanceFromLast >= action.threshold) {
            triggerHaptic(action.hapticPattern);
            lastHapticThreshold.current = Math.abs(offset.x);
          }
        }
      }
    },
    [
      currentAction,
      dragDirection,
      getActionForDistance,
      onGestureStart,
      triggerHaptic,
    ],
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (_event: any, info: PanInfo) => {
      const { offset } = info;
      const direction = offset.x > 0 ? "right" : "left";
      const action = getActionForDistance(offset.x, direction);

      setIsDragging(false);

      if (action) {
        // Trigger action
        action.onTrigger();
        triggerHaptic(action.hapticPattern || [25]);
        onGestureEnd?.(direction, true);
      } else {
        onGestureEnd?.(direction, false);
      }

      // Snap back animation
      controls.start({
        x: 0,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 30,
          duration: snapBackDuration,
        },
      });

      // Reset state
      setTimeout(() => {
        setCurrentAction(null);
        setDragDirection(null);
      }, snapBackDuration * 1000);
    },
    [
      controls,
      getActionForDistance,
      onGestureEnd,
      snapBackDuration,
      triggerHaptic,
    ],
  );

  // Drag constraints
  const dragConstraints = {
    left: -Math.max(...rightActions.map((a) => a.threshold)) - 50,
    right: Math.max(...leftActions.map((a) => a.threshold)) + 50,
    top: 0,
    bottom: 0,
  };

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      ref={containerRef}
    >
      {/* Background action indicators */}
      {enableVisualFeedback && isDragging && (
        <>
          {dragDirection === "left" && (
            <GestureBackground
              direction="left"
              progress={Math.abs(x.get())}
              action={currentAction}
            />
          )}
          {dragDirection === "right" && (
            <GestureBackground
              direction="right"
              progress={Math.abs(x.get())}
              action={currentAction}
            />
          )}
        </>
      )}

      {/* Action buttons */}
      {enableVisualFeedback && (
        <>
          {/* Left actions */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex space-x-2 z-10">
            {leftActions.map((action) => (
              <ActionButton
                key={action.id}
                action={action}
                isActive={currentAction?.id === action.id}
                progress={
                  dragDirection === "right"
                    ? Math.min(Math.abs(x.get()) / action.threshold, 1)
                    : 0
                }
              />
            ))}
          </div>

          {/* Right actions */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex space-x-2 z-10">
            {rightActions.map((action) => (
              <ActionButton
                key={action.id}
                action={action}
                isActive={currentAction?.id === action.id}
                progress={
                  dragDirection === "left"
                    ? Math.min(Math.abs(x.get()) / action.threshold, 1)
                    : 0
                }
              />
            ))}
          </div>
        </>
      )}

      {/* Draggable content */}
      <motion.div
        drag="x"
        dragConstraints={dragConstraints}
        dragElastic={0.2}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className={cn(
          "relative z-20 cursor-grab active:cursor-grabbing",
          isDragging && "select-none",
        )}
        whileDrag={{ scale: 0.98 }}
      >
        {children}
      </motion.div>

      {/* Gesture hint overlay */}
      {!isDragging && (
        <div className="absolute inset-0 pointer-events-none z-30">
          <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-20">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-20">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      )}
    </div>
  );
};

export const AdvancedGestureHandler = memo(
  AdvancedGestureHandlerComponent,
) as any;

// Preset gesture configurations
export const GesturePresets = {
  socialMedia: {
    leftActions: [
      {
        id: "like",
        label: "Like",
        icon: Heart,
        color: "bg-red-500",
        threshold: 80,
        hapticPattern: [10, 50, 10],
        onTrigger: () => console.log("Liked"),
      },
      {
        id: "share",
        label: "Share",
        icon: Share,
        color: "bg-blue-500",
        threshold: 120,
        hapticPattern: [25],
        onTrigger: () => console.log("Shared"),
      },
    ],
    rightActions: [
      {
        id: "delete",
        label: "Delete",
        icon: Trash2,
        color: "bg-red-600",
        threshold: 100,
        hapticPattern: [50, 100, 50],
        onTrigger: () => console.log("Deleted"),
      },
    ],
  },

  music: {
    leftActions: [
      {
        id: "favorite",
        label: "Favorite",
        icon: Heart,
        color: "bg-red-500",
        threshold: 80,
        hapticPattern: [10, 50, 10],
        onTrigger: () => console.log("Added to favorites"),
      },
      {
        id: "queue",
        label: "Add to Queue",
        icon: Star,
        color: "bg-purple-500",
        threshold: 120,
        hapticPattern: [25],
        onTrigger: () => console.log("Added to queue"),
      },
    ],
    rightActions: [
      {
        id: "share",
        label: "Share",
        icon: Share,
        color: "bg-blue-500",
        threshold: 80,
        hapticPattern: [10, 50, 10],
        onTrigger: () => console.log("Shared"),
      },
      {
        id: "remove",
        label: "Remove",
        icon: X,
        color: "bg-gray-500",
        threshold: 120,
        hapticPattern: [50, 100, 50],
        onTrigger: () => console.log("Removed"),
      },
    ],
  },
};

// Hook for custom gesture actions
export function useGestureActions() {
  const createAction = useCallback(
    (
      config: Omit<GestureAction, "onTrigger"> & { onTrigger: () => void },
    ): GestureAction => {
      return {
        ...config,
        hapticPattern: config.hapticPattern || [25],
      };
    },
    [],
  );

  return { createAction };
}

// Higher-order component for easy gesture integration
export function withGestureSupport<P extends object>(
  Component: React.ComponentType<P>,
  gestureConfig?: {
    leftActions?: GestureAction[];
    rightActions?: GestureAction[];
    enableHapticFeedback?: boolean;
  },
) {
  return memo(function GestureEnabledComponent(props: P) {
    return (
      <AdvancedGestureHandler
        leftActions={gestureConfig?.leftActions ?? defaultLeftActions}
        rightActions={gestureConfig?.rightActions ?? defaultRightActions}
        enableHapticFeedback={gestureConfig?.enableHapticFeedback ?? true}
      >
        <Component {...props} />
      </AdvancedGestureHandler>
    );
  });
}
