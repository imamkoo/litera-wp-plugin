# Kebijakan Versi — Litera WordPress Plugin

Berlaku untuk `litera-plugin-v2-main` (widget + plugin WordPress).

## Sumber kebenaran versi

Empat tempat ini wajib bernilai sama:

| File | Lokasi |
|---|---|
| `litera.php` | header `Version:` |
| `package.json` | field `version` |
| `readme.txt` | `Stable tag:` |
| `release_notes.md` | bagian `## v<versi>` |

`npm run version:check` memvalidasi keempatnya. Workflow `deploy-cdn.yml` menjalankan gate ini **sebelum** build dan akan abort kalau tidak sinkron.

`litera.php` adalah sumber yang dibaca workflow untuk menulis `manifest.json` dan membuat tag `v<versi>` otomatis. Versi yang sama tampil di badge footer widget (`Powered by Litera`) sehingga QA bisa memastikan build mana yang live.

**Aturan keras:** setiap deploy wajib menaikkan versi, walau hanya satu baris berubah. Bundle disimpan immutable per hash, jadi rollback cukup mengarahkan `manifest.json` ke bundle lama — tanpa menurunkan nomor versi yang sudah terbit.

## PATCH — `1.4.x`

Perubahan yang tidak mengubah kontrak dengan publisher maupun pembaca.

- bugfix, race condition, penanganan error
- copy, styling, aksesibilitas, responsivitas
- patch keamanan yang tidak mengubah cara pakai
- performa, ukuran bundle, gateway IPFS
- refactor internal, test, logging

Syarat: publisher tidak perlu melakukan apa pun; artikel lama tetap jalan; tidak ada migrasi data.

## MINOR — `1.5.0`

Perubahan *backwards compatible* yang menambah permukaan baru sehingga perlu diketahui publisher.

- langkah atau alur baru di widget (contoh: quiz gate, local unlock cache, domain sponsor)
- atribut embed baru (`data-*`), key baru di `window.myReactPluginData`
- endpoint API baru, field response baru (additive)
- setting baru di dashboard publisher
- dependency baru yang menambah ukuran bundle secara signifikan
- perubahan format `manifest.json` yang masih kompatibel dengan loader lama

Syarat: situs yang sudah memasang embed tetap berfungsi **tanpa** perubahan apa pun.

Patokan praktis: **kalau ada satu baris di release notes yang harus dibaca publisher sebelum update, itu MINOR.**

## MAJOR — `2.0.0`

Hanya untuk *breaking change*. Salah satu dari:

1. **Kontrak embed berubah** — atribut `data-article`/`data-title` dihapus atau diganti nama, container `#litera` berubah, path `manifest.json`/`bundle.js` pindah, loader wajib diganti.
2. **Kontrak API rusak** — endpoint dihapus, field response di-rename atau dihapus, makna status code berubah.
3. **On-chain berubah** — alamat kontrak Writer/NFT baru, signature method `Mint`/`AdminMint` berubah, token lama tidak lagi terbaca widget.
4. **Migrasi data manual** — schema butuh langkah manual atau downtime, data lama tidak termigrasi otomatis.
5. **Dukungan platform dipangkas** — minimum WordPress/PHP naik, browser atau wallet tertentu tidak lagi didukung.
6. **Auth berubah dan memutus sesi lama** — format signature/SIWE berubah sehingga sesi pembaca invalid.

Checklist tambahan sebelum `2.0.0`:

- panduan migrasi langkah demi langkah untuk publisher
- bundle/loader lama tetap disajikan minimal satu siklus rilis
- rollback diuji (arahkan `manifest.json` ke bundle lama)
- release notes menandai `BREAKING CHANGE:` secara eksplisit
- diuji di minimal satu situs WordPress, satu situs non-WP (Next.js/web builder), dan satu mobile

## Checklist rilis

1. Bump `litera.php`, `package.json`, `readme.txt`, dan tambah bagian di `release_notes.md`.
2. `npm run version:check`
3. `npm run build`
4. Commit: `feat(plugin): release vX.Y.Z — <ringkasan>` atau `fix(plugin): release vX.Y.Z — <ringkasan>`.
5. Push ke `main` → workflow build, tag `vX.Y.Z`, deploy CDN.
6. Verifikasi: `curl -s https://cdn.literaa.xyz/manifest.json` → `version`, `commit`, `builtAt` cocok.
7. Perbarui dokumen QA kalau ada perilaku yang diuji manual.

## Riwayat lompatan MINOR

| Versi | Tanggal | Jumlah rilis |
|---|---|---|
| v1.0.0 | — | 22 |
| v1.1.0 | 2026-07-01 | 13 |
| v1.2.0 | 2026-07-05 | 28 |
| v1.3.0 | 2026-07-06 | 8 |
| v1.4.0 | 2026-08-07 | 80+ (aktif) |
