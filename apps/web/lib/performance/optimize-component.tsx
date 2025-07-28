import React, { type ComponentType, memo, type PropsWithChildren } from "react"

export function withMemo<P extends object>(
  Component: ComponentType<P>,
  propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
) {
  const MemoizedComponent = memo(Component, propsAreEqual)

  MemoizedComponent.displayName = `Memo(${Component.displayName || Component.name || "Component"})`

  return MemoizedComponent
}

export function arePropsEqualIgnoreFunctions<P extends object>(
  prevProps: Readonly<P>,
  nextProps: Readonly<P>
): boolean {
  const prevKeys = Object.keys(prevProps) as Array<keyof P>
  const nextKeys = Object.keys(nextProps) as Array<keyof P>

  if (prevKeys.length !== nextKeys.length) {
    return false
  }

  for (const key of prevKeys) {
    const prevValue = prevProps[key]
    const nextValue = nextProps[key]

    if (typeof prevValue === "function" && typeof nextValue === "function") {
      continue
    }

    if (prevValue !== nextValue) {
      return false
    }
  }

  return true
}

export function createPropsComparator<P extends object>(
  keysToCompare: Array<keyof P>
) {
  return (prevProps: Readonly<P>, nextProps: Readonly<P>): boolean => {
    for (const key of keysToCompare) {
      if (prevProps[key] !== nextProps[key]) {
        return false
      }
    }
    return true
  }
}

interface PerformanceWrapperProps extends PropsWithChildren {
  name: string
  threshold?: number
}

export function PerformanceWrapper({
  name,
  threshold = 16,
  children,
}: PerformanceWrapperProps) {
  if (process.env["NODE_ENV"] === "production") {
    return <>{children}</>
  }

  const startTime = performance.now()

  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    ;(window as any).requestIdleCallback(() => {
      const renderTime = performance.now() - startTime
      if (renderTime > threshold) {
        console.warn(
          `[Performance] ${name} took ${renderTime.toFixed(2)}ms to render`
        )
      }
    })
  }

  return <>{children}</>
}

export function withPerformanceTracking<P extends object>(
  Component: ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => {
    const name =
      componentName || Component.displayName || Component.name || "Component"

    return (
      <PerformanceWrapper name={name}>
        <Component {...props} />
      </PerformanceWrapper>
    )
  }

  WrappedComponent.displayName = `WithPerformance(${Component.displayName || Component.name || "Component"})`

  return WrappedComponent
}

export function optimizeComponent<P extends object>(
  Component: ComponentType<P>,
  options?: {
    propsComparator?: (
      prevProps: Readonly<P>,
      nextProps: Readonly<P>
    ) => boolean
    trackPerformance?: boolean
    componentName?: string
  }
) {
  let OptimizedComponent = Component

  OptimizedComponent = withMemo(Component, options?.propsComparator)

  if (options?.trackPerformance && process.env["NODE_ENV"] !== "production") {
    OptimizedComponent = withPerformanceTracking(
      OptimizedComponent,
      options.componentName
    )
  }

  return OptimizedComponent
}

export const comparators = {
  ignoreChildren: createPropsComparator<any>([]),
  ignoreFunctions: arePropsEqualIgnoreFunctions,
  shallowEqual: undefined,
} as const
