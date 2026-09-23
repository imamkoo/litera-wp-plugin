# Litera WordPress Plugin Release Notes

## v1.4.37 (Widget Free Mint Uses Gas Station)
- **Latar:** Mint artikel gratis di widget tetap `Mint()` dari dompet pembaca, jadi gagal dengan pesan "butuh POL" meski gas station di admin tools aktif.
- **Perbaikan (`LiteraWidget.tsx`):** artikel harga 0 memanggil `POST /api/v1/relayer/mint` (tanda tangan yang sama dengan dashboard). Saklar tetap toggle **Aktifkan Fitur** di Pusat Kendali Gas. Bila relayer mati (503), widget jatuh kembali ke mint berbayar gas.

## v1.4.36 (Disable Connect Button While Wallet Auth Popup Is Open)
- **Latar:** Tombol "Connect Wallet to Collect" tetap bisa diklik saat popup login email/Google (`literaa.xyz/widget-auth`) masih terbuka, sehingga user bisa membuka popup kedua atau modal login ganda.
- **Perbaikan (`LiteraWidget.tsx`):** selama `isConnecting` (popup cloud wallet terbuka), tombol utama `disabled`, opacity diturunkan, label jadi "Connecting…". Reset otomatis tetap lewat postMessage sukses/tutup atau watchdog popup close.

## v1.4.35 (Fix Authorization Mechanism Error Handling & Origin Fallback)
- **Latar:** Pada pengujian lingkungan WordPress lokal (seperti `*.local` dan `*.test`), pemanggilan endpoint otorisasi kuis (`/api/v1/quiz/token/:id`) dapat mengalami penolakan CORS atau respons 404/QUIZ_001 bila artikel tidak memiliki kuis.
- **Perbaikan (`LiteraWidget.tsx`):**
  - Menangani error code `QUIZ_001` (Quiz not found) secara eksplisit agar langsung transisi ke tahap `mint_ready`.
  - Menggunakan konfigurasi `LITERA_ORIGIN` yang terpusat.

## v1.4.34 (Graceful Warning When Host Blocks Wallet List)
- **Latar:** audit header CSP 9 portal produksi menunjukkan `letmehearyou.id` bukan satu-satunya host berisiko — `aryadhana.id` memakai `connect-src 'self'` yang bahkan lebih ketat (widget di sana kemungkinan mati total, perlu outreach publisher; tidak bisa diperbaiki dari kode). Host tanpa CSP (WordPress default: `litera.id`, `litebrary.id`, `movieplaza.id`, `widy.my.id`, `adaya.id`, `satuguru.id` + `*.literaa.xyz`) aman.
- **Perbaikan (`web3modal-lazy.ts`, `LiteraWidget.tsx`):** probe `GET api.web3modal.com/getWallets` (header `x-project-id`, timeout 6 detik) setiap modal login dibuka. Bila terblokir (CSP/adblock/offline), modal login menampilkan peringatan kuning: daftar semua dompet mungkin tidak tampil, dompet ekstensi browser tetap berfungsi, atau masuk via Email/Google. Menggantikan kebingungan skeleton abadi tanpa penjelasan dengan ekspektasi yang jujur + jalur alternatif yang masih jalan.

## v1.4.33 (Fix Empty 'All Wallets' Skeleton: Host CSP + Modal Hardening)
- **Root Cause — "All Wallets hanya skeleton, di PC maupun mobile":** View All Wallets Reown AppKit mengambil daftar via `https://api.web3modal.com/getWallets`. `connect-src` CSP di host (`letmehearyou.id`) hanya mengizinkan `https://api.web3modal.org` (host salah, tidak dipakai siapa-siapa) dan `https://explorer-api.walletconnect.com` (tidak dipakai AppKit 4.x). Browser memblokir fetch → AppKit `catch` diam-diam → skeleton selamanya tanpa pesan error. Catatan: request `wallets?projectId=34357d3c…` yang terlihat 200 di DevTools adalah milik internal Privy (`walletConnectCloudProjectId`), bukan modal kita — jangan terkecoh.
- **Perbaikan Host (`letmehearyou`):** `connect-src` di `next.config.ts` + `public/_headers` kini mencakup `https://api.web3modal.com`, `https://rpc.walletconnect.com`, `https://pulse.walletconnect.com` (menggantikan `api.web3modal.org` dan `pulse.walletconnect.org` yang salah).
- **Perbaikan Plugin (`web3modal-lazy.ts`):** `enableAnalytics: false` (memangkas ketergantungan ke `pulse.walletconnect.com` — satu permukaan CSP dan satu sumber blokir Brave hilang); `metadata` (nama/deskripsi/url Litera) kini diteruskan ke `createWeb3Modal` untuk tampilan pairing WalletConnect yang benar.
- **Catatan untuk publisher embed (CSP wajib):** host yang meng-embed widget harus mengizinkan di `connect-src`: `https://api.web3modal.com https://explorer-api.walletconnect.com https://rpc.walletconnect.com https://pulse.walletconnect.com wss://relay.walletconnect.com wss://*.walletconnect.com`, plus RPC Polygon dan `https://auth.privy.io https://*.privy.io` bila memakai login Email/Google.

