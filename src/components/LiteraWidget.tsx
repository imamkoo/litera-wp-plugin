import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import axios from 'axios';
import {
  contractAddress,
  contractABI,
  UnlockableAddress,
  unlockableABI,
  Erc1155Adress,
  erc1155ABI,
  activeNetworkName,
  activeChainId
} from '../shared/contracts/ContractConfig';

interface LiteraWidgetProps {
  tokenId: number;
  articleTitle?: string;
}

const LiteraWidget: React.FC<LiteraWidgetProps> = ({ tokenId, articleTitle }) => {
  const { address, isConnected } = useAccount();
  const [unlockedContent, setUnlockedContent] = useState<{ description: string; content: string } | null>(null);
  const [sponsorUrl, setSponsorUrl] = useState<string | null>(null);
  const [nftMedia, setNftMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const { open } = useWeb3Modal();

  // --- Contracts Read ---

  // 1. Ownership Check (balanceOf)
  const { data: balanceData, isLoading: isBalanceLoading } = useReadContract({
    address: Erc1155Adress,
    abi: erc1155ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`, BigInt(tokenId)],
    chainId: activeChainId,
    query: { enabled: !!address && tokenId > 0 }
  });
  
  const ownsNFT = balanceData ? Number(balanceData) > 0 : false;

  // 2. Article Info Check
  const { data: articleInfo, isLoading: isArticleLoading } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'articleInfo',
    args: [BigInt(tokenId)],
    chainId: activeChainId,
    query: { enabled: !!tokenId }
  });
  const articleArray = articleInfo as any[];
  const creatorAddress = articleArray ? articleArray[4] : "0x0";
  const publisherAddress = articleArray ? articleArray[1] : "0x0";
  const maxMinted = articleArray ? Number(articleArray[6]) : 0;
  const totalMinted = articleArray ? Number(articleArray[7]) : 0;
  const isSoldOut = maxMinted > 0 && totalMinted >= maxMinted;

  const isCreator = address && creatorAddress && address.toLowerCase() === creatorAddress.toLowerCase();
  const isPublisher = address && publisherAddress && address.toLowerCase() === publisherAddress.toLowerCase();
  const hasAccess = ownsNFT || isCreator || isPublisher;
  
  const isArticleValid = articleArray ? Number(articleArray[0]) > 0 : true;

  // 3. Unlockable Check
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

  // Token URI for metadata
  const { data: tokenURI } = useReadContract({
    address: Erc1155Adress,
    abi: erc1155ABI,
    functionName: 'uri',
    args: [BigInt(tokenId)],
    chainId: activeChainId,
    query: { enabled: !!tokenId }
  });

  // Fetch IPFS content if CID is present
  useEffect(() => {
    if (cidUnlockable && typeof cidUnlockable === 'string' && cidUnlockable.length > 0) {
      const fetchHiddenContent = async () => {
        try {
          const res = await axios.get(`https://ipfs.io/ipfs/${cidUnlockable}`, { timeout: 8000 });
          setUnlockedContent({
            description: res.data.description,
            content: res.data.content
          });
        } catch (e) {
          console.warn("Failed to fetch hidden content", e);
        }
      };
      fetchHiddenContent();
    }
  }, [cidUnlockable]);

  // Fetch true sponsor URL from IPFS metadata
  useEffect(() => {
    if (tokenURI && typeof tokenURI === 'string') {
      const fetchMetadata = async () => {
        try {
          const cid = tokenURI.replace('ipfs://', '');
          const res = await axios.get(`https://ipfs.io/ipfs/${cid}`, { timeout: 8000 });
          const extUrl = res.data?.properties?.external_url;
          if (extUrl && extUrl.length > 5) setSponsorUrl(extUrl);
          if (res.data?.animation_url) setNftMedia({ url: res.data.animation_url, type: 'video' });
          else if (res.data?.image) setNftMedia({ url: res.data.image, type: 'image' });
        } catch (e) {
          console.warn("Failed to fetch NFT metadata", e);
        }
      };
      fetchMetadata();
    }
  }, [tokenURI]);

  const handleAuthorizeAndMint = () => {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `https://literaa.xyz/authorize/${tokenId}?returnUrl=${returnUrl}`;
  };

  const getOpenSeaUrl = () => {
    const baseUrl = activeNetworkName === 'MAINNET' ? 'https://opensea.io/assets/matic' : 'https://testnets.opensea.io/assets/amoy';
    return `${baseUrl}/${Erc1155Adress}/${tokenId}`;
  };

  const renderCustomWeb3Button = () => {
    return (
      <button
        onClick={() => open()}
        className="group relative flex items-center justify-center py-3.5 px-6 rounded-[1.25rem] bg-slate-900 dark:bg-slate-800 text-white font-black transition-all duration-300 shadow-[0_4px_0_0_#1e293b,0_10px_20px_rgba(0,0,0,0.2)] hover:-translate-y-1 hover:shadow-[0_4px_0_0_#1e293b,0_15px_25px_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-[0_0px_0_0_#1e293b,0_5px_10px_rgba(0,0,0,0.3)] overflow-hidden mt-4 z-10 border border-slate-700/50 mx-auto w-full max-w-[280px]"
      >
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600/30 to-purple-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <span className="relative z-10 flex items-center justify-center gap-3">
          {isConnected ? (
            <span className="text-sm tracking-wide opacity-90 text-slate-300 font-mono bg-slate-800/80 px-3 py-1 rounded-xl">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              <span>Connect Wallet</span>
            </div>
          )}
        </span>
      </button>
    );
  };

  if (!isConnected) {
    return (
      <div className="litera-widget-container flex flex-col items-center justify-center p-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_40px_rgb(0,0,0,0.08)] dark:shadow-[0_20px_40px_rgb(0,0,0,0.4)] border border-white/60 dark:border-white/10 text-center my-8 relative overflow-hidden transition-all duration-500 hover:shadow-[0_30px_60px_rgb(0,0,0,0.12)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-400/20 to-purple-500/20 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
        </div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Exclusive Collectible</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-sm leading-relaxed">Connect your Web3 wallet to check access, take the quiz, and mint this digital asset.</p>
        {renderCustomWeb3Button()}
      </div>
    );
  }

  const isDataLoading = isBalanceLoading || isArticleLoading || (hasAccess && isUnlockableLoading);

  if (isConnected && isDataLoading) {
    return (
      <div className="litera-widget-container flex flex-col items-center justify-center p-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-white/60 dark:border-white/10 my-8 text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-blue-500 animate-spin mb-6"></div>
        <div className="flex items-center gap-2 text-blue-600 font-black mb-4 tracking-[0.2em] text-xs uppercase">Verifying Access...</div>
        {renderCustomWeb3Button()}
      </div>
    );
  }

  if (hasAccess) {
    const isValidCid = cidUnlockable && typeof cidUnlockable === 'string' && cidUnlockable.length > 10;

    if (hasUnlockableContent && isValidCid && unlockedContent) {
      return (
        <div className="litera-widget-container relative flex flex-col items-center p-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_40px_rgb(0,0,0,0.08)] dark:shadow-[0_20px_40px_rgb(0,0,0,0.4)] border border-orange-500/20 my-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-orange-400/10 to-rose-400/10 pointer-events-none -z-10"></div>
          
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-black mb-6 tracking-[0.2em] text-[10px] bg-orange-50 dark:bg-orange-500/10 px-4 py-1.5 rounded-full border border-orange-200/50 relative z-10 shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
            <span>ACCESS GRANTED</span>
          </div>

          <div className="w-full bg-white/60 dark:bg-black/20 p-6 rounded-[1.5rem] border border-slate-200/50 dark:border-white/5 mb-6 relative z-10 shadow-inner">
            <h4 className="text-sm font-black text-slate-800 dark:text-white mb-2">Secret Message:</h4>
            <p className="text-slate-600 dark:text-slate-300 font-mono text-sm leading-relaxed">{unlockedContent.description}</p>
          </div>
          
          <a
            href={unlockedContent.content}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 text-center rounded-[1.25rem] bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black shadow-[0_10px_20px_rgba(249,115,22,0.3)] hover:shadow-[0_15px_30px_rgba(249,115,22,0.4)] hover:-translate-y-0.5 transition-all mb-6 z-10 text-sm tracking-wide"
          >
            OPEN PREMIUM CONTENT
          </a>
          
          <div className="flex flex-col sm:flex-row w-full gap-3 z-10 mb-6">
            <a href={getOpenSeaUrl()} target="_blank" rel="noopener noreferrer" className="flex-1 py-3.5 text-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 transition-colors">View on OpenSea</a>
            {sponsorUrl && <a href={sponsorUrl} target="_blank" rel="noopener noreferrer" className="flex-[1.5] py-3.5 text-center rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-black text-sm hover:bg-blue-100 transition-colors">Learn More</a>}
          </div>
          {renderCustomWeb3Button()}
        </div>
      );
    }

    if (hasUnlockableContent && !isValidCid) {
       return (
        <div className="litera-widget-container flex flex-col items-center justify-center p-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-slate-200/60 dark:border-slate-700/50 my-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-slate-200/50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-900/50 rounded-full blur-3xl -z-10 pointer-events-none"></div>
          
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Content Locked on WP</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-sm leading-relaxed">
            You own this NFT but the content is securely encrypted. Please go to your Dashboard to decrypt and view it.
          </p>
          
          {/* THE MISSING BUTTON ADDDED HERE */}
          <a
            href="https://literaa.xyz/mynft"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full max-w-[280px] py-4 text-center rounded-[1.25rem] bg-gradient-to-r from-slate-800 to-slate-900 text-white font-black shadow-[0_10px_20px_rgba(15,23,42,0.3)] hover:shadow-[0_15px_30px_rgba(15,23,42,0.4)] hover:-translate-y-0.5 transition-all mb-6 z-10 text-sm tracking-wide flex items-center justify-center gap-2"
          >
            DECRYPT ON DASHBOARD
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </a>

          {renderCustomWeb3Button()}
        </div>
      );
    }

    // No Unlockable content, purely NFT
    return (
      <div className="litera-widget-container flex flex-col items-center p-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-emerald-100/50 dark:border-emerald-500/20 my-8 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-emerald-400/10 to-teal-400/10 pointer-events-none -z-10"></div>
        
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-5 shadow-inner">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Collection Owned</h3>
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-8 max-w-xs">You successfully own this Digital Asset.</p>
        
        <div className="flex flex-col sm:flex-row w-full gap-3 mb-6 z-10">
          <a href={getOpenSeaUrl()} target="_blank" rel="noopener noreferrer" className="flex-1 py-3.5 text-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 transition-colors">View NFT</a>
          {sponsorUrl && <a href={sponsorUrl} target="_blank" rel="noopener noreferrer" className="flex-[1.5] py-3.5 text-center rounded-xl bg-emerald-500 text-white font-black text-sm shadow-md hover:bg-emerald-600 transition-colors">Learn More</a>}
        </div>
        {renderCustomWeb3Button()}
      </div>
    );
  }

  if (!isArticleValid) return (
    <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 font-bold text-center my-6">Asset Not Found</div>
  );
  if (isSoldOut) return (
    <div className="p-6 bg-slate-50 text-slate-500 rounded-2xl border border-slate-100 font-bold text-center my-6 flex flex-col items-center gap-2">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      This Digital Asset is Sold Out
    </div>
  );

  return (
    <div className="litera-widget-container flex flex-col items-center justify-center p-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-slate-200/60 dark:border-white/10 text-center my-8 relative overflow-hidden transition-all duration-500">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-400/20 to-purple-500/20 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      
      <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-5 shadow-inner">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
      </div>

      <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight line-clamp-1">{articleTitle || 'Digital Asset'}</h3>
      <div className="flex items-center gap-2 mb-8">
        <span className="flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-widest border border-blue-100/50">
          Minted
        </span>
        <span className="text-xs font-bold text-slate-500">{totalMinted} <span className="text-slate-400 font-medium">of</span> {maxMinted} <span className="text-slate-400 font-medium">Collected</span></span>
      </div>

      <button
        onClick={handleAuthorizeAndMint}
        className="w-full py-4 rounded-[1.25rem] text-white font-black bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_10px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_15px_30px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all tracking-wide flex justify-center items-center gap-2 z-10"
      >
        AUTHORIZE & MINT
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
      </button>

      <div className="mt-6 w-full flex flex-col items-center gap-3">
        {renderCustomWeb3Button()}
      </div>
    </div>
  );
};

export default LiteraWidget;