export function getApiUrl(path: string): string {
  // Use current app URL for API calls (no separate API app)
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiUrl}/api${cleanPath}`;
}

export function apiUrl(path: string): string {
  return getApiUrl(path);
}
