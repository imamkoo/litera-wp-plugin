import React, { useEffect, useState } from 'react';
import './App.css';
import LiteraWidget from './components/LiteraWidget';
import { useReadContract, useAccount } from 'wagmi';
import { contractABI, contractAddress, activeChainId, activeNetworkName } from './shared/contracts/ContractConfig';
import { normalizeUrl } from './shared/utils/urlNormalizer';

function App() {
  const { chainId, isConnected } = useAccount();
  const [permalink, setPermalink] = useState<string>('');

  // Use dynamic chain ID from config instead of hardcoded Amoy
  const EXPECTED_CHAIN_ID = activeChainId;

  useEffect(() => {
    // Ambil URL dari injeksi plugin WordPress
    if (typeof (window as any).myReactPluginData !== 'undefined' && (window as any).myReactPluginData.permalink) {
      setPermalink(normalizeUrl((window as any).myReactPluginData.permalink));
    } else {
      // Fallback localhost development
      setPermalink(normalizeUrl(window.location.href));
    }
  }, []);

  // 1. On-chain lookup berdasarkan URL yang sudah dinormalisasi
  const { data: tokenIdRaw, isLoading, isError, error } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'getIdFromArticleURL',
    args: [permalink],
    chainId: EXPECTED_CHAIN_ID,
    query: {
      enabled: !!permalink,
    }
  });

  console.log("DEBUG WAGMI - URL:", permalink);
  console.log("DEBUG WAGMI - TokenID Raw:", tokenIdRaw);
  console.log("DEBUG WAGMI - isError:", isError);
  console.log("DEBUG WAGMI - ERROR DETAILS:", error);

  const tokenId = tokenIdRaw ? Number(tokenIdRaw) : 0;

  // 2. State Management "Wrong Network"
  if (isConnected && chainId && chainId !== EXPECTED_CHAIN_ID) {
    return (
      <div className="App relative flex flex-col items-center p-8 bg-red-50/80 dark:bg-slate-900/80 backdrop-blur-xl border border-red-200 dark:border-red-900/50 rounded-3xl shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)] my-8 overflow-hidden transition-colors duration-500">
        <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent dark:from-red-500/10"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-14 h-14 mb-5 bg-red-100 dark:bg-red-950/50 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 shadow-inner border border-red-200 dark:border-red-900/30">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <p className="text-red-600 dark:text-red-400 font-bold mb-2 uppercase tracking-[0.15em] text-sm">Wrong Network Detected</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center max-w-xs leading-relaxed">Please switch to <span className="font-bold text-slate-800 dark:text-slate-200">{activeNetworkName}</span> to use the Litera widget.</p>
          {/* @ts-ignore */}
          <w3m-button />
        </div>
      </div>
    );
  }

  // 3. State "Loading Skeleton"
  if (isLoading || !permalink) {
    return (
      <div className="App relative flex flex-col justify-center items-center py-12 px-6 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl rounded-3xl border border-slate-200 dark:border-white/5 shadow-2xl dark:shadow-[0_0_50px_-15px_rgba(0,0,0,0.5)] my-8 overflow-hidden text-center transition-colors duration-500">
         <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-indigo-500/10 dark:from-blue-500/5 dark:to-indigo-500/5"></div>
         <div className="animate-pulse flex flex-col items-center space-y-6 relative z-10">
            <div className="relative flex items-center justify-center">
               <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
               <div className="h-16 w-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-inner">
                 <div className="h-6 w-6 bg-blue-500 rounded-full animate-ping"></div>
               </div>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-[0.2em] uppercase">Syncing Blockchain...</p>
         </div>
      </div>
    );
  }

  // 4. State "Not Published"
  if (isError || tokenId === 0) {
    return (
      <div className="App flex justify-center items-center p-6 bg-slate-50/50 dark:bg-slate-900/30 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/5 my-8 transition-colors duration-500">
         <div className="flex items-center gap-3 opacity-60">
           <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
           <p className="text-slate-500 dark:text-slate-400 font-medium text-sm tracking-wide">Artikel ini belum diterbitkan sebagai NFT di Litera.</p>
         </div>
      </div>
    );
  }

  // 5. State "Published" -> Tampilkan Widget
  return (
    <div className="App fade-in transition-opacity duration-500">
      <LiteraWidget tokenId={tokenId} />
    </div>
  );
}

export default App;