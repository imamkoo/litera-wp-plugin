import React, { useEffect, useState } from 'react';
import './App.css';
import LiteraWidget from './components/LiteraWidget';
import { useReadContract, useAccount } from 'wagmi';
import { contractABI, contractAddress, activeChainId, activeNetworkName } from './shared/contracts/ContractConfig';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { normalizeUrl } from './shared/utils/urlNormalizer';

interface ResolveResult {
  tokenId: number;
  generation: 'v2' | 'legacy';
  contract: string;
}

function App() {
  const { address, isConnected, chainId } = useAccount();
  const { open } = useWeb3Modal();
  const [permalink, setPermalink] = useState<string>('');
  const [articleTitle, setArticleTitle] = useState<string>('Litera Digital Asset');

  // Use dynamic chain ID from config instead of hardcoded Amoy
  const EXPECTED_CHAIN_ID = activeChainId;

  const [rawPermalink, setRawPermalink] = useState<string>('');
  const [resolvedData, setResolvedData] = useState<ResolveResult | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    // Ambil URL dan Title dari injeksi plugin WordPress
    if (typeof (window as any).myReactPluginData !== 'undefined') {
      if ((window as any).myReactPluginData.permalink) {
        const rawUrl = (window as any).myReactPluginData.permalink;
        setRawPermalink(rawUrl);
        setPermalink(normalizeUrl(rawUrl));
      }
      if ((window as any).myReactPluginData.title) {
        setArticleTitle((window as any).myReactPluginData.title);
      }
    } else {
      // Fallback localhost development
      const rawUrl = window.location.href;
      setRawPermalink(rawUrl);
      setPermalink(normalizeUrl(rawUrl));
      setArticleTitle(document.title);
    }
  }, []);

  // 0. Jika Writer V2 tidak menemukan artikel, coba endpoint /resolve
  useEffect(() => {
    const fetchResolveEndpoint = async () => {
      if (isError || tokenId === 0) {
        if (isResolving || !rawPermalink) return;
        
        setIsResolving(true);
        setResolveError(null);
        
        try {
          const response = await fetch(
            `https://literaa.xyz/api/v1/articles/resolve?url=${encodeURIComponent(rawPermalink)}`,
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data.tokenId > 0) {
              setResolvedData(data.data);
            } else {
              setResolveError('Article not found in legacy system');
            }
          } else {
            setResolveError(`Backend error: ${response.status}`);
          }
        } catch (err: any) {
          setResolveError(`Network error: ${err.message}`);
        } finally {
          setIsResolving(false);
        }
      } else {
        // Reset jika Writer V2 berhasil
        setResolvedData(null);
        setResolveError(null);
      }
    };

    fetchResolveEndpoint();
  }, [isError, tokenId, rawPermalink, isResolving]);

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
          <button
            onClick={() => open({ view: 'Networks' })}
            className="group relative flex items-center justify-center py-3 px-6 rounded-2xl bg-red-600 dark:bg-red-500/20 text-white dark:text-red-400 font-bold hover:scale-[1.02] transition-all duration-300 shadow-xl overflow-hidden mt-2 z-10 border border-transparent dark:border-red-500/30"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-red-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
              Switch Network
            </span>
          </button>
        </div>
      </div>
    );
  }

  // 3. State "Loading Skeleton"
  if (isLoading || !permalink || isResolving) {
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
         </div>
      </div>
    );
  }

  // 4. State "Not Published" - hanya jika tidak ada hasil dari resolve
  if ((isError || tokenId === 0) && !resolvedData) {
    return (
      <div className="App flex justify-center items-center p-6 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-600 my-8 shadow-sm transition-colors duration-500">
         <div className="flex items-center gap-3">
           <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
           <p className="text-slate-700 dark:text-slate-200 font-semibold text-sm tracking-wide">Artikel ini belum diterbitkan sebagai NFT di Litera.</p>
         </div>
      </div>
    );
  }

  // 5. State "Published" - Gunakan resolvedData jika ada (legacy), atau tokenId (v2)
  const finalTokenId = resolvedData ? resolvedData.tokenId : tokenId;
  const generation = resolvedData ? resolvedData.generation : 'v2';
  
  return (
    <div className="App fade-in transition-opacity duration-500">
      <LiteraWidget 
        tokenId={finalTokenId} 
        articleTitle={articleTitle} 
        generation={generation}
        contractAddress={resolvedData?.contract}
      />
    </div>
  );
}

export default App;