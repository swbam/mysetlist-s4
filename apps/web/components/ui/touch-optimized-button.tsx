"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { Loader2 } from "lucide-react";
import type * as React from "react";

interface TouchOptimizedButtonProps {
  loading?: boolean;
  loadingText?: string;
  touchSize?: "sm" | "md" | "lg";
  hapticFeedback?: boolean;
  children: any;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  type?: "button" | "submit" | "reset";
  [key: string]: any;
}

export function TouchOptimizedButton({
  loading = false,
  loadingText,
  touchSize = "md",
  hapticFeedback = true,
  className,
  children,
  onClick,
  disabled,
  ...props
}: TouchOptimizedButtonProps) {
  const touchSizeClasses = {
    sm: "min-h-[36px] px-3 py-2 text-sm",
    md: "min-h-[44px] px-4 py-2.5", // iOS minimum touch target
    lg: "min-h-[48px] px-6 py-3 text-lg",
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) {
      return;
    }

    // Add haptic feedback for mobile devices
    if (hapticFeedback && "vibrate" in navigator) {
      navigator.vibrate(10); // Very short vibration
    }

    onClick?.(event);
  };

  return (
    <Button
      className={cn(
        touchSizeClasses[touchSize],
        "touch-manipulation select-none",
        "transition-all duration-150",
        "active:scale-95",
        // Enhanced focus visibility for accessibility
        "focus-visible:ring-2 focus-visible:ring-offset-2",
        // Loading state
        loading && "cursor-not-allowed opacity-80",
        className,
      )}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loadingText || "Loading..."}</span>
        </div>
      ) : (
        children
      )}
    </Button>
  );
}

// Specialized button for floating action buttons (FAB)
interface FloatingActionButtonProps
  extends Omit<TouchOptimizedButtonProps, "touchSize"> {
  position?: "bottom-right" | "bottom-left" | "bottom-center";
  icon: React.ReactNode;
  "aria-label": string;
}

export function FloatingActionButton({
  position = "bottom-right",
  icon,
  className,
  "aria-label": ariaLabel,
  ...props
}: FloatingActionButtonProps) {
  const positionClasses = {
    "bottom-right": "fixed bottom-6 right-6",
    "bottom-left": "fixed bottom-6 left-6",
    "bottom-center": "fixed bottom-6 left-1/2 transform -translate-x-1/2",
  };

  return (
    <TouchOptimizedButton
      className={cn(
        positionClasses[position],
        "h-14 w-14 rounded-full shadow-lg",
        "z-50 p-0",
        "hover:scale-110 hover:shadow-xl",
        "focus:outline-none focus:ring-4 focus:ring-primary/20",
        className,
      )}
      touchSize="lg"
      aria-label={ariaLabel}
      {...props}
    >
      {icon}
    </TouchOptimizedButton>
  );
}