## v1.4.32 (Fix Stuck 'Connecting…' via Wagmi Polling Watchdog)
- **Root Cause — "Tombol stuck 'Connecting…' setelah modal Web3Modal ditutup":** `handleConnectWallet` menyetel `isConnecting = true` tanpa mekanisme reset yang andal; `subscribeState` Reown tidak memicu saat modal ditutup tanpa connect.
- **Perbaikan (`LiteraWidget.tsx`):** hapus `setIsConnecting(true)` dari handler; label tombol selalu "Connect Wallet to Collect" (modal Reown sendiri jadi feedback visual); watchdog polling `wagmi.isConnected` tiap 1 detik — reset saat connect sukses atau setelah 60 detik tanpa koneksi.

## v1.4.31 (Add WalletConnect QR & Deep-linking Support and Fix 'Connecting…' Stuck State)
- **Root Cause 1 — "Tidak ada pilihan WalletConnect / QR code di modal Web3Modal (hanya browser wallet terdeteksi)":** Konfigurasi Wagmi `createConfig` sebelumnya tidak mendaftarkan connector `walletConnect({ projectId, metadata })`. Akibatnya Web3Modal/Reown AppKit hanya mendeteksi ekstensi browser yang terinstal (MetaMask & Brave Wallet). Pada browser HP yang tidak memiliki ekstensi dompet, daftar dompet menjadi kosong tanpa opsi QR code atau deep-link ke aplikasi dompet mobile.
- **Perbaikan Connector:** Menambahkan `walletConnect({ projectId, metadata, showQrModal: false })` ke dalam daftar `connectors` Wagmi `createConfig`. Sekarang Web3Modal menampilkan seluruh dompet mobile (MetaMask, Trust, Bitget, OKX, Rainbow, dll.) lengkap dengan opsi WalletConnect QR code dan deep-link otomatis ke aplikasi mobile.
- **Root Cause 2 — "Tombol stuck menampilkan 'Connecting…' saat modal Web3Modal ditutup":** Saat modal Web3Modal ditutup (user menekan tombol silang 'X' atau klik area luar), widget tidak memiliki listener untuk mendeteksi penutupan modal eksternal tersebut, sehingga state `isConnecting` tertahan bernilai `true` selamanya.
- **Perbaikan Listener:** Menambahkan `subscribeWeb3ModalOpen` yang mendengarkan event `modalInstance.subscribeState`. Begitu modal Web3Modal tertutup, state `isConnecting` langsung di-reset otomatis ke `false`.

## v1.4.30 (Fix TDZ ReferenceError 'Cannot access b before initialization')
- **Root Cause — "Litera Plugin encountered an error: Cannot access 'b' before initialization":** Pada `LiteraWidget.tsx` v1.4.29, pemanggilan hook `useEffect(..., [isLoginModalOpen])` dan `useEffect(..., [tokenId])` ditaruh di bagian atas fungsi komponen sebelum variabel state `isLoginModalOpen`, `localUnlocked`, `unlockedContent`, `step`, dll. dideklarasikan (Temporal Dead Zone). Saat render, JavaScript mengevaluasi array dependensi `[isLoginModalOpen]` sebelum deklarasi `const [isLoginModalOpen, setIsLoginModalOpen]`, memicu `ReferenceError: Cannot access 'b' before initialization` (di mana `b` adalah nama minified untuk `isLoginModalOpen`).
- **Perbaikan:** Menata ulang seluruh deklarasi state, hook Wagmi/Privy, derived values, dan refs secara ketat di baris teratas fungsi komponen `LiteraWidget` sebelum seluruh handler dan `useEffect`.
- **Hasil:** Error boundary tidak lagi terpicu; widget ter-mount dan render mulus 100%.

