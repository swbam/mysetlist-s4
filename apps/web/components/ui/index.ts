// Mobile-optimized UI components
export * from "./mobile-optimized-card";
export * from "./touch-optimized-button";
export * from "./responsive-grid";
export * from "./swipe-actions";
export * from "./pull-to-refresh";
export * from "./infinite-scroll";
export * from "./theme-provider";
export * from "./bottom-navigation";
export * from "./accessibility-utils";
export * from "./optimized-image";

// Re-export commonly used components for convenience
export {
  MobileOptimizedCard,
  MobileCardContent,
  MobileCardHeader,
} from "./mobile-optimized-card";
export {
  TouchOptimizedButton,
  FloatingActionButton,
} from "./touch-optimized-button";
export {
  ResponsiveGrid,
  ResponsiveGridItem,
  MasonryGrid,
} from "./responsive-grid";
export { SwipeActions } from "./swipe-actions";
export { PullToRefresh } from "./pull-to-refresh";
export { InfiniteScroll, useInfiniteScroll } from "./infinite-scroll";
export { ThemeProvider, ThemeToggle, useTheme } from "./theme-provider";
export {
  BottomNavigation,
  useBottomNavigationPadding,
  WithBottomNavigation,
} from "./bottom-navigation";
export {
  OptimizedImage,
  OptimizedAvatar,
  ImageGallery,
} from "./optimized-image";
export {
  ScreenReaderOnly,
  FocusTrap,
  LiveRegion,
  SkipLink,
  KeyboardNavigation,
  ReducedMotion,
  AccessibleButton,
  AccessibleIcon,
  useHighContrast,
  useColorScheme,
} from "./accessibility-utils";
