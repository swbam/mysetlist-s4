import { getBaseUrl } from './utils';

export function absoluteUrl(path: string) {
  const base = getBaseUrl();
  if (path.startsWith('/')) {
    return `${base}${path}`;
  }
  return `${base}/${path}`;
}
