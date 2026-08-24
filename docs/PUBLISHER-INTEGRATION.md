# Dokumentasi Penerbit — Litera Universal Embed

Panduan singkat untuk memasang widget Litera di situs **non-WordPress** (Next.js, Laravel, PHP kustom, statis, dll.).

---

## 1. Pemasangan Paling Sederhana (Disarankan)

Tempel satu tag ini di halaman artikel (di manapun — `head`, `body` akhir, atau di tengah konten):

```html
<script src="https://cdn.literaa.xyz/litera-embed.js"
        data-article-url="https://situs-anda.com/artikel-saya"
        async></script>
```

**Selesai.** Widget akan otomatis:
- Membuat container `#my-react-plugin-root` di tempat tag ditempel
- Menggunakan URL artikel dari `data-article-url` (atau URL halaman bila tidak diberikan)
- Mengambil judul dari `data-title` (atau `<title>` halaman bila tidak diberikan)
- Memuat manifest & bundle terbaru dari CDN (fallback 3 detik)

---

## 2. Atribut Lengkap

| Atribut | Wajib | Default | Keterangan |
|---|---|---|---|
| `data-article-url` | Tidak | `window.location.href` | URL kanonik artikel untuk pencarian NFT di Litera |
| `data-title` | Tidak | `document.title` | Judul tampilan di widget |
| `data-target` | Tidak | (auto) | ID container kustom; bila tidak, container auto-dibuat sebelum tag skrip |

Contoh lengkap:
```html
<script src="https://cdn.literaa.xyz/litera-embed.js"
        data-article-url="https://aryadhana.id/article.php?slug=proklamator-bung-hatto"
        data-title="Proklamator Bung Hatto Gandeng KMP Aryadhana Kembangkan Swarapedia"
        async></script>
```

---

## 3. Persyaratan di Sisi Penerbit (Wajib Dibaca)

### 3.1 Content-Security-Policy (CSP)
Jika situs Anda memakai CSP, tambahkan domain Litera ke daftar putih:

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

Tanpa ini, browser akan memblokir skrip `litera-embed.js`, panggilan API ke `literaa.xyz`, dan RPC Polygon.

### 3.2 Pendaftaran Domain ke CORS Backend
Backend Litera memakai allowlist tertutup. Domain penerbit **harus** didaftarkan agar `articles/resolve` berfungsi.

Kirim ke tim Litera:
- Nama domain (contoh: `https://aryadhana.id`)
- Kontak teknis untuk verifikasi

Setelah didaftarkan, endpoint `https://literaa.xyz/api/v1/articles/resolve?url=...` akan mengembalikan `access-control-allow-origin: https://domain-anda` (200).

### 3.3 Artikel Harus Sudah Diterbitkan Sebagai NFT
Widget hanya menampilkan UI mint/unlock bila artikel sudah dipublikasikan sebagai NFT melalui dashboard Litera. Untuk uji coba, minta tim Litera menerbitkan satu artikel demo Anda.

---

## 4. Catatan Penting

### Ukuran Bundle (8.7 MB)
Bundle saat ini ~8.7 MB (gabungan wallet connector, Privy, wagmi, viem). Kami sadar ini besar untuk widget pihak ketiga. Penerbit yang sensitif performa disarankan:
- Memuat embed hanya saat artikel terlihat (lazy-load manual, mis. `IntersectionObserver`)
- Atau menunggu rilis mendatang dengan code-splitting

### Integrasi Sisi Server (Alternatif Bila CSP Tidak Bisa Diubah)
Backend penerbit memanggil API Litera dari server mereka, lalu merender di template. Hubungi tim Litera untuk detail pola ini.

---

## 5. Contoh Integrasi di Framework Populer

### Next.js (App Router)
```tsx
// src/app/artikel/[slug]/page.tsx
export default function ArtikelPage({ params }) {
  return (
    <article>
      <h1>{params.title}</h1>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              var s = document.createElement('script');
              s.src = 'https://cdn.literaa.xyz/litera-embed.js';
              s.setAttribute('data-article-url', '${params.canonicalUrl}');
              s.setAttribute('data-title', '${params.title.replace(/'/g, "\\'")}');
              s.async = true;
              document.currentScript.parentNode.insertBefore(s, document.currentScript);
            })();
          `
        }}
      />
    </article>
  );
}
```

### Laravel Blade
```blade
{{-- resources/views/article/show.blade.php --}}
@extends('layouts.app')

@section('content')
<article>
  <h1>{{ $article->title }}</h1>
  <div class="prose">{{ $article->content }}</div>

  <script src="https://cdn.literaa.xyz/litera-embed.js"
          data-article-url="{{ $article->canonical_url }}"
          data-title="{{ $article->title }}"
          async></script>
</article>
@endsection
```

### HTML Statis / PHP Kustom
```php
<!-- article.php?slug=... -->
<article>
  <h1><?php echo htmlspecialchars($article['title']); ?></h1>
  <script src="https://cdn.literaa.xyz/litera-embed.js"
          data-article-url="<?php echo htmlspecialchars($canonicalUrl); ?>"
          data-title="<?php echo htmlspecialchars($article['title']); ?>"
          async></script>
</article>
```

---

## 6. Verifikasi Cepat

Setelah pasang, buka halaman artikel dan periksa:

1. **DevTools → Network** — `litera-embed.js` **200**, lalu `manifest.json` **200**, lalu `bundle.<hash>.js` **200**
2. **Console** — tidak ada error CORS merah
3. **Halaman** — widget muncul di bawah artikel (state: "Masuk ke Litera" / "Mint NFT" / "Artikel belum diterbitkan")

---

## 7. Dukungan

- Email: teknis@litera.id
- Butuh bantuan CSP/CORS? Kirim domain + header response `literaa.xyz/api/v1/health`
- Request register domain ke CORS allowlist: sertakan nama domain + contact teknis