# Spec Desain: Litera Universal Embed (Opsi B)

**Tanggal:** 2026-08-24
**Repo:** `litera-plugin-v2-main`
**Status:** Disetujui user (Axaa) — siap masuk implementation plan
**Prasyarat dokumen:** `litera/docs/2026-08-21-universal-embed-feasibility.md`

---

## 1. Masalah

Direksi meminta widget Litera bisa dipakai di luar WordPress. Laporan kelayakan
21 Agu menyimpulkan fondasi ~70% siap, dan mengusulkan Fase 1 membuat skrip embed.

Verifikasi ulang 24 Agu menemukan akar masalah yang lebih mendasar daripada
"belum ada skrip embed":

| Pemeriksaan | Hasil |
|---|---|
| `https://cdn.literaa.xyz/loader.js` | **HTTP 404** |
| `https://cdn.literaa.xyz/manifest.json` | HTTP 200, versi `1.3.7`, `bundle.62685965ca8e.js` |
| `https://cdn.literaa.xyz/bundle.62685965ca8e.js` | HTTP 200 |
| `deploy-cdn.yml` mem-publish `loader.js`? | **Tidak** — hanya `bundle.<hash>.js` + `manifest.json` |

Akibatnya: setiap situs non-WordPress yang mengikuti pola `cdn.literaa.xyz/loader.js`
(termasuk `LiteraWidget.tsx` di project LMHY) memuat skrip yang tidak ada. Embed
non-WordPress **secara faktual belum berjalan**, bukan sekadar belum rapi.

Jalur WordPress tidak terdampak: `litera.php` meng-enqueue `loader.js` dari
direktori plugin lokal (`plugin_dir_url(__FILE__) . 'loader.js'`), bukan dari CDN.

## 2. Tujuan & Non-Tujuan

### Tujuan
1. Embed di situs non-WordPress berjalan nyata, dapat diverifikasi.
2. Pengalaman penerbit sederhana: satu tag `<script>`, tanpa perlu tahu detail
   internal widget (`#my-react-plugin-root`, `window.myReactPluginData`).
3. Paket serah-terima untuk mitra: snippet HTML, snippet CSP, langkah pendaftaran domain.
4. Kontrak embed dirancang sebagai fondasi Fase D (API key, kuota, SaaS/PaaS) —
   penambahan, bukan penulisan ulang.

### Non-Tujuan (dicatat, tidak dikerjakan di iterasi ini)
- **Perampingan bundle 8.7 MB.** `build-combined.js` sengaja single-chunk
  (`splitChunks` dimatikan + `LimitChunkCountPlugin({maxChunks:1})`) karena
  `litera.php` merujuk satu berkas `bundle.js`. Mengubahnya berisiko regresi pada
  jalur WordPress yang sedang live. Tetap dicatat sebagai temuan terukur.
- API key, kuota per mitra, portal developer, SDK — lingkup Fase D.
- Sinkronisasi pustaka dompet plugin (`@web3modal/wagmi`) ke RainbowKit seperti dashboard.
- Perubahan `litera.php`. Jalur WordPress dibiarkan apa adanya.

## 3. Kesiapan Widget (verifikasi kode)

`src/App.tsx` baris 29–47 sudah CMS-agnostic:

```ts
if (typeof (window as any).myReactPluginData !== 'undefined') {
  // ambil permalink & title dari injeksi
} else {
  // fallback: window.location.href + document.title
}
```

Widget hanya butuh dua hal:
1. elemen penampung `<div id="my-react-plugin-root"></div>`
2. opsional `window.myReactPluginData = { permalink, title }`

Ketergantungan WordPress hanya ada di `litera.php` (103 baris). Inti widget tidak
perlu diubah untuk mendukung non-WordPress.

## 4. Keputusan Desain

### 4.1 Berkas baru `litera-embed.js`, bukan memperbaiki `loader.js`

**Keputusan:** buat `public/litera-embed.js` baru; `loader.js` dibiarkan utuh.

**Alasan:** `loader.js` adalah jalur WordPress yang sedang live (dikemas ke dalam
zip plugin oleh `package-plugin.sh` baris 37 dan di-enqueue `litera.php` baris 39).
Menambah tanggung jawab baru ke berkas itu berarti setiap perubahan embed non-WP
berisiko pada instalasi WordPress penerbit. Dua berkas terpisah = dua jalur yang
gagal secara independen.