## v1.4.29 (Fix Absolute CDN PublicPath for Async Chunks & Clean Preload)
- **Root Cause — "Di mobile langsung ada peringatan gagal muat dialog dompet":** Pada webpack build lama, `publicPath` di-set default `"/"` (relative root host). Akibatnya, saat widget di-embed di domain pihak ketiga (mis. `letmehearyou.id`), browser mencoba memuat async chunk dari `https://letmehearyou.id/*.chunk.js` yang menghasilkan 404 ChunkLoadError. Padahal seluruh chunk async dideploy di `https://cdn.literaa.xyz/*.chunk.js`.
- **Perbaikan `build-combined.js`:** Menambahkan `config.output.publicPath = 'https://cdn.literaa.xyz/'` secara eksplisit, sehingga seluruh dynamic import runtime webpack memuat chunk langsung dari CDN Litera terlepas dari domain host yang meng-embed widget.
- **Perbaikan Preload di `LiteraWidget.tsx`:** Preload Web3Modal dipindah hanya saat modal login dibuka (`isLoginModalOpen === true`) alih-alih background idle mount. Ini menghemat bandwidth mobile dan mengeliminasi error banner prematur sebelum user berinteraksi.

## v1.4.28 (Mobile Connect Wallet: Preload Chunk & Error Visibility)
- **Root Cause — "Di mobile, klik Connect Wallet tidak muncul popup apa pun":** Browser mobile (iOS Safari, Chrome Android) menghendaki `window.open()` / pembukaan modal terjadi **synchronous dalam user gesture**. `openWeb3ModalSafe()` lama memanggil `import('@web3modal/wagmi/react')` (dynamic import, async) di dalam `onClick` — saat chunk selesai dimuat, gesture user sudah kedaluwarsa dan browser **memblokir modal total**. Tambahan `.catch(() => {})` menelan error, membuat user tidak melihat feedback apa pun.
- **Perbaikan Plugin:**
  1. **Preload chunk Web3Modal seawal mungkin** (`requestIdleCallback` / fallback `setTimeout`) begitu widget ter-mount, sehingga saat user klik "Hubungkan Dompet", `modalInstance.open()` berjalan **synchronous** dalam gesture → mobile browser mengizinkannya.
  2. **Loading state & error visible:** Tombol menampilkan "Memuat dompet…" selama chunk belum siap dan pesan error eksplisit bila chunk gagal dimuat (sebelumnya ditelan diam-diam).
  3. State load di-cache di `web3modal-lazy.ts` dengan subscriber pattern agar UI reaktif.
- **Perbaikan Dashboard (`WalletButton.tsx`):** Saat wagmi/Privy masih hydrating (lambat di mobile), tombol sebelumnya adalah skeleton pasif yang **tidak bisa diklik**. Sekarang tetap merender tombol aktif "Masuk ke Litera" (Privy login tidak butuh wagmi mounted); indikator "Memuat…" hanya menonaktifkan sementara sampai Privy ready.

## v1.4.27 (Eliminate Flash of 'Not Published' State on Article Load)
- **Root Cause Fix — "Flash banner 'Artikel ini belum diterbitkan sebagai NFT' sebelum widget NFT muncul":** Saat pertama kali artikel dibuka, terdapat race condition di mana query on-chain V2 selesai atau belum mengembalikan `tokenId`, sementara effect fallback resolve belum sempat berjalan. Pada saat itu, state evaluasi langsung menyimpulkan `tokenId === 0` dan merender pesan "Artikel ini belum diterbitkan" selama ~200-500ms sebelum widget NFT yang sesungguhnya termuat.
- **Perbaikan:** Menambahkan penanda `resolveAttempted` dan guard `isChainDone` & `isWaitingFallback`. Loading skeleton tetap ditampilkan selama proses verifikasi on-chain maupun fallback resolve backend masih berlangsung. Status "Artikel ini belum diterbitkan sebagai NFT di Litera" HANYA boleh muncul jika on-chain DAN fallback resolve keduanya benar-benar telah selesai dan membuktikan bahwa artikel tersebut tidak memiliki NFT terdaftar.
- **Hasil:** Transisi visual mulus dari Skeleton langsung ke Exclusive Collectible (Image 1 -> Image 3) tanpa pernah memunculkan pesan peringatan palsu di tengah-tengah (Image 2).

