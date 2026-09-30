import { normalizeUrl } from './urlNormalizer';

describe('urlNormalizer (Enterprise Smart Client Sanitizer)', () => {
  it('strips tracking query params and preserves functional params in alphabetical order', () => {
    const dirty = 'https://mitra.com/post/?utm_source=twitter&slug=cerita-rakyat&fbclid=123&id=45#section';
    const clean = normalizeUrl(dirty);
    expect(clean).toBe('https://mitra.com/post?id=45&slug=cerita-rakyat');
  });

  it('normalizes uppercase hostnames while preserving case-sensitive paths', () => {
    const mixed = 'HTTPS://DOMAIN-MITRA.COM/Ceritaku/Catatan-Dari-Kelas/';
    const clean = normalizeUrl(mixed);
    expect(clean).toBe('https://domain-mitra.com/Ceritaku/Catatan-Dari-Kelas');
  });

  it('handles clean URLs with trailing slashes reliably', () => {
    const url = 'https://media.id/artikel-1/';
    expect(normalizeUrl(url)).toBe('https://media.id/artikel-1');
  });

  it('returns empty string on null or undefined input', () => {
    expect(normalizeUrl(null)).toBe('');
    expect(normalizeUrl(undefined)).toBe('');
  });
});
