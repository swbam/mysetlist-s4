import dynamic from "next/dynamic";
import type { LucideProps } from "lucide-react";
import type { FC } from "react";

// Create a loading spinner component
const IconLoading = () => (
  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
);

// Helper to create lazy-loaded icon components
const createLazyIcon = (iconName: string): FC<LucideProps> => {
  return dynamic(
    () =>
      import("lucide-react").then((mod) => ({
        default: mod[iconName as keyof typeof mod] as FC<LucideProps>,
      })),
    {
      loading: () => <IconLoading />,
      ssr: false,
    },
  );
};

// Commonly used icons - lazy loaded
export const Search = createLazyIcon("Search");
export const Music = createLazyIcon("Music");
export const Calendar = createLazyIcon("Calendar");
export const MapPin = createLazyIcon("MapPin");
export const Users = createLazyIcon("Users");
export const ExternalLink = createLazyIcon("ExternalLink");
export const Verified = createLazyIcon("Verified");
export const ChevronRight = createLazyIcon("ChevronRight");
export const X = createLazyIcon("X");
export const Loader2 = createLazyIcon("Loader2");
export const TrendingUp = createLazyIcon("TrendingUp");
export const Heart = createLazyIcon("Heart");
export const Trophy = createLazyIcon("Trophy");
export const Sparkles = createLazyIcon("Sparkles");
export const Disc = createLazyIcon("Disc");

// Export a function to dynamically import any icon
export const getLazyIcon = (iconName: string) => createLazyIcon(iconName);