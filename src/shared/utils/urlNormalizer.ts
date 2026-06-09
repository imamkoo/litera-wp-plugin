/**
 * Normalizes an article URL to ensure consistent on-chain lookups.
 * 
 * Rules:
 * 1. Convert to lowercase
 * 2. Remove URL hashes (#...)
 * 3. Remove query parameters (?utm_source=...)
 * 4. Remove trailing slashes (/)
 * 
 * Example:
 * https://domain.com/Post/?utm=123#comments -> https://domain.com/post
 */
export const normalizeUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  
  try {
    let normalized = url.trim().toLowerCase();

    // Try parsing as a URL object to reliably strip hash and search params
    // If it's not a valid URL (e.g. just a path), we fallback to regex
    if (normalized.startsWith('http')) {
      const urlObj = new URL(normalized);
      urlObj.hash = '';
      urlObj.search = '';
      normalized = urlObj.toString();
    } else {
      // Manual strip for non-http strings
      normalized = normalized.split('#')[0];
      normalized = normalized.split('?')[0];
    }

    // Remove trailing slash
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  } catch (error) {
    console.error("URL Normalization error:", error);
    // Fallback to basic string manipulation if URL constructor fails
    let fallback = url.trim().toLowerCase();
    fallback = fallback.split('#')[0];
    fallback = fallback.split('?')[0];
    if (fallback.endsWith('/')) {
      fallback = fallback.slice(0, -1);
    }
    return fallback;
  }
};
