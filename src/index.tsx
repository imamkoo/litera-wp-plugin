import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config'
import { WagmiProvider } from 'wagmi'
import {HeroUIProvider} from '@heroui/react'
import {ToastProvider} from "@heroui/toast";
import ErrorBoundary from './components/ErrorBoundary';
import { PrivyProvider } from '@privy-io/react-auth';
import { polygon } from 'viem/chains';

const queryClient = new QueryClient()

// Bootstrapping Web3Modal dipindah ke src/web3modal-lazy.ts dan di-load
// on-demand (saat user pertama kali klik connect wallet). Import statik
// createWeb3Modal di sini menarik ~5MB Reown AppKit ke chunk utama.
// Catatan: discovery window.ethereum tetap diatur WagmiProvider di bawah;
// konflik extension wallet ditangani ErrorBoundary + try/catch di lazy.

const privyAppId = process.env.REACT_APP_PRIVY_APP_ID || 'cmsg0934d00c40cl5dkdtbrnl';

let mountedRoot: ReturnType<typeof ReactDOM.createRoot> | null = null;
let mountedContainer: HTMLElement | null = null;

function renderWidget(container: HTMLElement) {
  // Jika container sama, root ada, dan elemen masih terpasang di dokumen, jangan unmount
  if (mountedContainer === container && mountedRoot && document.body.contains(container)) return;

  if (mountedRoot) {
    try {
      mountedRoot.unmount();
    } catch (e) {
      console.warn('[Litera Widget] Unmount error on container replacement:', e);
    }
    mountedRoot = null;
  }

  mountedRoot = ReactDOM.createRoot(container);
  mountedContainer = container;
  mountedRoot.render(
    <React.StrictMode>
      <PrivyProvider
        appId={privyAppId}
        config={{
          loginMethods: ['email', 'google'],
          appearance: {
            theme: 'light',
            accentColor: '#d07954',
            showWalletLoginFirst: false,
          },
          defaultChain: polygon,
          supportedChains: [polygon],
          embeddedWallets: {
            ethereum: {
              createOnLogin: 'users-without-wallets',
            },
          },
        }}
      >
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <HeroUIProvider>
              <ToastProvider />
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </HeroUIProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </PrivyProvider>
    </React.StrictMode>
  );
}

function findOrCreateContainer(): HTMLElement | null {
  // 1. Try standard container IDs or attributes
  let el = document.getElementById('my-react-plugin-root') ||
           document.getElementById('root') ||
           document.getElementById('litera-widget-root') ||
           document.querySelector('[data-litera-widget]');

  if (el) return el as HTMLElement;

  // 2. If container doesn't exist, search for WordPress or generic article containers to auto-create it
  const selectors = [
    'article .entry-content',
    '.entry-content',
    'article',
    '.post-content',
    '.single-post',
    'main#main',
    'main',
    '#content',
    '.content',
    'body'
  ];

  for (const sel of selectors) {
    const parent = document.querySelector(sel);
    if (parent) {
      const newRoot = document.createElement('div');
      newRoot.id = 'my-react-plugin-root';
      parent.appendChild(newRoot);
      return newRoot;
    }
  }

  return null;
}

function initMount(): boolean {
  const container = findOrCreateContainer();
  if (container) {
    renderWidget(container);
    return true;
  }
  return false;
}

function checkAndRemount() {
  const container = findOrCreateContainer();
  if (container) {
    if (!mountedContainer || mountedContainer !== container || !document.body.contains(mountedContainer)) {
      renderWidget(container);
    }
  }
}

// Global API: Memungkinkan aplikasi SPA (Next.js, React Router, Vue) untuk me-mount ulang widget secara manual
(window as any).literaMount = (target?: HTMLElement | string) => {
  let container: HTMLElement | null = null;
  if (target) {
    container = typeof target === 'string' ? document.querySelector(target) : target;
  }
  if (!container) {
    container = findOrCreateContainer();
  }
  if (container) {
    renderWidget(container);
  }
};

// 1. Initial mount
initMount();

// 2. DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initMount();
  });
}

// 3. Polling fallback awal untuk tema async / SPA hydration
let attempts = 0;
const timer = setInterval(() => {
  attempts++;
  if (initMount() || attempts >= 50) {
    clearInterval(timer);
  }
}, 100);

// 4. SPA Navigation & Client-side Routing Support
// Memastikan widget otomatis muncul saat berpindah artikel di React/Next.js tanpa reload
window.addEventListener('popstate', () => {
  setTimeout(checkAndRemount, 50);
});

window.addEventListener('litera:article-change', () => {
  setTimeout(checkAndRemount, 50);
});

if (typeof history !== 'undefined') {
  const origPushState = history.pushState;
  const origReplaceState = history.replaceState;

  history.pushState = function (...args) {
    const res = origPushState.apply(this, args);
    setTimeout(checkAndRemount, 50);
    return res;
  };

  history.replaceState = function (...args) {
    const res = origReplaceState.apply(this, args);
    setTimeout(checkAndRemount, 50);
    return res;
  };
}

if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
  let debounceTimer: any = null;
  const observer = new MutationObserver(() => {
    if (!mountedContainer || !document.body.contains(mountedContainer)) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(checkAndRemount, 50);
    }
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  }
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
