import { useState, useCallback, useTransition } from 'react';

interface UseOptimisticUpdateOptions<T> {
  onUpdate: (newValue: T) => Promise<any>;
  onSuccess?: (result: any) => void;
  onError?: (error: Error, previousValue: T) => void;
}

export function useOptimisticUpdate<T>(
  initialValue: T,
  options: UseOptimisticUpdateOptions<T>
) {
  const [value, setValue] = useState<T>(initialValue);
  const [optimisticValue, setOptimisticValue] = useState<T>(initialValue);
  const [isPending, startTransition] = useTransition();
  
  const update = useCallback((newValue: T | ((prev: T) => T)) => {
    const nextValue = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(optimisticValue)
      : newValue;
    
    // Store current value for rollback
    const previousValue = value;
    
    // Apply optimistic update
    setOptimisticValue(nextValue);
    
    startTransition(async () => {
      try {
        const result = await options.onUpdate(nextValue);
        setValue(nextValue);
        options.onSuccess?.(result);
      } catch (error) {
        // Rollback on error
        setOptimisticValue(previousValue);
        setValue(previousValue);
        options.onError?.(error as Error, previousValue);
      }
    });
  }, [value, optimisticValue, options]);
  
  // Use optimistic value if pending, otherwise use actual value
  const displayValue = isPending ? optimisticValue : value;
  
  return {
    value: displayValue,
    update,
    isPending,
    reset: () => {
      setValue(initialValue);
      setOptimisticValue(initialValue);
    },
  };
}