## v1.4.26 (Native SPA & React/Next.js Client Navigation Support)
- **Root Cause Fix — "Pindah artikel di React/Next.js tanpa reload page membuat widget tidak muncul cepat":** Pada aplikasi berbasis SPA (seperti Next.js, React Router, atau tema modern), perpindahan halaman/artikel tidak memicu reload dokumen utuh melainkan manipulasi DOM client-side (`history.pushState`). Bundle lama hanya mencari container `#my-react-plugin-root` satu kali saat script dimuat lalu pasif, dan referensi container lama terlepas dari dokumen tanpa di-mount ulang.
- **Global API `window.literaMount`:** Menampilkan fungsi `literaMount(target?: HTMLElement | string)` secara global ke `window` sehingga wrapper SPA (seperti komponen Next.js pada `letmehearyou.id` atau platform web builder) dapat me-mount ulang widget ke container aktif secara instan.
- **Auto-Detect SPA Navigation & MutationObserver:** Menambahkan listener event `popstate`, monkey-patch `history.pushState` & `history.replaceState`, serta `MutationObserver` pada `document.body`. Jika container lama terlepas dari DOM atau container baru ditambahkan saat navigasi client-side, sistem secara otomatis me-mount ulang widget ke container baru tanpa butuh reload browser.
- **Reactive Article URL Sync di `App.tsx`:** `App.tsx` kini secara reaktif memantau perubahan URL browser atau event `litera:article-change`. Saat URL artikel berubah, query on-chain V2 dan fallback backend resolve otomatis di-refresh untuk URL baru, mereset state kuis/unlock artikel sebelumnya.
- **Widget State Reset:** Menambahkan effect pembersihan state lokal (`localUnlocked`, `unlockedContent`, `step`, kuis) di `LiteraWidget.tsx` setiap kali `tokenId` berubah.

## v1.4.25 (Bundle Diet: 8.7MB → 3.3MB via Web3Modal Lazy-Load)
- **Root Cause:** Bundle widget 8.7MB karena `createWeb3Modal` (`@web3modal/wagmi`) di-import statis di `index.tsx`. Import ini menarik seluruh Reown AppKit — x402 client, FiatOnramp screens, wallet UI, @wagmi/connectors — ~5MB kode yang hanya dipakai saat user klik "connect wallet". Padahal 99% pembaca hanya pakai login email/Google via Privy.
- **Lazy-Load:** `createWeb3Modal` dipindah ke `src/web3modal-lazy.ts` sebagai `import('@web3modal/wagmi/react')` (dynamic). `openWeb3ModalSafe()` adalah jalur aman: load chunk dulu bila belum, lalu `modalInstance.open()`. Tidak memakai hook di luar komponen ( Rules-of-hooks aman).
- **wagmi config tanpa Reown:** `defaultWagmiConfig` (yang membawa Reown) diganti `createConfig` wagmi murni — fungsi RPC/chain tetap, dependency Reown hilang dari jalur utama.
- **SplitChunks async diaktifkan kembali:** `build-combined.js` sebelumnya memaksa `LimitChunkCountPlugin({maxChunks:1})` yang menyatukan SEMUA chunk termasuk async. Kini `chunks:'async'` memisahkan dynamic import sebagai `[name].[contenthash:8].chunk.js`; entry tetap 1 file `bundle.js` (kontrak `litera.php` dipertahankan).
- **Hasil:** bundle utama **8.7MB → 3.31MB (gzip 0.89MB)**, turun 62%. Pada koneksi 2.3MB/s: 4.0s → 1.5s First Contentful Paint. 69% kode sekarang async, dimuat hanya saat user butuh connect wallet.
- **CI:** `deploy-cdn.yml` menyalin `build/*.chunk.js` ke CDN + memasukkannya ke zip plugin WP (lazy-load jalan di kedua jalur distribusi).
- **Verifikasi:** typecheck clean (hanya pre-existing ES-target warnings), build OK, 84/84 chunk-map entry valid, http serving test 200 OK.

