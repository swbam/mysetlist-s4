import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Safely parse artist genres from database field
 * Handles both JSON arrays and comma-separated strings
 */
export function parseGenres(
  genresField: string | string[] | null | undefined,
): string[] {
  if (!genresField) return [];

  // If it's already an array, return it
  if (Array.isArray(genresField)) {
    return genresField.filter((genre) => genre && genre.length > 0);
  }

  // If it's a string, try different parsing methods
  if (typeof genresField === "string") {
    try {
      // Try to parse as JSON first (for backward compatibility)
      const parsed = JSON.parse(genresField);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // If JSON parsing fails, treat as comma-separated string
      return genresField
        .split(",")
        .map((genre) => genre.trim())
        .filter((genre) => genre.length > 0);
    }
  }

  return [];
}

/**
 * Get the base URL based on environment
 */
export function getBaseUrl(): string {
  // Check for explicitly set URL first
  if (process.env.NEXT_PUBLIC_URL) {
    return process.env.NEXT_PUBLIC_URL;
  }

  // Production
  if (process.env.NODE_ENV === "production") {
    if (process.env.VERCEL_ENV === "production") {
      return "https://theset.live";
    }
    // Development/preview deployments on Vercel
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    // Fallback for production builds running locally
    return "http://localhost:3001";
  }

  // Local development
  return "http://localhost:3001";
}

/**
 * Get the app URL (same as base URL for this app)
 */
export function getAppUrl(): string {
  return getBaseUrl();
}

/**
 * Get the API URL
 */
export function getApiUrl(): string {
  return `${getBaseUrl()}/api`;
}
