function normalizeUrl(url) {
  if (!url) return '';
  let normalized = url.trim().toLowerCase();
  if (normalized.startsWith('http')) {
    const urlObj = new URL(normalized);
    urlObj.hash = '';
    urlObj.search = '';
    normalized = urlObj.toString();
  } else {
    normalized = normalized.split('#')[0];
    normalized = normalized.split('?')[0];
  }
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

console.log(normalizeUrl("http://litera-test.local/laporan-eksklusif-skandal-korupsi-web3-terbesar-di-tahun-2026/"));