## v1.4.24 (Resilient CDN Loader: Retry Loop & Visible Failure Notice)
- **Root Cause Fix — "Widget kadang tidak muncul":** CDN `cdn.literaa.xyz` bersifat intermiten (HTTP 522 origin-unreachable dan timeout hingga 9s+ terjadi secara acak). Loader lama memiliki `done`-guard yang menelan race condition: bila `fetch manifest` membutuhkan waktu lebih dari 3 detik (timeout lama), callback `.then` memanggil `inject()` yang langsung `return` karena `done === true`, sehingga bundle tidak pernah disuntikkan dan widget hilang sepenuhnya tanpa pesan apa pun.
- **Retry Loop:** Manifest kini diambil hingga 4 percobaan dengan backoff eksponensial (700ms × n). Setiap percobaan independen — kegagalan transient (522, timeout, koneksi terputus) ditangani tanpa kehilangan widget.
- **Race Condition Fixed:** Mengganti flag `done` dengan dua flag terpisah — `injected` (sudah disuntikkan) dan `loaded` (bundle berhasil dieksekusi, via `script.onload`). Timeout kini diperpanjang ke 6s, dan saat timeout mencoba bundle lokal terlebih dahulu, lalu tetap melanjutkan percobaan manifest di background.
- **Bundle Load Failure Handling:** `script.onerror` kini menangani kegagalan pemuatan bundle — mundur ke `window.literaLocalBundle` bila tersedia.
- **Visible Failure Notice:** Jika seluruh upaya habis dan bundle lokal tidak ada/tidak bisa dimuat, ditampilkan pesan ramah "Widget Litera gagal termuat. [Coba lagi]" dengan tombol retry manual — bukan kotak kosong yang mudah disangka "tidak ada widget" oleh pembaca.
- **Universal Embed Paritas:** `public/litera-embed.js` mendapatkan perlakuan yang sama; fixture test disinkronkan.

## v1.4.23 (Industry-Standard Account Chooser & Nonce State Verification)
- **Account Chooser (prompt=select_account):** Bila browser sudah memiliki sesi wallet aktif di `literaa.xyz`, popup autentikasi menampilkan dialog konfirmasi eksplisit ("Lanjutkan dengan akun ini" atau "Gunakan akun/email lain") dan tidak lagi menyematkan wallet lama secara diam-diam.
- **Validasi State/Nonce:** Request autentikasi menyertakan nonce acak satu-kali-pakai untuk mencegah serangan inject/pemalsuan pesan session lintas-origin.

## v1.4.22 (Runtime Self-Heal & Native WordPress Auto-Update Bridge)
- **Self-Heal Cache Guard:** Loader dan Universal Embed (`litera-embed.js`) secara berkala memverifikasi versi bundle yang aktif dengan `manifest.json`. Bila terdeteksi browser memuat bundle lama, sistem melakukan reload aman 1-kali untuk menyegarkan cache secara otomatis.
- **Header Telemetri Versi:** Mengirimkan header `X-Litera-Ui-Version: 1.4.22` pada request penting (submit kuis, unlockable key).
- **Native WordPress Auto-Update Filter:** Mengintegrasikan filter `auto_update_plugin` khusus slug Litera sehingga WordPress secara otomatis dapat memperbarui file PHP plugin saat update background berjalan.

## v1.4.21 (Clean Auth Handshake & In-Article Native Collect Flow)
- Popup `/widget-auth` hanya bertugas login Privy + verifikasi session, menampilkan animasi centang sukses, dan langsung menutup diri.
- Seluruh flow verifikasi kepemilikan, kuis, minting, dan unlock dijalankan langsung secara native di dalam widget halaman artikel.

## v1.4.20 (Industry-standard login flow: pure auth page + mobile OAuth redirect)
- **Desktop:** popup kini membuka halaman login murni (`/widget-auth`) bukan halaman NFT. Setelah login, kepemilikan di-resolve on-chain: sudah punya → handshake & close; belum punya → redirect ke halaman NFT untuk quiz/mint.
- **Mobile:** tidak lagi memakai popup yang tidak reliable. Menggunakan full-page redirect OAuth-style ke literaa.xyz, lalu kembali ke artikel dengan `?lite_addr=0x…` yang otomatis dibaca dan dibersihkan oleh widget.

## v1.4.19 (Remove Persistent Warning Box on Widget)
- Menghapus kotak peringatan kuning "Login email/Google tidak tersedia di situs ini" yang sebelumnya menetap setelah logout atau saat modal ditutup, mengembalikan tampilan widget yang bersih dan minimalis.

## v1.4.18 (Clean Disconnect Modal Copywriting)
- Menghapus badge teknis "Cloud Wallet (Privy)" dari modal akun agar tidak membingungkan pengguna umum.
- Memperbaiki copywriting tombol aksi menjadi "Putuskan Koneksi" yang lebih lugas dan standar.

