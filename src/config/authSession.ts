/**
 * Umur sesi login aplikasi (wallet, cloud wallet, maupun Privy email/Google).
 *
 * Default 24 jam. Ubah angka ini (atau set REACT_APP_AUTH_SESSION_TTL_MS saat
 * build) untuk mengganti durasi. Nilai 0 menonaktifkan auto-logout.
 */
const DEFAULT_AUTH_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const rawTtl = Number(process.env.REACT_APP_AUTH_SESSION_TTL_MS);

export const AUTH_SESSION_TTL_MS =
  Number.isFinite(rawTtl) && rawTtl >= 0
    ? rawTtl
    : DEFAULT_AUTH_SESSION_TTL_MS;

export const AUTH_SESSION_TTL_ENABLED = AUTH_SESSION_TTL_MS > 0;
