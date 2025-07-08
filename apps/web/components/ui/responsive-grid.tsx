'use client';

import { cn } from '@repo/design-system/lib/utils';
import React from 'react';

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  equalHeight?: boolean;
  role?: string;
}

export function ResponsiveGrid({
  children,
  className,
  cols = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 'md',
  equalHeight = false,
  role = 'grid',
}: ResponsiveGridProps) {
  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-3',
    md: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8',
    xl: 'gap-8 sm:gap-10',
  };

  const colClasses = [
    cols.xs && `grid-cols-${cols.xs}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        'grid',
        gapClasses[gap],
        colClasses,
        equalHeight && 'items-stretch',
        className
      )}
      role={role}
    >
      {children}
    </div>
  );
}

interface ResponsiveGridItemProps {
  children: React.ReactNode;
  className?: string;
  span?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  role?: string;
}

export function ResponsiveGridItem({
  children,
  className,
  span,
  role = 'gridcell',
}: ResponsiveGridItemProps) {
  const spanClasses = span
    ? [
        span.xs && `col-span-${span.xs}`,
        span.sm && `sm:col-span-${span.sm}`,
        span.md && `md:col-span-${span.md}`,
        span.lg && `lg:col-span-${span.lg}`,
        span.xl && `xl:col-span-${span.xl}`,
      ].filter(Boolean)
    : [];

  return (
    <div className={cn(spanClasses, className)} role={role}>
      {children}
    </div>
  );
}

// Masonry-style grid for variable height items
interface MasonryGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
}

export function MasonryGrid({
  children,
  className,
  cols = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 'md',
}: MasonryGridProps) {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8',
  };

  const colClasses = [
    cols.xs && `columns-${cols.xs}`,
    cols.sm && `sm:columns-${cols.sm}`,
    cols.md && `md:columns-${cols.md}`,
    cols.lg && `lg:columns-${cols.lg}`,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        colClasses,
        gapClasses[gap],
        'break-inside-avoid',
        className
      )}
    >
      {React.Children.map(children, (child, index) => (
        <div key={index} className="mb-4 break-inside-avoid sm:mb-6">
          {child}
        </div>
      ))}
    </div>
  );
}
