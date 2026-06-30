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
  const creatorAddress = articleArray ? articleArray[4] : "0x0";
  const publisherAddress = articleArray ? articleArray[1] : "0x0";
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
        className="flex items-center justify-center py-2 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors border border-slate-200 mt-4 mx-auto w-full sm:w-auto"
      >
        {isConnected ? (
          <span className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            Connect Wallet
          </span>
        )}
      </button>
    );
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="litera-widget-container flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm text-center my-8 max-w-2xl mx-auto">
      {children}
    </div>
  );

  if (!isConnected) {
    return (
      <Wrapper>
        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 border border-slate-100 text-slate-700">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Exclusive Collectible</h3>
        <p className="text-sm text-slate-500 mb-2 max-w-sm">Connect wallet to check access, take quiz, and mint.</p>
        {renderCustomWeb3Button()}
      </Wrapper>
    );
  }

  const isDataLoading = isBalanceLoading || isArticleLoading || (hasAccess && isUnlockableLoading);

  if (isConnected && isDataLoading) {
    return (
      <Wrapper>
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin mb-4"></div>
        <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-2">Verifying...</div>
        {renderCustomWeb3Button()}
      </Wrapper>
    );
  }

  if (hasAccess) {
    const isValidCid = cidUnlockable && typeof cidUnlockable === 'string' && cidUnlockable.length > 10;

    if (hasUnlockableContent && isValidCid && unlockedContent) {
      return (
        <Wrapper>
          <div className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200 mb-4 inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            ACCESS GRANTED
          </div>
          <div className="w-full bg-white p-5 rounded-xl border border-slate-200 mb-5 text-left shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Secret Message</h4>
            <p className="text-slate-800 text-sm leading-relaxed">{unlockedContent.description}</p>
          </div>
          <a
            href={unlockedContent.content}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors mb-5 text-sm inline-block shadow-sm"
          >
            Open Premium Content
          </a>
          <div className="flex flex-wrap justify-center gap-2 mb-2 w-full">
            <a href={getOpenSeaUrl()} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none px-4 py-2 text-center rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50">View NFT</a>
            {sponsorUrl && <a href={sponsorUrl} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none px-4 py-2 text-center rounded-lg bg-slate-800 text-white text-xs font-medium hover:bg-slate-900">Learn More</a>}
          </div>
          {renderCustomWeb3Button()}
        </Wrapper>
      );
    }

    if (hasUnlockableContent && !isValidCid) {
       return (
        <Wrapper>
          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 border border-slate-100 text-slate-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Content Locked</h3>
          <p className="text-sm text-slate-500 mb-5 max-w-sm">
            You own this NFT but the content is encrypted. Please go to your Dashboard to view it.
          </p>
          <a
            href="https://literaa.xyz/mynft"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors mb-4 inline-flex items-center justify-center gap-2 shadow-sm"
          >
            Decrypt on Dashboard
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </a>
          {renderCustomWeb3Button()}
        </Wrapper>
      );
    }

    return (
      <Wrapper>
        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4 border border-green-100 text-green-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Collection Owned</h3>
        <p className="text-sm text-green-600 font-medium mb-5">You successfully own this Digital Asset.</p>
        <div className="flex flex-wrap justify-center gap-2 mb-2 w-full">
          <a href={getOpenSeaUrl()} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none px-4 py-2 text-center rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50">View NFT</a>
          {sponsorUrl && <a href={sponsorUrl} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none px-4 py-2 text-center rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700">Learn More</a>}
        </div>
        {renderCustomWeb3Button()}
      </Wrapper>
    );
  }

  if (!isArticleValid) return (
    <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-medium text-center my-6 max-w-sm mx-auto">Asset Not Found</div>
  );
  if (isSoldOut) return (
    <div className="p-4 bg-slate-50 text-slate-500 rounded-xl border border-slate-200 text-sm font-medium text-center my-6 max-w-sm mx-auto flex items-center justify-center gap-2">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      Sold Out
    </div>
  );

  return (
    <Wrapper>
      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 border border-slate-100 text-blue-600">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1 max-w-xs">{articleTitle || 'Digital Asset'}</h3>
      <div className="flex items-center gap-1.5 mb-5 text-xs">
        <span className="font-semibold text-slate-700">{totalMinted}</span>
        <span className="text-slate-400">/</span>
        <span className="text-slate-500">{maxMinted} Minted</span>
      </div>
      <button
        onClick={handleAuthorizeAndMint}
        className="w-full sm:w-auto px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors flex justify-center items-center gap-2 shadow-sm text-sm mb-2"
      >
        Authorize & Mint
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
      </button>
      {renderCustomWeb3Button()}
    </Wrapper>
  );
};

export default LiteraWidget;