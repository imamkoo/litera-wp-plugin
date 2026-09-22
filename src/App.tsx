import React, { useEffect, useState } from 'react';
import './App.css';
import LiteraWidget from './components/LiteraWidget';
import { useReadContract, useAccount } from 'wagmi';
import { contractABI, contractAddress, activeChainId, activeNetworkName } from './shared/contracts/ContractConfig';
import { openWeb3ModalSafe } from './web3modal-lazy';
import { normalizeUrl } from './shared/utils/urlNormalizer';

interface ResolveResult {
  tokenId: number;
  generation: 'v2' | 'legacy';
  contract: string;
}

function App() {
  const { isConnected, chainId } = useAccount();
  const [permalink, setPermalink] = useState<string>('');
  const [articleTitle, setArticleTitle] = useState<string>('Litera Digital Asset');

  // Use dynamic chain ID from config instead of hardcoded Amoy
  const EXPECTED_CHAIN_ID = activeChainId;

  const [rawPermalink, setRawPermalink] = useState<string>('');
  const [resolvedData, setResolvedData] = useState<ResolveResult | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const syncArticle = () => {
    let nextRawUrl = '';
    let nextTitle = '';

    if (typeof (window as any).myReactPluginData !== 'undefined') {
      if ((window as any).myReactPluginData.permalink) {
        nextRawUrl = (window as any).myReactPluginData.permalink;
      }
      if ((window as any).myReactPluginData.title) {
        nextTitle = (window as any).myReactPluginData.title;
      }
    }

    if (!nextRawUrl) {
      nextRawUrl = window.location.href;
    }
    if (!nextTitle) {
      nextTitle = document.title || 'Litera Digital Asset';
    }

    if (nextRawUrl) {
      const normalized = normalizeUrl(nextRawUrl);
      setRawPermalink((prev) => (prev !== nextRawUrl ? nextRawUrl : prev));
      setPermalink((prev) => {
        if (prev !== normalized) {
          setResolvedData(null);
          setResolveError(null);
          setLookupTimedOut(false);
          setPermalinkTimedOut(false);
          return normalized;
        }
        return prev;
      });
      if (nextTitle) {
        setArticleTitle(nextTitle);
      }
    }
  };

  useEffect(() => {
    syncArticle();

    const handleArticleChange = (event: Event) => {
      const detail = (event as CustomEvent<{
        permalink: string;
        title: string;
      }>).detail;

      if (detail && detail.permalink) {
        setRawPermalink(detail.permalink);
        setPermalink(normalizeUrl(detail.permalink));
        if (detail.title) setArticleTitle(detail.title);
        setResolvedData(null);
        setResolveError(null);
        setLookupTimedOut(false);
        setPermalinkTimedOut(false);
      } else {
        syncArticle();
      }
    };

    const handleSpaNavigation = () => {
      setTimeout(syncArticle, 50);
    };

    window.addEventListener('litera:article-change', handleArticleChange);
    window.addEventListener('popstate', handleSpaNavigation);

    return () => {
      window.removeEventListener('litera:article-change', handleArticleChange);
      window.removeEventListener('popstate', handleSpaNavigation);
    };
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
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
    }
  });

  const [lookupTimedOut, setLookupTimedOut] = useState(false);
  useEffect(() => {
    if (!isLoading) {
      setLookupTimedOut(false);
      return;
    }
    const t = setTimeout(() => setLookupTimedOut(true), 2500);
    return () => clearTimeout(t);
  }, [isLoading, permalink]);

  // Escape hatch terpisah: skeleton juga tampil selama `!permalink` (menunggu
  // injeksi window.myReactPluginData dari loader). Karena `isLoading` di atas
  // hanya jalan setelah permalink terisi (enabled: !!permalink), kasus di mana
  // permalink GAGAL terisi (race condition script, extension browser yang
  // menunda eksekusi, dll) tidak pernah punya batas waktu sendiri -> skeleton
  // nyangkut abadi. Timer ini menutup gap tersebut.
  const [permalinkTimedOut, setPermalinkTimedOut] = useState(false);
  useEffect(() => {
    if (permalink) {
      setPermalinkTimedOut(false);
      return;
    }
    const t = setTimeout(() => setPermalinkTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, [permalink]);

  console.log("DEBUG WAGMI - URL:", permalink);
  console.log("DEBUG WAGMI - TokenID Raw:", tokenIdRaw);
  console.log("DEBUG WAGMI - isError:", isError);
  console.log("DEBUG WAGMI - ERROR DETAILS:", error);

  const tokenId = tokenIdRaw ? Number(tokenIdRaw) : 0;
  const lookupFailed = lookupTimedOut || (isError && !tokenIdRaw);

  // 0. Jika Writer V2 tidak menemukan artikel (on-chain lookup selesai dan tokenId === 0),
  // baru coba endpoint /resolve sebagai fallback sistem legacy.
  useEffect(() => {
    let cancelled = false;

    // Jika tokenId sudah ditemukan on-chain (V2), pastikan resolving dimatikan
    if (tokenId > 0) {
      setIsResolving(false);
      setResolvedData(null);
      setResolveError(null);
      return;
    }

    // Jangan panggil resolve jika on-chain lookup masih berlangsung
    if (isLoading || !rawPermalink) {
      return;
    }

    // Jika lookup on-chain sudah selesai dan gagal/0, baru fetch backend resolve
    if (lookupFailed || tokenId === 0) {
      setIsResolving(true);
      setResolveError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const fetchResolveEndpoint = async () => {
        try {
          const response = await fetch(
            `https://literaa.xyz/api/v1/articles/resolve?url=${encodeURIComponent(rawPermalink)}`,
            { method: 'GET', headers: { 'Content-Type': 'application/json' }, signal: controller.signal }
          );

          clearTimeout(timeoutId);
          if (cancelled) return;

          if (response.ok) {
            const data = await response.json();
            if (cancelled) return;
            if (data.success && data.data?.tokenId > 0) {
              setResolvedData(data.data);
            } else {
              setResolveError('Article not found in legacy system');
            }
          } else {
            setResolveError(`Backend error: ${response.status}`);
          }
        } catch (err: any) {
          clearTimeout(timeoutId);
          if (cancelled) return;
          setResolveError(`Network error: ${err.message || 'timeout'}`);
        } finally {
          setIsResolving(false);
        }
      };

      fetchResolveEndpoint();

      return () => {
        cancelled = true;
        controller.abort();
        setIsResolving(false);
      };
    }
  }, [isLoading, lookupFailed, tokenId, rawPermalink]);



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
            onClick={() => openWeb3ModalSafe({ view: 'Networks' })}
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

  // 3. State "Loading Skeleton" — hanya tampil maksimal beberapa detik.
  // `!permalinkTimedOut` memastikan skeleton tetap punya batas waktu meski
  // pemicunya `!permalink` (bukan `isLoading` dari on-chain query).
  if ((isLoading || (!permalink && !permalinkTimedOut) || isResolving) && !lookupFailed && !resolvedData && !resolveError) {
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

  // 3b. State "Gagal Memuat" - permalink tidak pernah terisi setelah timeout.
  // Terpisah dari "Not Published" karena ini bukan status artikel di Litera,
  // melainkan widget gagal membaca URL artikel dari halaman (loader/extension
  // browser/race condition), jadi tombol "Coba Lagi" lebih tepat daripada
  // menyesatkan pembaca dengan pesan "belum diterbitkan sebagai NFT".
  if (!permalink && permalinkTimedOut) {
    return (
      <div className="App flex justify-center items-center p-6 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-600 my-8 shadow-sm transition-colors duration-500">
         <div className="flex items-center gap-3">
           <svg className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
           <p className="text-slate-700 dark:text-slate-200 font-semibold text-sm tracking-wide">Widget Litera gagal memuat halaman ini.</p>
           <button
             onClick={() => window.location.reload()}
             className="ml-2 shrink-0 text-xs font-bold text-[#d07954] hover:underline"
           >
             Coba Lagi
           </button>
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
