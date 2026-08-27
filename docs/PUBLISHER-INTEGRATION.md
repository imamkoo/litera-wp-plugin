# Litera — Pasang Widget NFT di Website Anda

Widget Litera menambahkan tombol **Mint NFT** dan **Unlock Konten Premium** di halaman artikel Anda, terhubung ke Polygon mainnet. Penerbit tidak perlu paham blockchain — cukup dua langkah di bawah.

---

## Cara Kerja Singkat

```
Pembaca buka artikel Anda
        │
        ▼
Widget Litera load dari CDN
        │
        ▼
Cari artikel Anda berdasarkan URL → dapat tokenId NFT
        │
        ├─ Pembaca belum login   → tampil "Masuk ke Litera"
        ├─ Belum punya NFT       → tampil "Mint NFT" (bila tersedia)
        ├─ Sudah punya NFT       → tampil "Buka Konten Premium"
        └─ Artikel belum terbit  → tampil "Belum diterbitkan sebagai NFT"
```

Semua proses (lookup on-chain, wallet login, mint) ditangani widget. Anda hanya menempel script-nya.

---

## Langkah 1 — Daftarkan Domain Anda

Backend Litera memakai allowlist tertutup (CORS). Kirim ke tim Litera:

1. **Nama domain** situs Anda (contoh: `https://mediasaya.com`)
2. **Kontak teknis** (email/WhatsApp) untuk verifikasi

Setelah didaftarkan, tim akan mengonfirmasi. Proses biasanya < 1 hari kerja.

## Langkah 2 — Tempel Satu Baris Script

Letakkan tag ini di halaman artikel, tepat di bawah konten:

```html
<script src="https://cdn.literaa.xyz/litera-embed.js" async></script>
```

**Selesai.** Widget otomatis membaca URL dan judul halaman.

### Versi Lengkap (Opsional)

```html
<script
  src="https://cdn.literaa.xyz/litera-embed.js"
  data-article-url="https://mediasaya.com/artikel/judul-artikel"
  data-title="Judul Artikel Anda"
  async
></script>
```

| Atribut | Wajib | Default | Keterangan |
|---|---|---|---|
| `src` | Ya | — | URL loader widget |
| `data-article-url` | Tidak | URL halaman saat ini | URL kanonik artikel untuk lookup NFT |
| `data-title` | Tidak | `<title>` halaman | Judul tampilan di widget |
| `async` | Disarankan | — | Agar script tidak memblokir render halaman |

> **Penting:** `data-article-url` harus sama persis dengan URL yang didaftarkan tim Litera saat menerbitkan artikel Anda sebagai NFT.

---

## Catatan untuk CMS Buatan Sendiri

Tidak punya WordPress dan tidak pakai framework populer? Widget tetap jalan — syaratnya hanya dua:

