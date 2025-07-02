'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@repo/design-system/components/ui/card';
import { cn } from '@repo/design-system/lib/utils';

interface MobileOptimizedCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'compact' | 'elevated';
  orientation?: 'horizontal' | 'vertical';
  touchOptimized?: boolean;
  role?: string;
  'aria-label'?: string;
}

export function MobileOptimizedCard({ 
  children, 
  className,
  variant = 'default',
  orientation = 'vertical',
  touchOptimized = true,
  role,
  'aria-label': ariaLabel,
  ...props 
}: MobileOptimizedCardProps) {
  return (
    <Card 
      className={cn(
        'overflow-hidden transition-all duration-200',
        // Base touch optimization
        touchOptimized && [
          'touch-manipulation',
          'active:scale-[0.98]',
          'hover:shadow-md hover:scale-[1.01]',
          'focus-within:ring-2 focus-within:ring-primary/20',
        ],
        // Variant styles
        variant === 'compact' && 'p-2',
        variant === 'elevated' && 'shadow-md border-0',
        // Orientation styles
        orientation === 'horizontal' && 'flex flex-row items-center',
        // Mobile-specific optimizations
        'min-h-[44px]', // iOS touch target minimum
        'select-none', // Prevent accidental text selection on mobile
        className
      )}
      role={role}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </Card>
  );
}

interface MobileCardContentProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function MobileCardContent({ 
  children, 
  className,
  padding = 'md' 
}: MobileCardContentProps) {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  };

  return (
    <CardContent className={cn(paddingClasses[padding], className)}>
      {children}
    </CardContent>
  );
}

interface MobileCardHeaderProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function MobileCardHeader({ 
  children, 
  className,
  size = 'md'
}: MobileCardHeaderProps) {
  const sizeClasses = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3 sm:px-6 sm:py-4',
    lg: 'px-6 py-4 sm:px-8 sm:py-6'
  };

  return (
    <CardHeader className={cn(sizeClasses[size], className)}>
      {children}
    </CardHeader>
  );
}