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
    query: { enabled: tokenId > 0 }
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
    query: { enabled: tokenId > 0 }
  });
  const hasUnlockableContent = Boolean(isContentUnlockableData);

  // Token URI for metadata
  const { data: tokenURI } = useReadContract({
    address: Erc1155Adress,
    abi: erc1155ABI,
    functionName: 'uri',
    args: [BigInt(tokenId)],
    chainId: activeChainId,
    query: { enabled: tokenId > 0 }
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
        className="group relative flex items-center justify-center py-3 px-6 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white font-black transition-all duration-200 shadow-[0_4px_0_0_#1e293b,0_10px_20px_rgba(0,0,0,0.4)] hover:-translate-y-1 hover:shadow-[0_4px_0_0_#1e293b,0_15px_25px_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-[0_0px_0_0_#1e293b,0_5px_10px_rgba(0,0,0,0.5)] overflow-hidden mt-4 z-10 border border-slate-700/50 mx-auto"
      >
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <span className="relative z-10 flex items-center justify-center gap-3">
          {isConnected ? (
            <span className="text-sm tracking-wide opacity-90 text-slate-300 dark:text-slate-400 font-mono bg-slate-800/50 dark:bg-slate-900/50 px-3 py-1 rounded-xl">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>Connect Wallet</span>
            </div>
          )}
        </span>
      </button>
    );
  };

  if (!isConnected) {
    return (
      <div className="litera-widget-container flex flex-col items-center justify-center p-6 sm:p-8 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/50 text-center my-6">
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Exclusive Collectible</h3>
        <p className="text-sm text-slate-500 mb-6">Connect your Web3 wallet to check access or unlock this article.</p>
        {renderCustomWeb3Button()}
      </div>
    );
  }

  const isDataLoading = isBalanceLoading || isArticleLoading || (hasAccess && isUnlockableLoading);

  if (isConnected && isDataLoading) {
    return (
      <div className="litera-widget-container flex flex-col items-center p-6 sm:p-8 bg-white/80 dark:bg-[#0a0a0a]/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 my-6 text-center">
        <div className="flex items-center gap-2 text-blue-600 font-bold mb-3 tracking-wide text-xs">VERIFYING ACCESS...</div>
        {renderCustomWeb3Button()}
      </div>
    );
  }

  if (hasAccess) {
    const isValidCid = cidUnlockable && typeof cidUnlockable === 'string' && cidUnlockable.length > 10;

    if (hasUnlockableContent && isValidCid && unlockedContent) {
      return (
        <div className="litera-widget-container relative flex flex-col items-center p-6 sm:p-8 bg-white/70 backdrop-blur-2xl rounded-3xl shadow-2xl border border-orange-500/10 my-6">
          <div className="flex items-center gap-2 text-orange-600 font-bold mb-4 tracking-[0.15em] text-[10px] bg-orange-50 px-3 py-1 rounded-full border border-orange-200/50 relative z-10">
            <span>ACCESS GRANTED</span>
          </div>

          <div className="w-full bg-slate-50/50 p-5 rounded-2xl border border-slate-200/50 mb-4 relative z-10">
            <p className="text-slate-800 font-mono text-sm text-left">{unlockedContent.description}</p>
          </div>
          
          <a
            href={unlockedContent.content}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 text-center rounded-2xl bg-orange-500 text-white font-black shadow-lg mb-4 z-10 text-sm"
          >
            Open Premium Content
          </a>
          
          <div className="flex flex-col-reverse sm:flex-row w-full gap-3 z-10">
            <a href={getOpenSeaUrl()} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 text-center rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm">View NFT</a>
            {sponsorUrl && <a href={sponsorUrl} target="_blank" rel="noopener noreferrer" className="flex-[1.5] py-3 text-center rounded-xl bg-blue-50 text-blue-700 font-bold text-sm">Learn More</a>}
          </div>
          {renderCustomWeb3Button()}
        </div>
      );
    }

    if (hasUnlockableContent && !isValidCid) {
       // Just showing that they need to decrypt on Dashboard
       return (
        <div className="litera-widget-container flex flex-col items-center p-6 bg-slate-50 rounded-[2rem] border border-slate-200/60 my-6 text-center">
          <h3 className="text-2xl font-black text-slate-900 mb-2">Content Locked on WP</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm">
            You own this NFT but the content is encrypted. Please go to your Dashboard to decrypt it.
          </p>
          {renderCustomWeb3Button()}
        </div>
      );
    }

    // No Unlockable content, purely NFT
    return (
      <div className="litera-widget-container flex flex-col items-center p-6 bg-white/70 backdrop-blur-2xl rounded-3xl shadow-2xl border border-emerald-100/50 my-6 text-center">
        <p className="text-sm font-semibold text-emerald-600 mb-6 max-w-xs">You now own this Digital Asset.</p>
        
        <div className="flex flex-col sm:flex-row w-full gap-3 mt-2 mb-2 z-10">
          {sponsorUrl && <a href={sponsorUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-3.5 text-center rounded-2xl bg-emerald-500 text-white font-black text-sm">Learn More</a>}
          <a href={getOpenSeaUrl()} target="_blank" rel="noopener noreferrer" className="flex-1 py-3.5 text-center rounded-2xl bg-slate-100 text-slate-800 font-bold text-sm">View Collection</a>
        </div>
        {renderCustomWeb3Button()}
      </div>
    );
  }

  if (!isArticleValid) return <div className="p-4 bg-red-50 text-red-600">Asset Not Found</div>;
  if (isSoldOut) return <div className="p-4 bg-slate-50 text-slate-500">Sold Out</div>;

  return (
    <div className="litera-widget-container flex flex-col items-center p-6 sm:p-8 bg-white/80 rounded-3xl shadow-2xl border border-slate-200/60 text-center my-6">
      <h3 className="text-xl font-extrabold text-slate-900 mb-2">{articleTitle || 'Digital Asset'}</h3>
      <p className="text-xs text-slate-500 mt-2 mb-6">{totalMinted} of {maxMinted} Collected</p>

      <button
        onClick={handleAuthorizeAndMint}
        className="w-full py-3.5 rounded-2xl text-white font-black bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg"
      >
        Take Quiz to Unlock & Mint
      </button>

      <div className="mt-5 w-full flex flex-col items-center gap-3">
        {renderCustomWeb3Button()}
      </div>
    </div>
  );
};

export default LiteraWidget;