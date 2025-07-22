import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Safely parse artist genres from database field
 * Handles both JSON arrays and comma-separated strings
 */
export function parseGenres(genresField: string | string[] | null | undefined): string[] {
  if (!genresField) return [];
  
  // If it's already an array, return it
  if (Array.isArray(genresField)) {
    return genresField.filter((genre) => genre && genre.length > 0);
  }
  
  // If it's a string, try different parsing methods
  if (typeof genresField === 'string') {
    try {
      // Try to parse as JSON first (for backward compatibility)
      const parsed = JSON.parse(genresField);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // If JSON parsing fails, treat as comma-separated string
      return genresField
        .split(',')
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
  // Priority 1: Explicitly configured URLs
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.NEXT_PUBLIC_URL) {
    return process.env.NEXT_PUBLIC_URL;
  }
  
  // Priority 2: Browser environment - use current origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Priority 3: Production environment
  if (process.env.NODE_ENV === 'production') {
    // Vercel production URL
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    }
    // Vercel environment check
    if (process.env.VERCEL_ENV === 'production' && process.env.DOMAIN) {
      return `https://${process.env.DOMAIN}`;
    }
    // Vercel deployment URL
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    // Generic production URL fallback
    if (process.env.PRODUCTION_URL) {
      return process.env.PRODUCTION_URL;
    }
    // CRITICAL: Remove localhost fallback in production!
    console.error('WARNING: No production URL configured! Set NEXT_PUBLIC_APP_URL');
  }
  
  // Priority 4: Development/preview deployments
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Priority 5: Local development only
  return 'http://localhost:3001';
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
