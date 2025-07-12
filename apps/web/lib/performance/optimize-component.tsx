import { ComponentType, memo, PropsWithChildren } from 'react';

// Type-safe memoization helper with display name
export function withMemo<P extends object>(
  Component: ComponentType<P>,
  propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
) {
  const MemoizedComponent = memo(Component, propsAreEqual);
  
  // Preserve display name for debugging
  MemoizedComponent.displayName = `Memo(${Component.displayName || Component.name || 'Component'})`;
  
  return MemoizedComponent;
}

// Shallow comparison that ignores functions (useful for event handlers)
export function arePropsEqualIgnoreFunctions<P extends object>(
  prevProps: Readonly<P>,
  nextProps: Readonly<P>
): boolean {
  const prevKeys = Object.keys(prevProps) as Array<keyof P>;
  const nextKeys = Object.keys(nextProps) as Array<keyof P>;

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    const prevValue = prevProps[key];
    const nextValue = nextProps[key];

    // Skip function comparisons
    if (typeof prevValue === 'function' && typeof nextValue === 'function') {
      continue;
    }

    if (prevValue !== nextValue) {
      return false;
    }
  }

  return true;
}

// Deep comparison for specific props only
export function createPropsComparator<P extends object>(
  keysToCompare: Array<keyof P>
) {
  return (prevProps: Readonly<P>, nextProps: Readonly<P>): boolean => {
    for (const key of keysToCompare) {
      if (prevProps[key] !== nextProps[key]) {
        return false;
      }
    }
    return true;
  };
}

// Performance wrapper component that measures render time
interface PerformanceWrapperProps extends PropsWithChildren {
  name: string;
  threshold?: number; // Log if render takes longer than threshold (ms)
}

export function PerformanceWrapper({ 
  name, 
  threshold = 16, // One frame at 60fps
  children 
}: PerformanceWrapperProps) {
  if (process.env.NODE_ENV === 'production') {
    return <>{children}</>;
  }

  const startTime = performance.now();
  
  // Use requestIdleCallback to log after render
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      const renderTime = performance.now() - startTime;
      if (renderTime > threshold) {
        console.warn(`[Performance] ${name} took ${renderTime.toFixed(2)}ms to render`);
      }
    });
  }

  return <>{children}</>;
}

// Higher-order component for automatic performance tracking
export function withPerformanceTracking<P extends object>(
  Component: ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => {
    const name = componentName || Component.displayName || Component.name || 'Component';
    
    return (
      <PerformanceWrapper name={name}>
        <Component {...props} />
      </PerformanceWrapper>
    );
  };

  WrappedComponent.displayName = `WithPerformance(${Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent;
}

// Combine memoization with performance tracking
export function optimizeComponent<P extends object>(
  Component: ComponentType<P>,
  options?: {
    propsComparator?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean;
    trackPerformance?: boolean;
    componentName?: string;
  }
) {
  let OptimizedComponent = Component;

  // Apply memoization
  OptimizedComponent = withMemo(Component, options?.propsComparator);

  // Apply performance tracking if requested
  if (options?.trackPerformance && process.env.NODE_ENV !== 'production') {
    OptimizedComponent = withPerformanceTracking(OptimizedComponent, options.componentName);
  }

  return OptimizedComponent;
}

// Export commonly used comparators
export const comparators = {
  ignoreChildren: createPropsComparator<any>([]), // Compare nothing, always re-render if parent changes
  ignoreFunctions: arePropsEqualIgnoreFunctions,
  shallowEqual: undefined, // Use React's default shallow comparison
} as const;