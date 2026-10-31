import { useEffect, useState } from 'react';
import axios from 'axios';
import { LITERA_ORIGIN } from '../../config';

const CACHE_TTL_MS = 5 * 60 * 1000;
const FAILURE_TTL_MS = 60 * 1000;

let cache: { at: number; ttl: number; liteToIdr: number | null } | null = null;

async function loadRate(): Promise<number | null> {
  const now = Date.now();
  if (cache && now - cache.at < cache.ttl) return cache.liteToIdr;

  try {
    const apiUrl = process.env.REACT_APP_BACKEND_URL || LITERA_ORIGIN;
    const res = await axios.get(`${apiUrl}/api/v1/pricing/rate`, { timeout: 5000 });
    const body = res.data?.data ?? res.data;
    const liteToIdr =
      body && body.configured === true && typeof body.liteToIdr === 'number' && body.liteToIdr > 0
        ? body.liteToIdr
        : null;
    cache = { at: now, ttl: CACHE_TTL_MS, liteToIdr };
    return liteToIdr;
  } catch {
    cache = { at: now, ttl: FAILURE_TTL_MS, liteToIdr: null };
    return null;
  }
}

/**
 * Kurs tampilan LITE→IDR untuk sisi pembaca.
 *
 * Endpoint dimatikan/gagal bukan alasan menampilkan LITE: nilai kembali `null`
 * dan pemanggil wajib memakai `formatReaderPrice()` yang menghasilkan 'Berbayar'.
 */
export function useLiteToIdr(): number | null {
  const [rate, setRate] = useState<number | null>(cache?.liteToIdr ?? null);

  useEffect(() => {
    let alive = true;
    loadRate()
      .then((value) => {
        if (alive) setRate(value);
      })
      .catch(() => {
        if (alive) setRate(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  return rate;
}