## v1.4.17 (Modal Disconnect via Portal to avoid container clipping)
- Mengubah popover disconnect menjadi **Modal Dialog via Portal** ke `document.body` agar tidak terpotong oleh `overflow: hidden` pada container widget.
- Menampilkan dialog akun rapi dengan tombol salin alamat, jenis dompet, saldo LITE, dan tombol Putuskan Dompet / Keluar.

## v1.4.16 (Account Popover, Explicit Disconnect & Already-Owned Auto-Unlock)
- **Account Popover standar industri:** Saat terhubung, klik badge akun membuka Popover elegan berisikan alamat lengkap dengan tombol Salin (Copy), saldo LITE, tipe koneksi (Web3 Wallet / Cloud Wallet), dan tombol tegas "Putuskan Dompet / Keluar".
- **Disconnect multi-session:** Memutus sesi Wagmi, Privy, dan cloud wallet secara tuntas agar akun tidak lagi tersangkut di browser atau tab lain.
- **Inbound handshake already-owned:** Langsung membuka materi eksklusif saat popup auth mendeteksi pembaca telah memiliki NFT tersebut.

## v1.4.15 (Cloud wallet popup for cross-origin domains)
- **Popup flow untuk email/Google login:** di domain eksternal (WordPress, BikinWeb, dll), tombol "Email atau Google" membuka popup ke literaa.xyz (origin yang di-allow Privy). Login + quiz + mint berjalan di popup, lalu postMessage balik ke widget.
- **Deteksi origin Privy:** widget secara otomatis menampilkan "Email atau Google" sebagai tombol inline hanya jika domain di-allow Privy (literaa.xyz, localhost, dll). Domain lain menampilkan tombol popup.
- **Fallback Web3Modal:** "Hubungkan Dompet" tetap inline tanpa popup, bebas origin.

## v1.4.14 (Direct Web3 wallet connect for frictionless embed)
- Tombol koneksi langsung membuka Web3Modal (MetaMask, Trust Wallet, WalletConnect, dll) secara instan.
- Menghilangkan perantara modal Privy yang rentan gagal origin pada domain eksternal sehingga tidak ada lagi error "Something went wrong".

## v1.4.13 (Revert unsupported cross-domain hosted collection flow)
- Login email/Google tetap berada di artikel; jika origin Privy tidak diizinkan, widget mengarahkan pembaca menggunakan Hubungkan Dompet tanpa berpindah halaman.
- Menghapus route `/collect` yang belum dapat meneruskan sesi embedded wallet secara aman lintas origin.

## v1.4.12 (Seamless hosted authentication fallback)
- **Transisi otomatis ke Litera:** jika login email/Google Privy gagal di domain pihak ketiga, widget menampilkan loader singkat lalu membuka halaman koleksi resmi pada tab yang sama. Setelah mint selesai, pembaca otomatis kembali ke artikel asal.

## v1.4.11 (Fix: fallback lintas-domain saat login Privy diblokir)
- **Tombol "Lanjutkan di literaa.xyz"**: jika login email/Google gagal di domain pihak ketiga (Privy Allowed Origins / pemblokir cookie), widget menampilkan tombol yang membuka halaman koleksi resmi di tab baru. Seluruh alur kuis, mint, dan unlock berjalan di origin terdaftar.

## v1.4.10 (Fix: error handler Privy login di widget)
- **Error handler `useLogin.onError`**: menangkap kegagalan modal login Privy (mis. Brave Shields / cookie pihak ketiga terblokir / origin belum terdaftar) dan menampilkan pesan panduan ramah pengguna di dalam widget, bukan silent error atau modal rusak.
- **Badge warna yellow**: menambahkan dukungan warna `yellow` pada komponen `Badge` untuk label artikel Legacy Generasi 1.

## v1.4.9 (Fix: deteksi on-chain hasMinted + penanganan error transaksi minting)
- **Deteksi `hasMinted` on-chain**: menambahkan pengecekan `hasMinted(address, tokenId)` langsung ke smart contract Writer. Jika wallet user sudah pernah mencetak/mengklaim NFT artikel tersebut, widget otomatis menganggap user memiliki akses (`hasAccess = true`) dan tidak memicu transaksi mint ulang yang akan gagal di blockchain.
- **Pesan error transaksi ramah pengguna**: menangkap kegagalan transaksi minting (`useWaitForTransactionReceipt` & `useWriteContract`) dan menampilkan pesan informatif yang jelas (misal: saldo gas POL tidak cukup, transaksi dibatalkan user, atau kuota habis) daripada stuck di animasi loading.

