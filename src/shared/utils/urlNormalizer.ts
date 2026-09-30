/**
 * Normalizes an article URL to ensure consistent on-chain and resolver lookups.
 * 
 * Rules (Aligned with Backend Selective Query Sanitizer):
 * 1. Convert hostname to lowercase, retain case-sensitive pathname.
 * 2. Remove URL hashes (#...).
 * 3. Preserve functional content query parameters ('slug', 'id', 'p', 'article', 'post') in sorted order.
 * 4. Strip tracking/ad query parameters ('utm_*', 'fbclid', 'gclid', 'ref', 'source', etc.).
 * 5. Remove trailing slashes (/).
 * 
 * Example:
 * https://domain.com/Post/?utm_source=twitter&slug=hello#comments -> https://domain.com/Post?slug=hello
 */
export const FUNCTIONAL_PARAMS = new Set(['slug', 'id', 'p', 'article', 'post']);

export const normalizeUrl = (url: string | undefined | null): string => {
  if (!url) return '';

  try {
    const raw = url.trim();
    if (!raw) return '';

    let urlObj: URL;
    try {
      urlObj = new URL(raw);
    } catch {
      urlObj = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    }

    urlObj.hash = '';

    const preservedParams: [string, string][] = [];
    urlObj.searchParams.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (FUNCTIONAL_PARAMS.has(lowerKey)) {
        preservedParams.push([lowerKey, value]);
      }
    });

    preservedParams.sort((a, b) => a[0].localeCompare(b[0]));

    const searchParams = new URLSearchParams();
    for (const [key, value] of preservedParams) {
      searchParams.append(key, value);
    }

    const searchString = searchParams.toString();
    const queryPart = searchString ? `?${searchString}` : '';

    let pathname = urlObj.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    return `${urlObj.protocol}//${urlObj.hostname.toLowerCase()}${urlObj.port ? `:${urlObj.port}` : ''}${pathname}${queryPart}`;
  } catch (error) {
    let fallback = (url || '').trim();
    fallback = fallback.split('#')[0];
    fallback = fallback.split('?')[0];
    if (fallback.endsWith('/') && fallback.length > 1) {
      fallback = fallback.slice(0, -1);
    }
    return fallback;
  }
};
