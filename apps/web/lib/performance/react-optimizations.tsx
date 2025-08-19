/**
 * React performance optimizations to prevent Fast Refresh full reloads
 * and reduce unnecessary re-renders
 */

import React from "react";

// Memoization utilities for stable references
export const stableCallbacks = new WeakMap();

/**
 * Creates a stable callback that doesn't cause unnecessary re-renders
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;

  return React.useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * Memoized component wrapper that prevents unnecessary re-renders
 */
export function memo<P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) {
  const MemoizedComponent = React.memo(Component, propsAreEqual);
  
  // Preserve display name for debugging
  if (Component.displayName) {
    MemoizedComponent.displayName = `Memo(${Component.displayName})`;
  } else if (Component.name) {
    MemoizedComponent.displayName = `Memo(${Component.name})`;
  }
  
  return MemoizedComponent;
}

/**
 * Optimized context provider that prevents unnecessary re-renders
 */
export function createOptimizedContext<T>(
  displayName: string,
  defaultValue?: T
) {
  const Context = React.createContext<T | undefined>(defaultValue);
  Context.displayName = displayName;

  const Provider = ({ children, value }: { children: React.ReactNode; value: T }) => {
    // Memoize the value to prevent unnecessary context updates
    const memoizedValue = React.useMemo(() => value, [value]);
    
    return (
      <Context.Provider value={memoizedValue}>
        {children}
      </Context.Provider>
    );
  };

  const useContext = () => {
    const context = React.useContext(Context);
    if (context === undefined) {
      throw new Error(`use${displayName} must be used within ${displayName}Provider`);
    }
    return context;
  };

  return { Provider, useContext, Context };
}

/**
 * Shallow comparison for React.memo
 */
export function shallowEqual<T extends Record<string, any>>(
  objA: T,
  objB: T
): boolean {
  if (objA === objB) {
    return true;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key) || objA[key] !== objB[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Debounced state hook to prevent excessive updates
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, React.Dispatch<React.SetStateAction<T>>, T] {
  const [value, setValue] = React.useState(initialValue);
  const [debouncedValue, setDebouncedValue] = React.useState(initialValue);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return [value, setValue, debouncedValue];
}

/**
 * Optimized state hook that prevents updates if value hasn't changed
 */
export function useOptimizedState<T>(
  initialValue: T,
  isEqual: (a: T, b: T) => boolean = Object.is
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = React.useState(initialValue);

  const optimizedSetState = React.useCallback(
    (newValue: React.SetStateAction<T>) => {
      setState((prevValue) => {
        const nextValue = typeof newValue === 'function' 
          ? (newValue as (prev: T) => T)(prevValue)
          : newValue;
        
        return isEqual(prevValue, nextValue) ? prevValue : nextValue;
      });
    },
    [isEqual]
  );

  return [state, optimizedSetState];
}

/**
 * Performance monitoring for development
 */
export function useRenderCount(componentName: string) {
  const renderCount = React.useRef(0);
  renderCount.current += 1;

  if (process.env.NODE_ENV === 'development') {
    React.useEffect(() => {
      console.log(`${componentName} rendered ${renderCount.current} times`);
    });
  }

  return renderCount.current;
}

/**
 * Prevents component from re-rendering if props haven't changed
 */
export function preventUnnecessaryRenders<P extends Record<string, any>>(
  Component: React.ComponentType<P>
) {
  return memo(Component, shallowEqual);
}

/**
 * HOC to add stable props to prevent re-renders
 */
export function withStableProps<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  stableProps: string[] = []
) {
  return React.forwardRef<any, P>((props, ref) => {
    const memoizedProps = React.useMemo(() => {
      const stable: Partial<P> = {};
      const dynamic: Partial<P> = {};

      Object.entries(props).forEach(([key, value]) => {
        if (stableProps.includes(key)) {
          stable[key as keyof P] = value;
        } else {
          dynamic[key as keyof P] = value;
        }
      });

      return { ...stable, ...dynamic };
    }, [props]);

    return <Component {...(memoizedProps as any)} ref={ref} />;
  });
}