// Lazy wrapper untuk @web3modal/wagmi.
//
// Import statik createWeb3Modal/useWeb3Modal menarik seluruh Reown AppKit
// (~5MB: x402 client, fiat-onramp screens, wallet UI, @wagmi/connectors).
// Widget pada dasarnya hanya butuh login email/Google via Privy — connect
// wallet Web3 jarang dipakai pembaca. Modul ini di-split ke chunk terpisah
// dan baru dimuat saat user pertama kali butuh modal connect.
//
// Catatan implementasi: useWeb3Modal() (scaffold-react) melempar error bila
// createWeb3Modal belum dipanggil. getWeb3Modal(modal) adalah setter global,
// jadi setelah chunk ini load & createWeb3Modal jalan, hook di mana pun
// langsung bekerja. openWeb3ModalSafe() adalah jalur aman memanggil open()
// tanpa harus tahu apakah modal sudah terdaftar.

import { config, projectId } from './config';

let loadPromise: Promise<void> | null = null;
let modalInstance: { open: (opts?: any) => Promise<void> } | null = null;

export function mountWeb3Modal(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = import('@web3modal/wagmi/react')
    .then((mod) => {
      // createWeb3Modal mengembalikan instance modal dengan metode open()
      // secara langsung — tidak perlu lewat hook useWeb3Modal (yang hanya
      // bisa dipanggil di dalam komponen React).
      modalInstance = mod.createWeb3Modal({
        wagmiConfig: config,
        projectId,
        enableAnalytics: true,
        themeMode: 'light',
        themeVariables: {
          '--w3m-accent': '#d07954',
          '--w3m-border-radius-master': '12px',
        },
        featuredWalletIds: [
          '3779261cbca0986756cd7e7c9f8072051db27dd7573f3246ebdb998e3b4a2f8b', // Bitget
          'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
          '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
          '1ae92b26df02f0abca6304df07081e6c6eb18c7d01eb017d121c5462fc48f219', // OKX
        ],
      }) as { open: (opts?: any) => Promise<void> };
    })
    .catch((err) => {
      console.error('[Litera Widget] Web3Modal gagal dimuat (chunk network error):', err);
      loadPromise = null;
      throw err;
    });
  return loadPromise;
}

// Jalur aman: load chunk (bila belum), lalu open modal.
export function openWeb3ModalSafe(opts?: any): void {
  if (modalInstance) {
    modalInstance.open(opts).catch((e) => console.warn('[Litera Widget] open gagal:', e));
    return;
  }
  mountWeb3Modal().then(() => {
    modalInstance?.open(opts).catch((e) => console.warn('[Litera Widget] open gagal:', e));
  }).catch(() => {});
}