Konsekuensi: ada duplikasi logika fetch-manifest ±15 baris antara keduanya.
Diterima sebagai harga isolasi.

### 4.2 Kontrak antarmuka penerbit

```html
<script src="https://cdn.literaa.xyz/litera-embed.js"
        data-article-url="https://situs-anda.com/artikel-saya"
        async></script>
```

| Atribut | Wajib | Perilaku bila kosong |
|---|---|---|
| `data-article-url` | Tidak | fallback ke `window.location.href` |
| `data-title` | Tidak | fallback ke `document.title` |
| `data-target` | Tidak | auto-buat container tepat sebelum tag skrip |

Semua atribut opsional. Kasus paling umum — penerbit menempel satu tag di halaman
artikel — bekerja tanpa konfigurasi apa pun.

### 4.3 Penempatan container

Bila `data-target` tidak diberikan dan `#my-react-plugin-root` belum ada, embed
membuat `<div id="my-react-plugin-root">` dan menyisipkannya **tepat sebelum tag
skrip** (`script.parentNode.insertBefore(div, script)`). Ini membuat posisi widget
dapat diprediksi oleh penerbit: widget muncul di tempat mereka menempel skrip.

Bila container sudah ada (mis. penerbit membuat sendiri, atau jalur WordPress),
embed memakai yang ada dan tidak membuat duplikat.

### 4.4 Idempotensi

Guard `window.__literaEmbedLoaded`. Bila skrip termuat dua kali (CMS yang meng-inject
di dua tempat, atau navigasi SPA), inject bundle hanya terjadi sekali.

## 5. Alur Kerja

```
1. Penerbit tempel <script src=".../litera-embed.js" data-article-url="...">
2. litera-embed.js:
   a. cek guard __literaEmbedLoaded → berhenti bila sudah
   b. baca atribut data-* dari document.currentScript
   c. pastikan container ada (pakai yang ada / buat baru sebelum tag skrip)
   d. set window.myReactPluginData = { permalink, title }
   e. fetch cdn.literaa.xyz/manifest.json (cache: no-cache)
   f. inject <script src="cdn.literaa.xyz/bundle.<hash>.js">
      timeout 3 dtk → fallback window.literaLocalBundle bila tersedia
3. Bundle mount React ke #my-react-plugin-root (src/index.tsx baris 35)
4. App.tsx baca myReactPluginData → normalizeUrl → on-chain getIdFromArticleURL
5. Bila tidak ketemu → GET /api/v1/articles/resolve?url=... (dual-generation)
6. Render LiteraWidget (mint / unlock / login) atau state "belum diterbitkan"
```

## 6. Publikasi ke CDN

`deploy-cdn.yml` ditambah langkah publish `litera-embed.js` ke `CDN_DIR`
(`/var/www/html/wp`), mengikuti pola dua-fase yang sudah ada:

1. salin berkas + `chown www-data:www-data`
2. verifikasi `curl` mengembalikan HTTP 200 sebelum dianggap sukses

Berbeda dari bundle, `litera-embed.js` **tidak** di-hash — URL-nya adalah kontrak
publik yang ditempel penerbit di HTML mereka, jadi harus stabil. Konsekuensinya
berkas ini perlu header `Cache-Control` pendek, bukan `immutable` seperti bundle
ber-hash. Nilai cache diatur di Nginx VPS (di luar repo); dicatat sebagai langkah ops.

Deploy ke VPS dieksekusi hanya setelah konfirmasi eksplisit user — VPS dipakai
bersama pihak lain.

## 7. Prasyarat di Luar Kendali Litera

### 7.1 Content-Security-Policy penerbit
Situs dengan CSP ketat (`script-src 'self'`) akan memblokir embed. Penerbit perlu
menambahkan:

```
script-src  'self' https://cdn.literaa.xyz;
connect-src 'self' https://literaa.xyz https://cdn.literaa.xyz
            https://polygon-bor-rpc.publicnode.com
            https://1rpc.io
            https://polygon.llamarpc.com;
```

CSP ditegakkan browser pengunjung, tidak dapat dilewati dari sisi kode Litera.

