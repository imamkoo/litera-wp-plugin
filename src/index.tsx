import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { projectId, config } from './config'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { WagmiProvider } from 'wagmi'
import {HeroUIProvider} from '@heroui/react'
import {ToastProvider} from "@heroui/toast";
import ErrorBoundary from './components/ErrorBoundary';

const queryClient = new QueryClient()

createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: true,
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#d07954',
    '--w3m-border-radius-master': '12px'
  },
  featuredWalletIds: [
    '3779261cbca0986756cd7e7c9f8072051db27dd7573f3246ebdb998e3b4a2f8b', // Bitget
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    '1ae92b26df02f0abca6304df07081e6c6eb18c7d01eb017d121c5462fc48f219', // OKX
  ]
})

const container = document.getElementById('my-react-plugin-root') || document.getElementById('root');
if (!container) {
  console.error("Litera Plugin: Could not find container element 'my-react-plugin-root'");
}
const root = ReactDOM.createRoot(container as HTMLElement);
root.render(
  <React.StrictMode>
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
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
