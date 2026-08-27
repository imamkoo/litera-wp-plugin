# Litera WordPress Plugin Release Notes

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
