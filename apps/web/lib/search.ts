export interface SearchResult {
  id: string;
  type: 'artist'; // Only artists are searchable per PRD requirements
  title: string;
  subtitle?: string;
  meta?: string;
  imageUrl?: string;
  slug: string;
  source?: 'database' | 'ticketmaster';
  requiresSync?: boolean;
  ticketmasterId?: string;
}

export interface SearchResponse {
  results: SearchResult[];
}

export async function searchContent(
  query: string,
  limit = 10
): Promise<SearchResponse> {
  if (!query || query.length < 2) {
    return { results: [] };
  }

  try {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    // Use absolute URL in production
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : (process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || '');
    
    const response = await fetch(`${baseUrl}/api/search?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Search failed with status: ${response.status}`);
      // Still try to parse the response in case it contains error info
      const data = await response.json().catch(() => ({ results: [] }));
      return data;
    }

    return await response.json();
  } catch (error) {
    console.error('Search error:', error);
    return { results: [] };
  }
}

export function getSearchResultHref(result: SearchResult): string {
  // Only artists are searchable, so always return artist URL
  // For Ticketmaster results without a slug, generate one
  const slug = result.slug || result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `/artists/${slug}`;
}

export function getSearchResultIcon(_type: SearchResult['type']): string {
  // Only artists are searchable
  return 'music';
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
}