## v1.4.8 (Fix: isResolving race-condition causing loading skeleton to hang)
- **Fix isResolving race-condition**: sebelumnya fetch `/resolve` dijalankan saat mount awal ketika `tokenId === 0` (saat on-chain V2 masih loading). Ketika on-chain V2 selesai dan mengembalikan `tokenId = 8n`, effect re-run dan return dini tanpa mereset `isResolving(false)`, sementara fetch lama di-cancel sehingga cleanup finally tidak pernah mematikan `isResolving`. Akibatnya widget tersangkut di loading skeleton meskipun on-chain token ID sudah berhasil terbaca. Sekarang resolve hanya dijalankan jika on-chain lookup sudah selesai (`!isLoading`) dan gagal, dan jika `tokenId > 0`, `isResolving` langsung dimatikan.

## v1.4.7 (Fix: wallet extension conflict bisa membuat widget kosong total)
- **try/catch di `createWeb3Modal`**: pada profil browser dengan beberapa wallet extension aktif sekaligus (MetaMask + lainnya rebutan `window.ethereum`), inisialisasi bisa melempar error sebelum React sempat mount apapun sehingga widget hilang total tanpa pesan (terverifikasi: normal profile stuck, incognito lancar — ciri konflik extension, bukan cache/CDN). Error sekarang tercatat di console dan proses mount widget tetap lanjut.

## v1.4.6 (Fix: loading skeleton escape-hatch & timeout guard)
- **Escape-hatch untuk skeleton loading**: mengatasi kondisi widget stuck di animasi loading biru (pulse/ping) ketika `permalink` terlambat atau gagal terbaca dari host (akibat race-condition script, blocking extension, atau browser strict privacy seperti Brave). Ditambahkan batas waktu 4 detik terpisah agar widget tidak pernah stuck selamanya dan menampilkan tombol "Coba Lagi".

## v1.4.5 (Hotfix: login modal portal + non-WP CSP)
- **Login modal portal**: custom "Masuk ke Litera" modal now renders via `createPortal` to `document.body`, so it is never trapped/cropped inside the widget container (fixes modal appearing inside the widget box on WordPress themes with transformed ancestors).
- **Non-WP CSP**: `letmehearyou.id` CSP now allows `auth.privy.io`, `*.privy.io`, `cca-lite.coinbase.com`, WalletConnect relays, Web3Modal API, and `ipfs.literaa.xyz:8443` — fixes Privy/WalletConnect connection failures on embedded non-WP sites.

## v1.4.4 (Hotfix: reliable WordPress mount + remove false blocker)
- **WordPress display fix**: widget now mounts on posts, pages, and custom post types, and can auto-create the mount container when shortcode/theme output misses it.
- **Non-WP guard fix**: removed false-positive connection blocker so normal Brave/adblock conditions do not hide the widget.
- **Cache busting**: loader and embed manifest requests now use a timestamp query to avoid stale CDN/browser cache.

## v1.4.3 (Hotfix: Shortcode [LITERA] + RPC fallback + UI Redesign)
- **Shortcode WP [LITERA]**: Menambahkan alias `[LITERA]` (uppercase) di `litera.php` agar widget tidak hilang saat ditulis kapital.
- **RPC Fallback Fix**: Membuang `ankr` (butuh auth), `llamarpc`, dan `maticvigil` yang mati. Menggunakan `publicnode` dan `1rpc.io` yang stabil.
- **UI Redesign**: Tombol "Connect Wallet to Collect" dengan gaya terracotta `#d07954` yang kontras dan jelas sebagai CTA login.

## v1.4.2 (Hotfix: RPC endpoints — widget stuck on loading)
- **Perbaikan widget stuck di loading skeleton**: RPC pertama (`rpc.ankr.com/polygon`) kini mengembalikan `Unauthorized` karena membutuhkan API key, dan `llamarpc`/`maticvigil` sudah tidak aktif. Semua referensi RPC mati dibuang dari `wagmiConfig`; widget kini memakai `polygon-bor-rpc.publicnode.com` + `1rpc.io/matic` (diverifikasi hidup & responsif). On-chain lookup artikel kembali normal.

