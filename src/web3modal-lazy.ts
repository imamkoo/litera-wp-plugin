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
//
// MOBILE: browser mobile (iOS Safari, Chrome Android) mewajibkan window.open()
// / modal terbuka SYNCHRONOUS dalam user gesture. Karena dynamic import bersifat
// async, gesture user sudah kedaluwarsa saat modalInstance.open() dipanggil ->
// popup diblokir total. Itulah sebabnya chunk HARUS di-preload jauh sebelum user
// klik (lihat preloadWeb3Modal() di LiteraWidget), sehingga open() jalan sync.

import { config, metadata, projectId } from './config';

type ModalInstance = {
  open: (opts?: any) => Promise<void>;
  close?: () => Promise<void>;
  getState: () => { open: boolean; selectedNetworkId?: number };
  subscribeState: (cb: (state: any) => void) => () => void;
};

let loadPromise: Promise<void> | null = null;
let modalInstance: ModalInstance | null = null;

export type Web3ModalLoadState = { loading: boolean; error: string | null };
let loadState: Web3ModalLoadState = { loading: false, error: null };
const stateListeners = new Set<(s: Web3ModalLoadState) => void>();
const modalOpenListeners = new Set<(open: boolean) => void>();

function notifyState() {
  stateListeners.forEach((fn) => {
    try { fn(loadState); } catch (e) {}
  });
}

export function subscribeWeb3ModalOpen(fn: (open: boolean) => void): () => void {
  modalOpenListeners.add(fn);
  return () => { modalOpenListeners.delete(fn); };
}

export function getWeb3ModalLoadState(): Web3ModalLoadState {
  return loadState;
}

export function subscribeWeb3ModalState(fn: (s: Web3ModalLoadState) => void): () => void {
  stateListeners.add(fn);
  return () => { stateListeners.delete(fn); };
}

export function isWeb3ModalReady(): boolean {
  return !!modalInstance;
}

export async function probeWalletListReachable(timeoutMs = 6000): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch('https://api.web3modal.com/getWallets?page=1&entries=1', {
        headers: { 'x-project-id': projectId },
        signal: ctrl.signal,
      });
      return typeof res?.status === 'number';
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

// Alias lama (kompatibilitas panggilan yang sudah ada).
export const preloadWeb3Modal = mountWeb3Modal;

export function mountWeb3Modal(): Promise<void> {
  if (modalInstance) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadState = { loading: true, error: null };
  notifyState();

  loadPromise = import('@web3modal/wagmi/react')
    .then((mod) => {
      modalInstance = mod.createWeb3Modal({
        wagmiConfig: config,
        projectId,
        metadata,
        enableAnalytics: false,
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
      }) as unknown as ModalInstance;

      // Pantau event buka/tutup modal untuk reset status "Connecting..." di widget
      if (modalInstance && typeof modalInstance.subscribeState === 'function') {
        modalInstance.subscribeState((st: any) => {
          const isOpen = Boolean(st?.open);
          modalOpenListeners.forEach((listener) => {
            try { listener(isOpen); } catch (e) {}
          });
        });
      }

      loadState = { loading: false, error: null };
      notifyState();
    })
    .catch((err) => {
      console.error('[Litera Widget] Web3Modal gagal dimuat (chunk network error):', err);
      loadPromise = null;
      loadState = { loading: false, error: 'Gagal memuat dialog dompet. Coba lagi atau gunakan Email/Google.' };
      notifyState();
      throw err;
    });
  return loadPromise;
}

// Jalur aman: bila modal sudah siap, open() dipanggil SYNCHRONOUS dalam user
// gesture (mobile-friendly). Bila belum, muat chunk dulu lalu buka — di jalur
// ini gesture sudah hilang, jadi UI harus menunjukkan loading & error state.
export function openWeb3ModalSafe(opts?: any): void {
  if (modalInstance) {
    modalInstance.open(opts).catch((e) => console.warn('[Litera Widget] open gagal:', e));
    return;
  }
  mountWeb3Modal().then(() => {
    modalInstance?.open(opts).catch((e) => console.warn('[Litera Widget] open gagal:', e));
  }).catch(() => {
    // Error state sudah disimpan di loadState; subscriber UI menampilkannya.
  });
}
