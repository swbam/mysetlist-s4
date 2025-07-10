export function parseGenres(
  input: string | string[] | null | undefined
): string[] {
  if (!input) {
    return [];
  }
  if (Array.isArray(input)) {
    return input.filter((g): g is string => typeof g === 'string');
  }
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed)
      ? parsed.filter((g): g is string => typeof g === 'string')
      : [];
  } catch {
    // Fallback: treat comma-separated string as list
    return input
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);
  }
}
