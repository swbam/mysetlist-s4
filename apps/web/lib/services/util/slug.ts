/**
 * Utility function to generate URL-safe slugs from text
 */
export function generateSlug(text: string): string {
  if (!text) return "untitled";

  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug by appending a timestamp or counter if needed
 */
export function generateUniqueSlug(
  text: string,
  existingSlugs: string[] = [],
): string {
  const baseSlug = generateSlug(text);

  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  // Try with timestamp
  const timestamp = Date.now().toString().slice(-6);
  const timestampSlug = `${baseSlug}-${timestamp}`;

  if (!existingSlugs.includes(timestampSlug)) {
    return timestampSlug;
  }

  // Fallback to counter
  let counter = 1;
  let uniqueSlug = `${baseSlug}-${counter}`;

  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}

// Alias for backward compatibility
export const createSlug = generateSlug;