### 7.2 CORS allowlist backend
`litera-backend-main/src/main.ts` baris 21–33 memakai allowlist tertutup berisi 11
domain. Origin di luar daftar ditolak (`Not allowed by CORS`). Domain penerbit baru
**wajib** ditambahkan ke daftar ini agar `articles/resolve` dapat dipanggil dari browser.

Terverifikasi: `Origin: https://aryadhana.id` → `access-control-allow-origin: https://aryadhana.id` (200).

Allowlist tertutup ini dipertahankan, tidak dibuka menjadi `*`. Justru inilah titik
tempat Fase D memasang kontrol per-mitra.

### 7.3 Artikel harus terdaftar
`GET /api/v1/articles/resolve?url=<url>` mengembalikan
`404 Article not registered in any generation` untuk URL yang belum diterbitkan
sebagai NFT. Untuk demo, satu artikel penerbit harus diterbitkan lebih dahulu
melalui dashboard Litera.

## 8. Verifikasi

| Lapis | Cara |
|---|---|
| Unit | Test Node untuk parsing atribut, pembuatan container, guard idempotensi — tanpa framework baru |
| Statis | Berkas adalah IIFE ES5-kompatibel, tanpa dependency, dapat dimuat browser lama |
| Integrasi lokal | Halaman HTML statis + `python3 -m http.server`, verifikasi container terbuat & bundle ter-request |
| CDN | Setelah deploy: `curl -o /dev/null -w '%{http_code}' https://cdn.literaa.xyz/litera-embed.js` = 200 |
| End-to-end | Halaman demo memuat widget dan menampilkan state yang benar (mint / belum diterbitkan) |
| Regresi WordPress | `loader.js`, `litera.php`, `package-plugin.sh` tidak berubah — dipastikan lewat `git diff` |

## 9. Risiko

| Risiko | Mitigasi |
|---|---|
| Penerbit memakai CSP ketat | Sediakan snippet CSP; opsi cadangan integrasi sisi server |
| Bundle 8.7 MB memperlambat situs mitra | Diakui terbuka di dokumentasi penerbit; perampingan jadi item terpisah |
| Bundle CDN masih 1.3.7 (plugin lokal 1.4.0) | Deploy CDN akan membangun ulang dari `main`, menaikkan versi otomatis |
| `litera-embed.js` ter-cache lama di edge Cloudflare | Header cache pendek; akses purge Cloudflare belum tersedia (tercatat di Notion Security & Audit) |
| Duplikasi logika dengan `loader.js` | Diterima; imbalannya isolasi jalur WP dari jalur embed |

## 10. Jembatan ke Fase D (SaaS/PaaS)

Arah akhir yang diinginkan adalah platform dengan monetisasi. Desain ini menyiapkan
tiga titik sambung agar D menjadi penambahan, bukan penulisan ulang:

1. **Atribut `data-*`** — `data-api-key` cukup ditambahkan sebagai atribut baru;
   parser sudah generik.
2. **CORS allowlist tertutup** — sudah menjadi daftar per-domain. Fase D
   memindahkannya dari konstanta ke basis data berisi tabel mitra + kuota.
3. **URL embed stabil tanpa hash** — memungkinkan versioning eksplisit di masa depan
   (`/v1/litera-embed.js`) tanpa memutus penerbit yang sudah memasang.

Yang belum ada dan tetap menjadi pekerjaan D: tabel kunci API, pembatas laju
per-kunci, portal developer, dokumentasi publik, SDK, dan komitmen tingkat layanan.

## 11. Rencana Kerja

- [ ] T1 — `public/litera-embed.js`: IIFE, parse atribut, container, guard, fetch manifest, fallback
- [ ] T2 — Test unit untuk logika T1
- [ ] T3 — Verifikasi integrasi lokal via halaman HTML statis
- [ ] T4 — `deploy-cdn.yml`: langkah publish + verifikasi `litera-embed.js`
- [ ] T5 — Dokumentasi penerbit: snippet HTML, snippet CSP, langkah CORS, catatan ukuran bundle
- [ ] T6 — Pastikan `git diff` tidak menyentuh `loader.js` / `litera.php` / `package-plugin.sh`
- [ ] T7 — Commit + push `main`; deploy CDN setelah konfirmasi user
