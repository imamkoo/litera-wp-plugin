# Mitigasi Risiko Dependensi — zod (GHSA-mrhx-c7xc-m3w5)

- **Status:** diterima dengan mitigasi (*accepted risk*)
- **Tanggal keputusan:** 2 November 2026
- **Pemilik keputusan:** Axaa
- **Cakupan:** repo widget (`litera-plugin-v2-main`)

## 1. Temuan

| Field | Nilai |
|---|---|
| Paket | `zod` |
| Advisory | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) / CVE-2023-54404 |
| Severity | **High** |
| Versi rentan | `< 4.6.6` |
| Versi perbaikan | `>= 4.6.6` |
| Jenis | *uncontrolled resource consumption* (memory exhaustion / DoS) |

Ringkasan: `$ZodArray` mengumpulkan seluruh issue validasi per elemen tanpa batas dan tanpa
berhenti lebih awal. Array sangat besar pada schema yang tidak membatasi panjang akan menghabiskan
memori proses.

## 2. Jalur masuk di repo ini

Widget tidak memakai `zod` secara langsung. Paket masuk transitif melalui SDK wallet:

```
@privy-io/react-auth ^3.36.1
└── x402 → wagmi → @wagmi/connectors → @walletconnect/ethereum-provider
    └── @reown/appkit* → zod
```

Versi terpasang saat audit (2 Nov 2026):

| Lokasi | Versi |
|---|---|
| `node_modules/zod` (top-level) | 3.22.4 |
| `node_modules/@coinbase/cdp-sdk/node_modules/zod` | 3.25.76 |
| `node_modules/@privy-io/api-base/node_modules/zod` | 3.25.76 |
| `node_modules/x402/node_modules/zod` | 3.25.76 |
| `node_modules/@wagmi/connectors/node_modules/zod` | 4.4.3 |
| `node_modules/porto/node_modules/zod` | 4.4.3 |

Semuanya di bawah `4.6.6`.

## 3. Penilaian dampak

- **Vektor:** dApp/WalletConnect proposal mengirim array sangat besar ke schema zod milik SDK wallet
  yang berjalan **di halaman artikel pembaca** (widget di-embed di situs penerbit).
- **Prasyarat:** pembaca menekan setuju saat menyambungkan wallet. Widget tidak pernah menyambung
  wallet otomatis dan tidak pernah menandatangani transaksi tanpa aksi pengguna.
- **Dampak nyata:** tab pembaca kehabisan memori lalu *crash*. Tidak ada pencurian kunci privat dan
  tidak ada transaksi tanpa persetujuan.
- **Karena widget di-embed di domain penerbit**, dampak crash hanya mengenai tab tersebut, bukan
  seluruh situs penerbit.

## 4. Kenapa belum diperbaiki sekarang

- `zod` 3 → 4 adalah perubahan mayor; rantai `@reown/appkit` masih memakai tipe zod 3.
- Memaksa `resolutions: zod ^4.6.6` berisiko mematahkan modal wallet di widget — jalur login pembaca.
- Perbaikan yang benar adalah upgrade mayor `@privy-io/react-auth` (beserta `@reown/appkit*`) sebagai
  proyek migrasi terpisah, dengan uji coba pada halaman artikel nyata sebelum rilis.

## 5. Kontrol kompensasi

- Wallet hanya tersambung setelah pembaca menekan tombol dan menyetujui di dompet.
- Semua transaksi (mint/unlock) tetap butuh tanda tangan eksplisit.
- Tidak ada penyimpanan kunci privat di widget; widget hanya meminta tanda tangan.
- Rilis widget memakai build yang diuji (`yarn build`) sebelum diunggah ke CDN.

## 6. Kondisi untuk membuka ulang

1. `@privy-io/react-auth` / `@reown/appkit*` menaikkan `zod` ke `>= 4.6.6` → cukup upgrade dependency.
2. Muncul advisory lanjutan dengan dampak RCE atau kebocoran kunci pada paket yang sama.
3. Review berkala pada setiap audit dependensi, maksimal 3 bulan sekali.

## 7. Perintah verifikasi

```bash
yarn audit --groups dependencies --level high
yarn why zod
```

Hasil acuan 2 November 2026: **1 advisory high unik** (zod), critical 0. Angka "18 high" pada
ringkasan `yarn audit` berasal dari banyak jalur dependensi menuju paket yang sama.

## 8. Konteks audit lintas repo (2 Nov 2026)

| Repo | High | Critical |
|---|---|---|
| `litera-backend-main` (prod deps) | 0 | 0 |
| `dashbord-nft-wp-plugin-v2-main` (prod deps) | 1 advisory unik (zod) | 0 |
| `litera-plugin-v2-main` (prod deps) | 1 advisory unik (zod) | 0 |
