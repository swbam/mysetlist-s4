export interface SearchResult {
  id: string;
  type: 'artist'; // Only artists are searchable per PRD requirements
  title: string;
  subtitle?: string;
  meta?: string;
  imageUrl?: string;
  slug: string;
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
  } catch (_error) {
    return { results: [] };
  }
}

export function getSearchResultHref(result: SearchResult): string {
  // Only artists are searchable, so always return artist URL
  return `/artists/${result.slug}`;
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
