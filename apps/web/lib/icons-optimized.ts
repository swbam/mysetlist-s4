// Optimized icon imports - only load icons that are actually used
// This reduces the bundle size by avoiding loading all lucide-react icons

// Core icons used across the app
export {
  ChevronRight,
  Music,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  MapPin,
  Heart,
  Star,
  Search,
  Menu,
  X,
  ArrowUp,
  ArrowDown,
  Play,
  Pause,
  Home,
  User,
  Settings,
} from "lucide-react";

// Conditional icon loading for admin and analytics
export const getAnalyticsIcons = async () => {
  const { Award, Trophy, Eye, BarChart3, PieChart } = await import("lucide-react");
  return { Award, Trophy, Eye, BarChart3, PieChart };
};

export const getVotingIcons = async () => {
  const { ThumbsUp, ThumbsDown, Crown, Medal } = await import("lucide-react");
  return { ThumbsUp, ThumbsDown, Crown, Medal };
};

export const getMobileIcons = async () => {
  const { Smartphone, Tablet, Monitor } = await import("lucide-react");
  return { Smartphone, Tablet, Monitor };
};