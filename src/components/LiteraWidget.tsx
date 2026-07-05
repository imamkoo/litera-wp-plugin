import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { formatUnits } from 'viem';
import axios from 'axios';
import {
  contractAddress,
  contractABI,
  UnlockableAddress,
  unlockableABI,
  Erc1155Adress,
  erc1155ABI,
  Erc20Adress,
  erc20ABI,
  activeNetworkName,
  activeChainId
} from '../shared/contracts/ContractConfig';

interface LiteraWidgetProps {
  tokenId: number;
  articleTitle?: string;
}

const formatIpfsUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('ipfs://')) return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  if (url.startsWith('Qm') || url.startsWith('bafy')) return `https://ipfs.io/ipfs/${url}`;
  return url;
};

const LiteraWidget: React.FC<LiteraWidgetProps> = ({ tokenId, articleTitle }) => {
  const { address, isConnected } = useAccount();
  const [unlockedContent, setUnlockedContent] = useState<{ description: string; content: string } | null>(null);
  const [sponsorUrl, setSponsorUrl] = useState<string | null>(null);
  const [nftMedia, setNftMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [publisherName, setPublisherName] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const { open } = useWeb3Modal();

  // --- Contracts Read ---

  const { data: balanceData, isLoading: isBalanceLoading } = useReadContract({
    address: Erc1155Adress,
    abi: erc1155ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`, BigInt(tokenId)],
    chainId: activeChainId,
    query: { enabled: !!address && tokenId > 0 }
  });
  const ownsNFT = balanceData ? Number(balanceData) > 0 : false;

  const { data: articleInfo, isLoading: isArticleLoading } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'articleInfo',
    args: [BigInt(tokenId)],
    chainId: activeChainId,
    query: { enabled: !!tokenId }
  });

  const articleArray = articleInfo as any[];

  const { data: userBalance } = useReadContract({
    address: Erc20Adress,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    chainId: activeChainId,
    query: { enabled: !!address, refetchInterval: 10000 }
  });
  const creatorAddress = articleArray ? articleArray[4] : "0x0";
  const publisherAddress = articleArray ? articleArray[1] : "0x0";
  const price = articleArray ? articleArray[5] : BigInt(0);
  const maxMinted = articleArray ? Number(articleArray[6]) : 0;
  const totalMinted = articleArray ? Number(articleArray[7]) : 0;
  const isSoldOut = maxMinted > 0 && totalMinted >= maxMinted;

  const isCreator = address && creatorAddress && address.toLowerCase() === creatorAddress.toLowerCase();
  const isPublisher = address && publisherAddress && address.toLowerCase() === publisherAddress.toLowerCase();
  const hasAccess = ownsNFT || isCreator || isPublisher;
  const isArticleValid = articleArray ? Number(articleArray[0]) > 0 : true;

  const { data: cidUnlockable, isLoading: isUnlockableLoading } = useReadContract({
    address: UnlockableAddress,
    abi: unlockableABI,
    functionName: 'getUnlockedContent',
    args: [BigInt(tokenId)],
    account: address as `0x${string}`,
    chainId: activeChainId,
    query: { enabled: !!address && hasAccess }
  });

  const { data: isContentUnlockableData } = useReadContract({
    address: UnlockableAddress,
    abi: unlockableABI,
    functionName: 'isContentUnlockable',
    args: [BigInt(tokenId)],
    chainId: activeChainId,
    query: { enabled: !!tokenId }
  });
  const hasUnlockableContent = Boolean(isContentUnlockableData);

  const { data: tokenURI } = useReadContract({
    address: Erc1155Adress,
    abi: erc1155ABI,
    functionName: 'uri',
    args: [BigInt(tokenId)],
    chainId: activeChainId,
    query: { enabled: !!tokenId }
  });

  useEffect(() => {
    if (cidUnlockable && typeof cidUnlockable === 'string' && cidUnlockable.length > 0) {
      const fetchHiddenContent = async () => {
        try {
          const res = await axios.get(`https://ipfs.io/ipfs/${cidUnlockable}`, { timeout: 8000 });
          setUnlockedContent({ description: res.data.description, content: res.data.content });
        } catch (e) {
          console.warn("Failed to fetch hidden content", e);
        }
      };
      fetchHiddenContent();
    }
  }, [cidUnlockable]);

  useEffect(() => {
    if (tokenURI && typeof tokenURI === 'string') {
      const fetchMetadata = async () => {
        try {
          const cid = tokenURI.replace('ipfs://', '');
          const res = await axios.get(`https://ipfs.io/ipfs/${cid}`, { timeout: 8000 });
          const extUrl = res.data?.properties?.external_url;
          if (extUrl && extUrl.length > 5) setSponsorUrl(extUrl);
          
          let mediaUrl = res.data?.animation_url || res.data?.image;
          if (mediaUrl) {
            mediaUrl = formatIpfsUrl(mediaUrl);
            const isVideo = mediaUrl.toLowerCase().endsWith('.mp4') || mediaUrl.toLowerCase().endsWith('.webm') || !!res.data?.animation_url;
            setNftMedia({ url: mediaUrl, type: isVideo ? 'video' : 'image' });
          }
        } catch (e) {
          console.warn("Failed to fetch NFT metadata", e);
        }
      };
      fetchMetadata();
    }
  }, [tokenURI]);

  useEffect(() => {
    if (publisherAddress && publisherAddress !== '0x0' && publisherAddress !== '0x0000000000000000000000000000000000000000') {
      axios.get(`https://literaa.xyz/api/v1/publishers/${publisherAddress}`)
        .then(res => {
           const name = res.data?.displayName || res.data?.data?.displayName;
           if (name) setPublisherName(name);
        })
        .catch(() => {});
    }
  }, [publisherAddress]);

  useEffect(() => {
    if (creatorAddress && creatorAddress !== '0x0' && creatorAddress !== '0x0000000000000000000000000000000000000000') {
      axios.get(`https://literaa.xyz/api/v1/publishers/${creatorAddress}`)
        .then(res => {
           const name = res.data?.displayName || res.data?.data?.displayName;
           if (name) setAuthorName(name);
        })
        .catch(() => {});
    }
  }, [creatorAddress]);

  const handleAuthorizeAndMint = () => {
    const returnUrl = encodeURIComponent(window.location.href);
    const walletParam = address ? `&wallet=${address}` : '';
    window.location.href = `https://literaa.xyz/authorize/${tokenId}?returnUrl=${returnUrl}${walletParam}`;
  };

  const getOpenSeaUrl = () => {
    const baseUrl = activeNetworkName === 'MAINNET' ? 'https://opensea.io/assets/matic' : 'https://testnets.opensea.io/assets/amoy';
    return `${baseUrl}/${Erc1155Adress}/${tokenId}`;
  };

  const renderCustomWeb3Button = () => {
    return (
      <button
        onClick={() => open()}
        className="group relative flex items-center justify-center py-3 px-6 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white font-black transition-all duration-200 shadow-[0_4px_0_0_#1e293b,0_10px_20px_rgba(0,0,0,0.4)] hover:-translate-y-1 hover:shadow-[0_4px_0_0_#1e293b,0_15px_25px_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-[0_0px_0_0_#1e293b,0_5px_10px_rgba(0,0,0,0.5)] overflow-hidden mt-4 z-10 border border-slate-700/50 mx-auto w-fit"
      >
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <span className="relative z-10 flex items-center justify-center gap-3">
          {isConnected ? (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 dark:bg-slate-100 rounded-xl shadow-inner">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]"></div>
                <span className="text-sm font-extrabold text-emerald-400 dark:text-emerald-600">
                  {userBalance !== undefined && userBalance !== null ? `${parseFloat(formatUnits(userBalance as bigint, 18)).toLocaleString('en-US', {maximumFractionDigits: 2})} LITE` : '0 LITE'}
                </span>
              </div>
              <span className="text-sm tracking-wide opacity-90 text-slate-300 dark:text-slate-400 font-mono bg-slate-800/50 dark:bg-slate-900/50 px-3 py-1 rounded-xl">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
              <span>Connect Wallet</span>
            </div>
          )}
        </span>
      </button>
    );
  };

  if (!isConnected) {
    return (
      <div className="litera-widget-container relative flex flex-col items-center justify-center p-6 sm:p-8 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl rounded-3xl shadow-2xl dark:shadow-[0_0_60px_-15px_rgba(0,0,0,0.7)] border border-slate-200/50 dark:border-white/5 text-center my-6 transition-all duration-500 overflow-hidden group hover:dark:border-white/10">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-slate-300/30 dark:bg-slate-700/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-slate-300/40 transition-colors duration-700"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-blue-500/20 transition-colors duration-700"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-200/20 via-transparent to-slate-200/20 dark:from-white/5 dark:to-transparent opacity-50 pointer-events-none"></div>

        <div className="w-14 h-14 mb-4 bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-800 dark:to-black rounded-2xl flex items-center justify-center shadow-2xl border border-slate-700/50 relative z-10 group-hover:scale-105 transition-transform duration-500">
          <svg className="w-7 h-7 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        </div>
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight relative z-10">Exclusive Collectible</h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs leading-relaxed relative z-10">Connect your Web3 wallet to collect this article and unlock premium perks.</p>
        
        {renderCustomWeb3Button()}
      </div>
    );
  }

  const isDataLoading = isBalanceLoading || isArticleLoading || (hasAccess && isUnlockableLoading);

  if (isConnected && isDataLoading) {
    return (
      <div className="litera-widget-container flex flex-col items-center p-6 sm:p-8 bg-white/80 dark:bg-[#0a0a0a]/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-[0_0_60px_-15px_rgba(255,255,255,0.05)] border border-white/50 dark:border-white/10 my-6 text-center transition-all duration-500">
        <div className="w-14 h-14 mb-4 bg-gradient-to-tr from-blue-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/50">
          <svg className="w-7 h-7 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        </div>
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold mb-3 tracking-wide text-xs bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-800/50">
          <span>VERIFYING ACCESS</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs leading-relaxed">Checking your wallet for Litera Access License...</p>
        <div className="mt-2 flex justify-center w-full">
          {renderCustomWeb3Button()}
        </div>
      </div>
    );
  }

  if (hasAccess) {
    const isValidCid = cidUnlockable && typeof cidUnlockable === 'string' && cidUnlockable.length > 10;

    if (hasUnlockableContent && isValidCid && unlockedContent) {
      return (
        <div className="litera-widget-container relative flex flex-col items-center p-6 sm:p-8 bg-white/70 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-3xl shadow-2xl dark:shadow-[0_0_60px_-15px_rgba(249,115,22,0.15)] border border-orange-500/10 dark:border-orange-500/20 my-6 transition-all duration-500 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent dark:from-orange-500/10 pointer-events-none"></div>
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-orange-500/20 dark:bg-orange-600/10 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold mb-4 tracking-[0.15em] text-[10px] bg-orange-50 dark:bg-orange-950/50 px-3 py-1 rounded-full border border-orange-200/50 dark:border-orange-800/50 relative z-10">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
            <span>ACCESS GRANTED</span>
          </div>

          <div className="w-full bg-slate-50/50 dark:bg-black/50 p-5 rounded-2xl border border-slate-200/50 dark:border-white/5 mb-4 relative overflow-hidden backdrop-blur-sm z-10 group">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-400 to-orange-600"></div>
            <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <p className="text-slate-800 dark:text-slate-200 font-mono text-xs sm:text-sm text-left leading-relaxed relative z-10">
              {unlockedContent.description}
            </p>
          </div>
          
          <a
            href={unlockedContent.content}
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex items-center justify-center gap-2 w-full py-3.5 text-center rounded-2xl bg-orange-500 text-white font-black transition-all duration-200 shadow-[0_4px_0_0_#c2410c,0_10px_20px_rgba(249,115,22,0.4)] hover:-translate-y-1 hover:shadow-[0_4px_0_0_#c2410c,0_15px_25px_rgba(249,115,22,0.5)] active:translate-y-1 active:shadow-[0_0px_0_0_#c2410c,0_5px_10px_rgba(249,115,22,0.5)] border border-orange-400 mb-4 z-10 text-sm"
          >
            <span className="tracking-wide">Open Premium Content</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </a>
          
          <div className="flex flex-col-reverse sm:flex-row w-full gap-3 z-10">
            <a
              href={getOpenSeaUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 text-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-white/10 transition-all duration-300 border border-slate-200/80 dark:border-white/10 text-sm"
            >
              <span>View NFT</span>
            </a>
            {sponsorUrl && sponsorUrl.length > 5 && (
              <a href={sponsorUrl} target="_blank" rel="noopener noreferrer" className="flex-[1.5] flex items-center justify-center gap-2 py-3 text-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-300 border border-blue-200 dark:border-blue-700/50 text-sm shadow-sm">
                <span>Learn More</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
              </a>
            )}
          </div>
          
          {renderCustomWeb3Button()}
        </div>
      );
    }

    if (hasUnlockableContent && !isValidCid) {
       return (
        <div className="litera-widget-container relative flex flex-col items-center p-6 sm:p-8 bg-slate-50 dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200/60 dark:border-white/5 my-6 overflow-hidden text-center">
          
          {/* Watermark Lock Icon */}
          <div className="absolute -bottom-12 -right-12 text-slate-200/80 dark:text-slate-800/80 pointer-events-none">
            <svg className="w-64 h-64" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>

          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/20 mb-5 relative z-10">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>

          <h3 className="text-2xl sm:text-[26px] font-black text-slate-900 dark:text-white mb-2 relative z-10 tracking-tight">Content Locked</h3>
          
          <p className="text-xs sm:text-[14px] text-slate-500 dark:text-slate-400 mb-6 max-w-sm leading-relaxed relative z-10">
            You own this NFT but the content is encrypted. Please go to your Dashboard to view it.
          </p>

          <a
            href={`https://literaa.xyz/nfts/${contractAddress}/${tokenId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-blue-600 text-white font-bold transition-all duration-200 shadow-[0_4px_0_0_#1d4ed8,0_10px_20px_rgba(37,99,235,0.4)] hover:-translate-y-1 hover:shadow-[0_4px_0_0_#1d4ed8,0_15px_25px_rgba(37,99,235,0.5)] active:translate-y-1 active:shadow-[0_0px_0_0_#1d4ed8,0_5px_10px_rgba(37,99,235,0.5)] relative z-10 flex items-center justify-center gap-2 text-sm"
          >
            Decrypt on Dashboard
          </a>

          <div className="mt-8 relative z-10 self-center">
             {renderCustomWeb3Button()}
          </div>
        </div>
      );
    }

    return (
      <div className="litera-widget-container relative flex flex-col items-center p-6 sm:p-8 bg-white/70 dark:bg-[#0a0a0a]/90 backdrop-blur-2xl rounded-3xl shadow-2xl dark:shadow-[0_0_80px_-20px_rgba(16,185,129,0.15)] border border-emerald-100/50 dark:border-emerald-900/30 my-6 text-center transition-all duration-700 overflow-hidden group hover:dark:border-white/20">
        
        {/* Premium Web3 Glow Effects */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-600/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-emerald-500/20 transition-colors duration-700"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-slate-500/10 dark:bg-slate-600/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-emerald-500/5 dark:to-transparent opacity-50 pointer-events-none"></div>

        {/* Watermark Icon */}
        <div className="absolute -bottom-16 -right-16 text-emerald-200/30 dark:text-emerald-800/20 pointer-events-none transition-transform duration-1000 group-hover:scale-105 group-hover:-rotate-3">
          <svg className="w-48 h-48 sm:w-64 sm:h-64" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        
        <div className="w-12 h-12 mb-3 bg-gradient-to-tr from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 relative z-10 group-hover:scale-105 transition-transform duration-500">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
        </div>
        
        <div className="flex flex-col items-center justify-center gap-1 mb-2 text-slate-900 dark:text-white font-extrabold text-xl sm:text-2xl tracking-tight relative z-10">
          <p>Collection Verified</p>
        </div>
        <p className="text-sm sm:text-base font-semibold text-emerald-600 dark:text-emerald-400 mb-6 max-w-xs leading-relaxed relative z-10">
          You now own this Digital Asset.
        </p>
        
        {sponsorUrl && sponsorUrl.length > 5 ? (
          <div className="relative z-10 flex flex-col sm:flex-row w-full gap-3 mt-2 mb-2">
            <a href={sponsorUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-3.5 text-center rounded-2xl bg-emerald-500 text-white font-black transition-all duration-200 shadow-[0_4px_0_0_#059669,0_10px_20px_rgba(16,185,129,0.4)] hover:-translate-y-1 hover:shadow-[0_4px_0_0_#059669,0_15px_25px_rgba(16,185,129,0.5)] active:translate-y-1 active:shadow-[0_0px_0_0_#059669,0_5px_10px_rgba(16,185,129,0.5)] text-sm">
              <span>Learn More</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </a>
            <a href={getOpenSeaUrl()} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-3.5 text-center rounded-2xl bg-white dark:bg-transparent text-slate-800 dark:text-white font-bold transition-all duration-200 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-emerald-900/20 shadow-sm hover:shadow text-sm">
              <span>View NFT</span>
            </a>
          </div>
        ) : (
          <a
            href={getOpenSeaUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 flex items-center justify-center gap-2 w-full py-3.5 text-center rounded-2xl bg-white dark:bg-transparent text-slate-800 dark:text-white font-bold transition-all duration-200 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-emerald-900/20 mt-2 mb-2 shadow-sm hover:shadow text-sm"
          >
            <span>View NFT</span>
          </a>
        )}
        
        <div className="mt-4 relative z-10 w-full flex justify-center">
          {renderCustomWeb3Button()}
        </div>
      </div>
    );
  }

  if (!isArticleValid) {
    return (
      <div className="litera-widget-container relative flex flex-col items-center p-6 sm:p-8 bg-white/70 dark:bg-[#0a0a0a]/90 backdrop-blur-2xl rounded-3xl shadow-2xl dark:shadow-[0_0_80px_-20px_rgba(0,0,0,0.8)] border border-red-200/80 dark:border-red-900/30 text-center my-6 overflow-hidden group hover:dark:border-red-500/20 transition-all duration-700">
        <div className="w-14 h-14 mb-4 bg-gradient-to-br from-red-400 to-red-500 dark:from-red-800 dark:to-red-900 rounded-2xl flex items-center justify-center text-white shadow-inner border border-red-300/50 dark:border-red-700/50 relative z-10 group-hover:scale-105 transition-transform duration-500">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <div className="flex items-center gap-2 text-red-500 dark:text-red-400 font-bold mb-3 tracking-[0.15em] text-[9px] sm:text-[10px] bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-full border border-red-100 dark:border-red-800/50 relative z-10">
          <span>NFT NOT INITIALIZED</span>
        </div>
        <h3 className="text-2xl sm:text-[24px] font-black text-slate-900 dark:text-white mb-2 tracking-tight relative z-10">Asset Not Found</h3>
        <p className="text-xs sm:text-[14px] text-slate-500 dark:text-slate-400 mb-6 max-w-sm leading-relaxed relative z-10">
          This article was published on WordPress, but the NFT has not been successfully deployed to the blockchain. Please contact the publisher.
        </p>
        {renderCustomWeb3Button()}
      </div>
    );
  }

  if (isSoldOut) {
    return (
      <div className="litera-widget-container relative flex flex-col items-center p-6 sm:p-8 bg-white/70 dark:bg-[#0a0a0a]/90 backdrop-blur-2xl rounded-3xl shadow-2xl dark:shadow-[0_0_80px_-20px_rgba(0,0,0,0.8)] border border-slate-200/80 dark:border-white/10 text-center my-6 overflow-hidden group hover:dark:border-white/20 transition-all duration-700">
        
        <div className="w-14 h-14 mb-4 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-inner border border-slate-300/50 dark:border-slate-700/50 relative z-10 group-hover:scale-105 transition-transform duration-500">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
        </div>

        <div className="bg-slate-800 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700/50 relative z-10 group-hover:border-emerald-500/30 transition-colors">
          <span className="text-[10px] sm:text-xs font-mono font-medium text-slate-300">
            {userBalance !== undefined && userBalance !== null ? <span className="text-emerald-400 font-bold mr-1">{parseFloat(formatUnits(userBalance as bigint, 18)).toLocaleString('en-US', {maximumFractionDigits: 2})} LITE |</span> : null}
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>

        <h3 className="text-2xl sm:text-[28px] font-black text-slate-900 dark:text-white mb-2 tracking-tight relative z-10">Sold Out</h3>
        
        <p className="text-xs sm:text-[14px] text-slate-500 dark:text-slate-400 mb-6 max-w-sm leading-relaxed relative z-10">
          All available NFTs for this campaign have been minted. Thank you for the incredible support!
        </p>

        {renderCustomWeb3Button()}
      </div>
    );
  }

  return (
    <div className="litera-widget-container relative flex flex-col items-center p-6 sm:p-8 bg-white/80 dark:bg-[#0c0c0f]/95 backdrop-blur-2xl rounded-3xl shadow-2xl dark:shadow-[0_0_80px_-20px_rgba(99,102,241,0.08)] border border-slate-200/60 dark:border-white/[0.06] text-center my-6 transition-all duration-700 overflow-hidden group hover:border-slate-300/80 hover:dark:border-white/[0.12]">
      
      {/* Premium Ambient Glow */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/8 to-indigo-500/8 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-full blur-[100px] pointer-events-none group-hover:from-blue-500/12 group-hover:to-indigo-500/12 transition-all duration-1000"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-violet-500/6 to-purple-500/6 dark:from-violet-500/8 dark:to-purple-500/8 rounded-full blur-[100px] pointer-events-none group-hover:from-violet-500/10 group-hover:to-purple-500/10 transition-all duration-1000"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent dark:from-white/[0.02] dark:to-transparent pointer-events-none"></div>

      {/* Header: Badge + Title */}
      <div className="flex flex-col items-center w-full relative z-10 mb-6">
        <div className="flex items-center gap-2 mb-4 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-full border border-blue-100 dark:border-blue-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_6px_rgba(59,130,246,0.5)]"></div>
          <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Digital Collectible</span>
        </div>
        
        {nftMedia && (
          <div className="w-full flex justify-center mb-4 relative z-10">
            {nftMedia.type === 'video' ? (
              <video src={nftMedia.url} className="w-32 h-32 rounded-2xl object-cover shadow-lg border border-slate-200/50 dark:border-white/10" autoPlay loop muted playsInline />
            ) : (
              <img src={nftMedia.url} alt="NFT Media" className="w-32 h-32 rounded-2xl object-cover shadow-lg border border-slate-200/50 dark:border-white/10" />
            )}
          </div>
        )}
        
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug max-w-sm text-center">
          {articleTitle || 'Digital Asset'}
        </h3>
        
        <div className="flex items-center gap-3 mt-3 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="opacity-60">Publisher</span>
            <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {publisherName || 'Verified'}
            </span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
          <div className="flex items-center gap-1.5">
            <span className="opacity-60">Author</span>
            <span className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-500/20">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {authorName || 'Verified'}
            </span>
          </div>
        </div>
      </div>

      {/* Mint Button via Authorization Platform redirect */}
      <button
        onClick={handleAuthorizeAndMint}
        className="w-full py-3.5 rounded-2xl text-white font-black transition-all duration-200 relative z-10 flex items-center justify-center gap-3 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_4px_0_0_#3730a3,0_10px_20px_rgba(79,70,229,0.35)] hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_#3730a3,0_15px_30px_rgba(79,70,229,0.4)] active:translate-y-0.5 active:shadow-[0_1px_0_0_#3730a3,0_5px_10px_rgba(79,70,229,0.3)]"
      >
        <span className="relative z-10 flex items-center justify-center gap-2 font-bold tracking-wide">
          Collect NFT <span className="opacity-40">·</span> <span className="text-blue-200 font-medium">{price && price > BigInt(0) ? `${parseFloat(formatUnits(price, 18)).toLocaleString('en-US')} LITE` : 'Free'}</span>
          <svg className="w-4 h-4 ml-0.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </span>
      </button>

      {/* Wallet + Branding Footer */}
      <div className="mt-5 relative z-10 w-full flex flex-col items-center gap-3">
        {renderCustomWeb3Button()}
        <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-60 transition-opacity duration-500 mt-2">
          <svg viewBox="0 0 200 200" className="w-3 h-3">
            <circle cx="100" cy="100" r="100" fill="#F04E37" />
            <text x="100" y="130" fill="#FFFFFF" fontSize="90" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="bold" textAnchor="middle" letterSpacing="-2">L</text>
          </svg>
          <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-600 tracking-wider">Powered by Litera</span>
        </div>
      </div>

    </div>
  );
};

export default LiteraWidget;
