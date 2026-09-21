# Litera WordPress Plugin Release Notes

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
