/**
 * Slug generation utility.
 * Converts a string into a URL-friendly slug.
 */

/**
 * Generate a URL-friendly slug from a string.
 * @param {string} text
 * @returns {string}
 */
export function generateSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')    // Remove non-word characters (except hyphens)
    .replace(/\-\-+/g, '-')     // Replace multiple hyphens with single
    .replace(/^-+/, '')          // Trim leading hyphens
    .replace(/-+$/, '');         // Trim trailing hyphens
}

