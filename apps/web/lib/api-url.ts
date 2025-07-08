export function getApiUrl(path: string): string {
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3002';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiUrl}${cleanPath}`;
}

export function apiUrl(path: string): string {
  return getApiUrl(path);
}
