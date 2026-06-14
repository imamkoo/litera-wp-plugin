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
      <div className="App flex flex-col items-center p-4 border border-red-200 bg-red-50 rounded-xl">
        <p className="text-red-600 font-bold mb-2">Wrong Network Detected</p>
        <p className="text-sm text-red-500 mb-4">Please switch to {activeNetworkName} to use Litera.</p>
        {/* @ts-ignore */}
        <w3m-button />
      </div>
    );
  }

  // 3. State "Loading Skeleton"
  if (isLoading || !permalink) {
    return (
      <div className="App flex flex-col justify-center items-center py-6 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
         <div className="animate-pulse flex flex-col items-center space-y-4">
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <div className="h-6 w-6 bg-blue-500 rounded-full animate-ping"></div>
            </div>
            <p className="text-sm font-bold text-slate-500 tracking-widest uppercase">Checking NFT Status...</p>
         </div>
      </div>
    );
  }

  // 4. State "Not Published"
  if (isError || tokenId === 0) {
    return (
      <div className="App flex justify-center items-center p-4 bg-slate-100 rounded-xl border border-slate-200">
         <p className="text-slate-500 font-medium text-sm">Artikel ini belum diterbitkan sebagai NFT di Litera.</p>
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