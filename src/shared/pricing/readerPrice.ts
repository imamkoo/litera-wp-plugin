import { formatUnits } from 'viem';

export type ReaderPriceKind = 'free' | 'fiat' | 'unknown';

export interface ReaderPrice {
  kind: ReaderPriceKind;
  /** 'Gratis' | '≈ Rp1.500' | 'Berbayar' */
  label: string;
}

const idrFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export function formatIdr(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return 'Rp0';
  return `Rp${idrFormatter.format(Math.max(1, Math.round(amount)))}`;
}

/**
 * Harga untuk pembaca widget.
 *
 * Pembaca tidak boleh melihat satuan LITE dalam bentuk apa pun (arahan direksi).
 * Bila kurs belum ditetapkan atau endpoint kurs gagal, tampilkan label netral
 * 'Berbayar' — jangan pernah jatuh kembali ke LITE.
 */
export function formatReaderPriceFromLite(
  lite: number | null | undefined,
  liteToIdr: number | null | undefined,
): ReaderPrice {
  if (typeof lite !== 'number' || !Number.isFinite(lite) || lite <= 0) {
    return { kind: 'free', label: 'Gratis' };
  }

  if (typeof liteToIdr !== 'number' || !Number.isFinite(liteToIdr) || liteToIdr <= 0) {
    return { kind: 'unknown', label: 'Berbayar' };
  }

  const idr = lite * liteToIdr;
  if (!Number.isFinite(idr) || idr <= 0) {
    return { kind: 'unknown', label: 'Berbayar' };
  }

  return { kind: 'fiat', label: `≈ ${formatIdr(idr)}` };
}

/** Harga pembaca dari harga on-chain (wei, 18 desimal). */
export function formatReaderPrice(
  priceWei: bigint | string | null | undefined,
  liteToIdr: number | null | undefined,
): ReaderPrice {
  let wei: bigint;
  try {
    wei = BigInt(priceWei ?? 0);
  } catch {
    return { kind: 'unknown', label: 'Berbayar' };
  }

  if (wei <= 0n) return { kind: 'free', label: 'Gratis' };
  return formatReaderPriceFromLite(Number(formatUnits(wei, 18)), liteToIdr);
}