## v1.4.1 (Resilience: Blocked-Media Detection + Fast IPFS Gateway)
- **Deteksi Media Diblokir**: Widget kini mendeteksi bila gateway IPFS (`ipfs.literaa.xyz:8443`) diblokir Brave Shields/ad-blocker dan menampilkan pesan jelas ("Koneksi Diblokir") dengan panduan menonaktifkan pemblokir — tidak lagi diam-diam gagal memuat gambar.
- **Gateway IPFS Cepat**: Semua fetch metadata & media NFT dialihkan dari `ipfs.io` (lambat ~13s, sering timeout) ke gateway Litera `ipfs.literaa.xyz:8443` (~0.5s). Gambar NFT di artikel kini tampil jauh lebih cepat dan andal.
- **Gambar gagal muat tidak merusak layout** (fallback rapi via onError).

## v1.4.0 (Cloud Wallet v3 Hybrid Auth - Privy Integration)
- **Privy Hybrid Auth (Email / Google Login)**: Widget WordPress kini mendukung autentikasi cerdas menggunakan Privy (`@privy-io/react-auth`), setara dengan ekosistem Dashboard Litera.
- **UI "Masuk ke Litera" Universal**: Tombol lama `Connect Wallet` telah digantikan dengan opsi ganda interaktif (*Email/Google* & *Hubungkan Dompet*).
- **Auto Polygon Wallet Creation**: Pembaca yang login dengan email/Google otomatis mendapatkan dompet Polygon tanpa harus menginstal ekstensi browser seperti MetaMask.
- **Sinkronisasi Session & Balance**: Saldo LITE dan status login kini tersinkronisasi secara instan antara Dashboard dan Plugin WP.

## v1.3.7 (Legacy Access Recovery — resolve ke production)
- **Legacy Access Recovery**: Endpoint resolve (dual-contract access) yang tadinya menunjuk `dev.literaa.xyz` (sudah mati) kini diarahkan ke **production `literaa.xyz`**. Pembaca pemegang NFT generasi 1 (legacy) kembali bisa membuka artikel lama: widget resolve URL → cek `balanceOf` di ERC-1155 lama → buka akses. Ini melengkapi backend "baca dua kontrak" yang sudah live di production.
- Semua referensi `dev.literaa.xyz` dihapus dari bundle (resolve + unlock legacy).

## v1.3.6 (CDN Auto-Update + RPC Key Hardening)
- **CDN Auto-Update**: Widget kini dimuat dari `cdn.literaa.xyz` via `loader.js` ringan. Bundle JS versi terbaru otomatis tersedia tanpa publisher harus update plugin dari WP dashboard. Jika CDN tidak terjangkau (timeout 3 detik), widget otomatis fallback ke `bundle.js` lokal — tidak ada downtime.
- **Security — RPC Key Hardening**: Menghapus hardcoded Alchemy/Infura API key dari bundle frontend. Widget sekarang memakai public keyless RPC (Ankr, PublicNode, LlamaRPC, 1RPC, MaticVigil). Key lama wajib di-rotate/revoke di dashboard provider setelah rilis ini terpasang.
- **Catatan**: Ini adalah update manual terakhir. Perubahan widget berikutnya cukup push kode — CI akan men-deploy bundle ber-hash ke CDN secara otomatis.

## v1.0.10 (Hotfix: Widget Rendering Crash)
- **HOTFIX**: Resolved a critical issue where the widget failed to render (disappeared) due to an accidental wiping of the Wagmi configuration during the previous build process.

## v1.0.9 (Smart Contract Synchronization)
- **CRITICAL FIX**: Synchronized the `contractAddress` for the Writer Contract to properly point to the verified Mainnet deployment.
- **RPC Setup Completion**: Finalized the `REACT_APP_NETWORK` and `GENERATE_SOURCEMAP` configurations.

## v1.0.8 (Critical Fix for Update Cache)
- **CRITICAL FIX**: Resolved a packaging script bug that caused the old frontend bundle to be included in v1.0.7. The frontend now correctly uses premium Web3 RPCs.
- **Auto-Sync Quota**: Mencegah cache agresif dari jaringan Polygon sehingga status *Sold Out* selalu akurat *real-time*.

## v1.0.7 (RPC Optimization)

- **Premium RPC Nodes**: Upgraded Web3 provider config to use `llamarpc`, `publicnode`, and `maticvigil` fallbacks to avoid public RPC caching/lag issues.
- **Auto Data Sync**: Implemented `refetchInterval` to automatically refresh article and blockchain data every 5 seconds.
- **Sold Out Bug Fix**: Fixed an issue where the widget gets stuck on "Sold Out" state because of outdated caching. The widget will now instantly reflect any quota additions made in the Dashboard.

*Please update to this version to ensure your readers see the real-time quota of your NFTs.*