1. **Template artikel Anda bisa menyisipkan satu tag `<script>`** dengan URL kanonik yang di-output dinamis dari data CMS (contoh PHP lengkap ada di [Appendix A](#appendix-a--contoh-per-platform)).
2. **Domain terdaftar** di allowlist Litera (Langkah 1) — untuk portal partner lama (`satuguru.id`, `litera.id`, `aryadhana.id`, `litebrary.id`, dll.) domainnya sudah terdaftar.

Contoh minimal di template PHP kustom — sesuaikan `$canonicalUrl` dan `$title` dengan variabel sistem Anda:

```php
<script src="https://cdn.literaa.xyz/litera-embed.js"
        data-article-url="<?php echo htmlspecialchars($canonicalUrl); ?>"
        data-title="<?php echo htmlspecialchars($title); ?>"
        async></script>
```

Ingat: artikel juga harus **diterbitkan sebagai NFT melalui dashboard Litera** agar widget menampilkan UI mint/unlock — pemasangan script saja belum cukup.

---

## Verifikasi Cepat

Setelah dipasang, buka halaman artikel lalu cek DevTools (F12):

1. **Network tab** — ketiga request ini harus HTTP 200:
   - `litera-embed.js`
   - `manifest.json`
   - `bundle.<hash>.js`
2. **Console** — tidak ada error CORS merah
3. **Halaman** — widget muncul di bawah artikel

---

## Troubleshooting

### Widget tidak muncul
- Cek Network: ada request yang gagal/blocked? → lihat Appendix B (CSP)
- Ada error CORS merah? → domain belum terdaftar; ulangi Langkah 1
- Verifikasi manual:
  ```bash
  curl -I https://literaa.xyz/api/v1/health
  ```
  Sertakan output ini saat menghubungi support.

### Muncul "Artikel ini belum diterbitkan sebagai NFT"
- Artikel Anda belum diterbitkan sebagai NFT oleh tim Litera — hubungi tim.
- Atau `data-article-url` tidak persis sama dengan yang terdaftar di sistem.

### Widget muncul tapi gagal mint
- Pastikan wallet pembaca terhubung dan berada di jaringan Polygon.
- Kuota mint artikel mungkin sudah habis (sold out).

---

## Catatan Performa

Bundle widget ±8 MB (berisi wallet connector + Privy auth). Untuk situs sensitif performa, gunakan lazy-load di **Appendix C**.

---

## Appendix A — Contoh per Platform

### Next.js (App Router)

```tsx
"use client";
import { useEffect } from "react";

export function LiteraEmbed({ title }: { title: string }) {
  useEffect(() => {
    if (document.getElementById("litera-embed-script")) return;
    const s = document.createElement("script");
    s.id = "litera-embed-script";
    s.src = "https://cdn.literaa.xyz/litera-embed.js";
    s.dataset.articleUrl = window.location.href;
    s.dataset.title = title;
    s.async = true;
    document.body.appendChild(s);
  }, [title]);

  return <div id="my-react-plugin-root" className="mt-8" />;
}
```

Pakai di halaman artikel: `<LiteraEmbed title={article.title} />`.

Demo live: `letmehearyou.id` (situs Next.js produksi).

### Laravel Blade

```blade
{{-- resources/views/article/show.blade.php --}}
<article>
  <h1>{{ $article->title }}</h1>
  <div class="prose">{!! $article->content !!}</div>

  <script src="https://cdn.literaa.xyz/litera-embed.js"
          data-article-url="{{ $article->canonical_url }}"
          data-title="{{ $article->title }}"
          async></script>
</article>
```

### PHP Statis / Kustom

```php
<article>
  <h1><?php echo htmlspecialchars($article['title']); ?></h1>

  <script src="https://cdn.literaa.xyz/litera-embed.js"
          data-article-url="<?php echo htmlspecialchars($canonicalUrl); ?>"
          data-title="<?php echo htmlspecialchars($article['title']); ?>"
          async></script>
</article>
```

### React (Vite / CRA)

```tsx
import { useEffect } from "react";

export function LiteraEmbed({ articleUrl, title }: { articleUrl: string; title: string }) {
  useEffect(() => {
    (window as any).myReactPluginData = { permalink: articleUrl, title };
    const s = document.createElement("script");
    s.src = "https://cdn.literaa.xyz/litera-embed.js";
    s.setAttribute("data-article-url", articleUrl);
    s.setAttribute("data-title", title);
    s.async = true;
    document.body.appendChild(s);
  }, [articleUrl, title]);

  return <div id="my-react-plugin-root" />;
}
```

### WordPress

Gunakan plugin resmi (download dari [GitHub Releases](https://github.com/imamkoo/litera-wp-plugin/releases)) — widget otomatis muncul di semua artikel, termasuk auto-update. Tanpa plugin, tempel script seperti contoh HTML di atas via block Custom HTML.

---

## Appendix B — Content-Security-Policy (CSP)

Jika situs memakai CSP, whitelist domain berikut:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.literaa.xyz;
  connect-src 'self'
    https://literaa.xyz
    https://cdn.literaa.xyz
    https://polygon-bor-rpc.publicnode.com
    https://1rpc.io
    https://polygon.llamarpc.com;
  img-src 'self' data: https:;
  style-src 'self' 'unsafe-inline';
  font-src 'self' data:;
```

Tanpa ini, browser memblokir loader script, panggilan API, dan koneksi RPC Polygon.

---

## Appendix C — Lazy-Load (Opsional)

Muat widget hanya saat pembaca scroll mendekati lokasinya:

```html
<div id="my-react-plugin-root"></div>
<link rel="preconnect" href="https://cdn.literaa.xyz" crossorigin>
<script>
  (function () {
    var root = document.getElementById('my-react-plugin-root');
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        var s = document.createElement('script');
        s.src = 'https://cdn.literaa.xyz/litera-embed.js';
        s.async = true;
        document.body.appendChild(s);
        io.disconnect();
      }
    });
    io.observe(root);
  })();
</script>
```

`<link rel="preconnect">` opsional tapi disarankan — mempersingkat handshake ke CDN.

---

## Dukungan

- **Email:** teknis@litera.id
- **Registrasi domain (Langkah 1):** sertakan nama domain + kontak teknis
- **Laporan bug:** https://github.com/imamkoo/litera-wp-plugin/issues

Saat menghubungi support, sertakan: domain situs, screenshot error (bila ada), dan output `curl -I https://literaa.xyz/api/v1/health`.
