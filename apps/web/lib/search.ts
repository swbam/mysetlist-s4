export interface SearchResult {
  id: string;
  type: 'artist' | 'show' | 'venue';
  title: string;
  subtitle?: string;
  meta?: string;
  imageUrl?: string;
  slug: string;
}

export interface SearchResponse {
  results: SearchResult[];
}

export async function searchContent(query: string, limit: number = 10): Promise<SearchResponse> {
  if (!query || query.length < 2) {
    return { results: [] };
  }

  try {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    const response = await fetch(`/api/search?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Search error:', error);
    return { results: [] };
  }
}

export function getSearchResultHref(result: SearchResult): string {
  switch (result.type) {
    case 'artist':
      return `/artists/${result.slug}`;
    case 'show':
      return `/shows/${result.slug}`;
    case 'venue':
      return `/venues/${result.slug}`;
    default:
      return '/';
  }
}

export function getSearchResultIcon(type: SearchResult['type']): string {
  switch (type) {
    case 'artist':
      return 'music';
    case 'show':
      return 'calendar';
    case 'venue':
      return 'map-pin';
    default:
      return 'search';
  }
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