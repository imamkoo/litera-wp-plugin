import { useEffect, useRef } from 'react';

interface UseAutoLogoutOptions {
  isAuthenticated: boolean;
  /** Kunci identitas (alamat wallet). Perubahan identitas memulai ulang TTL. */
  identity?: string | null;
  ttlMs: number;
  enabled?: boolean;
  onExpire: () => void | Promise<void>;
}

/**
 * Timer logout absolut: mulai saat sesi terdeteksi aktif dan berakhir setelah
 * ttlMs. Timer tidak diperpanjang oleh navigasi atau aktivitas UI.
 */
export function useAutoLogout({
  isAuthenticated,
  identity,
  ttlMs,
  enabled = true,
  onExpire,
}: UseAutoLogoutOptions): void {
  const onExpireRef = useRef(onExpire);
  const firedRef = useRef(false);

  onExpireRef.current = onExpire;

  useEffect(() => {
    firedRef.current = false;

    if (!enabled || !isAuthenticated || ttlMs <= 0) return;

    const timer = setTimeout(() => {
      if (firedRef.current) return;
      firedRef.current = true;
      void onExpireRef.current();
    }, ttlMs);

    return () => clearTimeout(timer);
  }, [enabled, isAuthenticated, identity, ttlMs]);
}
