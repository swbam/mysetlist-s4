/**
 * String processing utilities for TheSet
 * Includes text normalization, slug generation, and parsing helpers
 */

/**
 * Create URL-safe slug from text
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Normalize artist/venue/song names for comparison
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\b(the|a|an)\b/g, '') // Remove articles
    .trim();
}

/**
 * Extract clean song title from potentially messy input
 */
export function cleanSongTitle(title: string): string {
  return title
    .trim()
    // Remove common suffixes
    .replace(/\s*\(.*?\)\s*$/g, '') // Remove trailing parentheses
    .replace(/\s*\[.*?\]\s*$/g, '') // Remove trailing brackets
    .replace(/\s*-\s*(live|acoustic|remix|radio edit|single version|album version).*$/i, '')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a song title indicates it's a live recording
 */
export function isLikelyLiveTitle(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  const liveIndicators = [
    'live',
    'unplugged',
    'acoustic',
    'concert',
    'tour',
    'festival',
    'mtv',
    'session',
    'radio',
    'bbc',
    'live at',
    'live from',
    'live in',
    'live on'
  ];
  
  return liveIndicators.some(indicator => lowerTitle.includes(indicator));
}

/**
 * Check if an album name indicates it's a live recording
 */
export function isLikelyLiveAlbum(albumName: string): boolean {
  const lowerAlbum = albumName.toLowerCase();
  const liveIndicators = [
    'live',
    'unplugged',
    'concert',
    'tour',
    'festival',
    'sessions',
    'acoustic',
    'mtv',
    'live at',
    'live from',
    'live in',
    'recorded live'
  ];
  
  return liveIndicators.some(indicator => lowerAlbum.includes(indicator));
}

/**
 * Check if a title indicates it's a remix
 */
export function isRemixTitle(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return lowerTitle.includes('remix') || 
         lowerTitle.includes('mix)') || 
         lowerTitle.includes('version)') ||
         /\(.*remix.*\)/i.test(title);
}

/**
 * Parse genres from various string formats
 */
export function parseGenres(genreString: string | null | undefined): string[] {
  if (!genreString) return [];
  
  try {
    // Try parsing as JSON array first
    const parsed = JSON.parse(genreString);
    if (Array.isArray(parsed)) {
      return parsed.filter(g => typeof g === 'string' && g.trim().length > 0);
    }
  } catch {
    // Not JSON, treat as string
  }
  
  // Split by common delimiters
  return genreString
    .split(/[,;|]/)
    .map(g => g.trim())
    .filter(g => g.length > 0)
    .slice(0, 10); // Limit to 10 genres
}

/**
 * Extract artist name variations for search
 */
export function getArtistNameVariations(name: string): string[] {
  const variations = new Set<string>();
  variations.add(name);
  variations.add(normalizeText(name));
  
  // Remove common prefixes
  const withoutThe = name.replace(/^(the|a|an)\s+/i, '').trim();
  if (withoutThe !== name) {
    variations.add(withoutThe);
    variations.add(normalizeText(withoutThe));
  }
  
  // Handle "Artist & Artist" or "Artist and Artist"
  if (name.includes(' & ') || name.includes(' and ')) {
    const parts = name.split(/\s+(&|and)\s+/i);
    if (parts.length === 2) {
      variations.add(parts[0]?.trim() || '');
      variations.add(parts[1]?.trim() || '');
    }
  }
  
  return Array.from(variations).filter(v => v.length > 0);
}

/**
 * Generate fuzzy matching key for deduplication
 */
export function generateMatchingKey(text: string, additionalInfo?: string): string {
  const normalized = normalizeText(text);
  const key = normalized.replace(/\s+/g, '');
  
  if (additionalInfo) {
    const normalizedInfo = normalizeText(additionalInfo);
    return `${key}:${normalizedInfo.replace(/\s+/g, '')}`;
  }
  
  return key;
}

/**
 * Calculate string similarity using Levenshtein distance
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const a = str1.toLowerCase();
  const b = str2.toLowerCase();
  
  if (a === b) return 1;
  if (a.length === 0) return 0;
  if (b.length === 0) return 0;
  
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i++) matrix[0]![i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j]![0] = j;
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j]![i] = Math.min(
        (matrix[j]![i - 1] || 0) + 1, // deletion
        (matrix[j - 1]![i] || 0) + 1, // insertion
        (matrix[j - 1]![i - 1] || 0) + substitutionCost // substitution
      );
    }
  }
  
  const maxLength = Math.max(a.length, b.length);
  return (maxLength - (matrix[b.length]![a.length] || 0)) / maxLength;
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(text: string): string {
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Clean up and standardize venue names
 */
export function cleanVenueName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    // Standardize common venue terms
    .replace(/\bamp\b/gi, 'Amphitheatre')
    .replace(/\bctr\b/gi, 'Center')
    .replace(/\bthtr\b/gi, 'Theatre')
    .replace(/\baud\b/gi, 'Auditorium')
    .replace(/\barena\b/gi, 'Arena')
    .replace(/\bstadium\b/gi, 'Stadium')
    .replace(/\bhall\b/gi, 'Hall');
}

/**
 * Extract duration in milliseconds from various string formats
 */
export function parseDuration(durationStr: string): number | null {
  if (!durationStr) return null;
  
  // Handle MM:SS format
  const timeMatch = durationStr.match(/^(\d+):(\d+)$/);
  if (timeMatch) {
    const minutes = parseInt(timeMatch[1] || '0', 10);
    const seconds = parseInt(timeMatch[2] || '0', 10);
    return (minutes * 60 + seconds) * 1000;
  }
  
  // Handle numeric string (assume seconds)
  const numericMatch = durationStr.match(/^\d+$/);
  if (numericMatch) {
    return parseInt(durationStr, 10) * 1000;
  }
  
  return null;
}

/**
 * Format duration from milliseconds to MM:SS
 */
export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Validate and clean external URLs
 */
export function cleanUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  try {
    const cleanedUrl = url.trim();
    if (!cleanedUrl.startsWith('http://') && !cleanedUrl.startsWith('https://')) {
      return `https://${cleanedUrl}`;
    }
    return cleanedUrl;
  } catch {
    return null;
  }
}

/**
 * Extract numbers from string (useful for parsing IDs)
 */
export function extractNumbers(text: string): string {
  return text.replace(/\D/g, '');
}

/**
 * Check if string is valid JSON
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}