import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import axios from 'axios';
import {
  contractAddress,
  contractABI,
  Erc20Adress,
  erc20ABI,
  UnlockableAddress,
  unlockableABI,
  Erc1155Adress,
  erc1155ABI,
  activeNetworkName,
  activeChainId
} from '../shared/contracts/ContractConfig';
import { useSafeGas } from '../shared/hooks/useSafeGas';

interface LiteraWidgetProps {
  tokenId: number;
}

const LiteraWidget: React.FC<LiteraWidgetProps> = ({ tokenId }) => {
  const { address, isConnected } = useAccount();
  const [unlockedContent, setUnlockedContent] = useState<{ description: string; content: string } | null>(null);
  const [hasVisitedSponsor, setHasVisitedSponsor] = useState(false);
  const [sponsorUrl, setSponsorUrl] = useState<string | null>(null);
  const [nftMedia, setNftMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const { open } = useWeb3Modal();
  const [isRevealing, setIsRevealing] = useState(false);

  // ============================
  // CUSTOM PREMIUM WEB3 BUTTON
  // ============================
  const renderCustomWeb3Button = () => {
    return (
      <button
        onClick={() => open()}
        className="group relative flex items-center justify-center py-3 px-6 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white font-black transition-all duration-200 shadow-[0_4px_0_0_#1e293b,0_10px_20px_rgba(0,0,0,0.4)] hover:-translate-y-1 hover:shadow-[0_4px_0_0_#1e293b,0_15px_25px_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-[0_0px_0_0_#1e293b,0_5px_10px_rgba(0,0,0,0.5)] overflow-hidden mt-4 z-10 border border-slate-700/50 mx-auto"
      >
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <span className="relative z-10 flex items-center justify-center gap-3">
          {isConnected ? (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 dark:bg-slate-100 rounded-xl shadow-inner">
                <svg viewBox="0 0 200 200" className="w-5 h-5 drop-shadow-sm">
                  <circle cx="100" cy="100" r="100" fill="#F04E37" />
                  <text x="100" y="125" fill="#FFFFFF" fontSize="75" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="bold" textAnchor="middle" letterSpacing="-2">Lite</text>
                </svg>
                <span className="text-sm font-extrabold text-blue-400 dark:text-blue-600">
                  {userBalance !== undefined ? parseFloat(formatUnits(userBalance as any, 18)).toLocaleString('en-US', { maximumFractionDigits: 2 }) : "0"} LITE
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

  const getOpenSeaUrl = () => {
    const baseUrl = activeNetworkName === 'MAINNET' ? 'https://opensea.io/assets/matic' : 'https://testnets.opensea.io/assets/amoy';
    return `${baseUrl}/${Erc1155Adress}/${tokenId}`;
  };

  useEffect(() => {
    setUnlockedContent(null);
  }, [address]);

  // --- Contracts Read ---

  // --- Contracts Write ---
  const { getSafeGasParams } = useSafeGas();

  // Approve
  const { writeContract: approveWrite, data: approveHash, isPending: isApprovingReq } = useWriteContract();
  const { isLoading: isApprovingTx, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  // Mint
  const { writeContract: mintWrite, data: mintHash, isPending: isMintingReq } = useWriteContract();
  const { isLoading: isMintingTx, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({ hash: mintHash });

  // Reveal (Decrypt via smart contract)
  const { writeContract: revealWrite, data: revealHash, isPending: isRevealingReq } = useWriteContract();
  const { isLoading: isRevealingTx, isSuccess: isRevealSuccess } = useWaitForTransactionReceipt({ hash: revealHash });

  // 1. Ownership Check (balanceOf)
  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: Erc1155Adress,
    abi: erc1155ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`, BigInt(tokenId)],
    chainId: activeChainId,
    query: { enabled: !!address && tokenId > 0 }
  });
  
  // Optimistic UI: If the mint transaction just succeeded, assume ownership immediately without waiting for RPC poll
  const ownsNFT = (balanceData ? Number(balanceData) > 0 : false) || isMintSuccess;

  // 2. Article Info Check (price, maxMint, totalMint)
  const { data: articleInfo, refetch: refetchArticleInfo } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'articleInfo',
    args: [BigInt(tokenId)],
    chainId: activeChainId,
    query: { enabled: tokenId > 0 }
  });
  const articleArray = articleInfo as any[];
  // struct mapping:
  // 0: idnft, 1: publisher, 2: externalURI, 3: fee, 4: creator, 
  // 5: price, 6: _MaxMinted, 7: _Minted
  const externalURI = articleArray ? articleArray[2] : "";
  const isFeeEnabled = articleArray ? articleArray[3] : false;
  const creatorAddress = articleArray ? articleArray[4] : "0x0";
  const price = articleArray ? articleArray[5] : BigInt(0);
  const maxMinted = articleArray ? Number(articleArray[6]) : 0;
  const totalMinted = articleArray ? Number(articleArray[7]) : 0;
  const isSoldOut = maxMinted > 0 && totalMinted >= maxMinted;

  const isCreator = address && creatorAddress && address.toLowerCase() === creatorAddress.toLowerCase();
  const hasAccess = ownsNFT || isCreator;

  // 3. Unlockable Check
  const { data: cidUnlockable } = useReadContract({
    address: UnlockableAddress,
    abi: unlockableABI,
    functionName: 'getUnlockedContent',
    args: [BigInt(tokenId)],
    account: address as `0x${string}`, // Simulate call as user
    chainId: activeChainId,
    query: { enabled: !!address && hasAccess }
  });

  // 4. Allowance Check
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: Erc20Adress,
    abi: erc20ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, contractAddress],
    chainId: activeChainId,
    query: { enabled: !!address && !hasAccess }
  });

  // 4.5. Balance Check
  const { data: userBalance } = useReadContract({
    address: Erc20Adress,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    chainId: activeChainId,
    query: { 
      enabled: !!address && !hasAccess,
      refetchInterval: 5000 
    }
  });

  // 5. Unlockable Existence Check
  const { data: isContentUnlockableData } = useReadContract({
    address: UnlockableAddress,
    abi: unlockableABI,
    functionName: 'isContentUnlockable',
    args: [BigInt(tokenId)],
    chainId: activeChainId,
    query: { enabled: tokenId > 0 }
  });
  const hasUnlockableContent = Boolean(isContentUnlockableData);

  // 6. Token URI for metadata (to get true external_url)
  const { data: tokenURI } = useReadContract({
    address: Erc1155Adress,
    abi: erc1155ABI,
    functionName: 'uri',
    args: [BigInt(tokenId)],
    chainId: activeChainId,
    query: { enabled: tokenId > 0 }
  });

  // --- Effects ---

  // Auto-mint after approve
  useEffect(() => {
    if (isApproveSuccess) {
      handleMintAction();
    }
  }, [isApproveSuccess]);

  // Fast RPC Sync: Trigger refetch immediately after successful mint
  useEffect(() => {
    if (isMintSuccess) {
      // Small delay to allow the RPC node to index the new block
      setTimeout(() => {
        refetchBalance();
        refetchArticleInfo();
      }, 2000);
    }
  }, [isMintSuccess]);

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
          if (extUrl && extUrl.length > 5) {
            setSponsorUrl(extUrl);
          } else {
            setSponsorUrl(null);
          }
          
          if (res.data?.animation_url) {
            setNftMedia({ url: res.data.animation_url, type: 'video' });
          } else if (res.data?.image) {
            setNftMedia({ url: res.data.image, type: 'image' });
          } else {
            setNftMedia(null);
          }
        } catch (e) {
          console.warn("Failed to fetch NFT metadata", e);
        }
      };
      fetchMetadata();
    }
  }, [tokenURI]);

  // --- Handlers ---
  const handleMintAction = async () => {
    try {
      const gasParams = await getSafeGasParams();
      mintWrite({
        address: contractAddress,
        abi: contractABI,
        functionName: 'Mint',
        args: [BigInt(tokenId), "0x"],
        ...gasParams
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleBuy = async () => {
    if (isSoldOut) return;
    try {
      const needed = BigInt(price);
      const currentAllowance = BigInt(allowance as any || 0);
      const currentUserBalance = BigInt(userBalance as any || 0);

      if (currentUserBalance < needed) {
        // Mencegah transaksi jika saldo tidak cukup (akan ditangani oleh disabled state di button juga, tapi ini double check)
        alert("Insufficient LITE Balance! You don't have enough LITE to mint this NFT.");
        return;
      }

      const gasParams = await getSafeGasParams();

      if (currentAllowance < needed) {
        approveWrite({
          address: Erc20Adress,
          abi: erc20ABI,
          functionName: 'approve',
          args: [contractAddress, needed],
          ...gasParams
        });
      } else {
        handleMintAction();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleReveal = async () => {
    try {
      const gasParams = await getSafeGasParams();
      revealWrite({
        address: UnlockableAddress,
        abi: unlockableABI,
        functionName: 'unlockContent',
        args: [BigInt(tokenId)],
        ...gasParams
      });
    } catch (error) {
      console.error(error);
    }
  };

  // --- RENDER STATES ---

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

  if (hasAccess) {
    // Skenario sponsor dihilangkan karena `externalURI` di sini adalah articleLink, bukan external_url sebenarnya dari IPFS JSON.
    // Menghapus interstitial ini memberikan UX yang jauh lebih baik: pengguna langsung masuk ke Reveal / Unlock state.

    // Helper untuk memvalidasi apakah cidUnlockable benar-benar sebuah CID yang valid
    const isValidCid = cidUnlockable && typeof cidUnlockable === 'string' && cidUnlockable.length > 10;

    // Skenario A.1: Unlockable EXIST and already decrypted & fetched
    if (hasUnlockableContent && isValidCid && unlockedContent) {
      return (
        <div className="litera-widget-container relative flex flex-col items-center p-6 sm:p-8 bg-white/70 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-3xl shadow-2xl dark:shadow-[0_0_60px_-15px_rgba(249,115,22,0.15)] border border-orange-500/10 dark:border-orange-500/20 my-6 transition-all duration-500 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent dark:from-orange-500/10 pointer-events-none"></div>
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-orange-500/20 dark:bg-orange-600/10 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold mb-4 tracking-[0.15em] text-[10px] bg-orange-50 dark:bg-orange-950/50 px-3 py-1 rounded-full border border-orange-200/50 dark:border-orange-800/50 relative z-10">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
            <span>ACCESS GRANTED</span>
          </div>

          {nftMedia && nftMedia.type === 'image' && (
            <div className="w-full h-32 sm:h-48 mb-4 rounded-2xl overflow-hidden shadow-inner relative z-10 border border-slate-200/50 dark:border-white/5 bg-slate-100 dark:bg-slate-900">
              <img src={nftMedia.url} alt="NFT Media" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            </div>
          )}
          {nftMedia && nftMedia.type === 'video' && (
            <div className="w-full h-32 sm:h-48 mb-4 rounded-2xl overflow-hidden shadow-inner relative z-10 border border-slate-200/50 dark:border-white/5 bg-slate-100 dark:bg-slate-900">
              <video src={nftMedia.url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
            </div>
          )}
          
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
          
          <div className="flex w-full gap-3 z-10">
            <a
              href={getOpenSeaUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-white/10 transition-all duration-300 border border-slate-200/80 dark:border-white/10 text-xs"
            >
              <span>View NFT</span>
            </a>
            {sponsorUrl && sponsorUrl.length > 5 && (
              <a href={sponsorUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-3 text-center rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-300 border border-blue-100 dark:border-blue-800/50 text-sm">
                <span>Learn More</span>
              </a>
            )}
          </div>
          
          {renderCustomWeb3Button()}
        </div>
      );
    }

    // Skenario A.2: Unlockable EXIST but waiting for IPFS or fallback after reveal
    if (hasUnlockableContent && (isRevealSuccess || isValidCid)) {
      // Fallback jika CID rusak atau publisher belum upload tapi status sudah isContentUnlockable
      return (
        <div className="litera-widget-container flex flex-col items-center p-6 sm:p-8 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/50 my-6 text-center transition-all duration-500">
          <div className="w-14 h-14 mb-4 bg-gradient-to-tr from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 animate-pulse">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </div>
          <div className="flex items-center gap-2 text-blue-600 font-bold mb-3 tracking-wide text-xs bg-blue-50 px-3 py-1.5 rounded-full">
            <span>LOADING CONTENT</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mb-6 max-w-xs leading-relaxed">Decrypting and loading premium content securely from IPFS...</p>
          <div className="mt-2 flex justify-center w-full">
            {renderCustomWeb3Button()}
          </div>
        </div>
      );
    }

    // Skenario A.3: Unlockable EXIST but not yet revealed
    if (hasUnlockableContent) {
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

          <h3 className="text-2xl sm:text-[26px] font-black text-slate-900 dark:text-white mb-2 relative z-10 tracking-tight">Unlock Exclusive Content</h3>
          
          <p className="text-xs sm:text-[14px] text-slate-500 dark:text-slate-400 mb-6 max-w-sm leading-relaxed relative z-10">
            {isCreator 
              ? "You are the creator of this asset. This asset contains exclusive encrypted data. Click the button below to decrypt and reveal the hidden content." 
              : "This asset contains exclusive encrypted data. You own this NFT. Click the button below to decrypt and reveal the hidden content."}
          </p>

          <button
            onClick={handleReveal}
            disabled={isRevealingReq || isRevealingTx}
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-blue-600 text-white font-bold transition-all duration-200 shadow-[0_4px_0_0_#1d4ed8,0_10px_20px_rgba(37,99,235,0.4)] hover:-translate-y-1 hover:shadow-[0_4px_0_0_#1d4ed8,0_15px_25px_rgba(37,99,235,0.5)] active:translate-y-1 active:shadow-[0_0px_0_0_#1d4ed8,0_5px_10px_rgba(37,99,235,0.5)] disabled:opacity-50 disabled:transform-none disabled:shadow-none relative z-10 flex items-center justify-center gap-2 text-sm"
          >
            {isRevealingTx ? (
              <>
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Decrypting...
              </>
            ) : (
              "Reveal Hidden Content"
            )}
          </button>

          {/* Wrapper for Web3 Button with margin top so it doesn't collide */}
          <div className="mt-8 relative z-10 self-center">
             {renderCustomWeb3Button()}
          </div>
        </div>
      );
    }

    // Skenario B/C: No Unlockable Content! Pure Gamification / Sponsor Campaign
    return (
      <div className="litera-widget-container relative flex flex-col items-center p-6 sm:p-8 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl rounded-3xl shadow-2xl dark:shadow-[0_0_60px_-15px_rgba(16,185,129,0.15)] border border-emerald-100/50 dark:border-emerald-900/30 my-6 text-center transition-all duration-500 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent dark:from-emerald-500/10 pointer-events-none"></div>
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-600/10 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="w-14 h-14 mb-4 bg-gradient-to-tr from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 relative z-10">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <div className="flex flex-col items-center justify-center gap-1 mb-5 text-slate-900 dark:text-white font-extrabold text-xl sm:text-2xl tracking-tight relative z-10">
          <p>Campaign Completed</p>
          <p className="text-emerald-500 dark:text-emerald-400 text-sm sm:text-lg">Reward Verified</p>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs leading-relaxed relative z-10">Terima kasih telah berpartisipasi!</p>
        <a
          href={getOpenSeaUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 flex items-center justify-center gap-2 w-full py-3 text-center rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-all duration-300 mb-2 border border-slate-200/50 dark:border-white/10 shadow-sm text-sm"
        >
          <span>View NFT</span>
        </a>
        {externalURI && externalURI.length > 5 && (
          <a href={externalURI} target="_blank" rel="noopener noreferrer" className="relative z-10 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline mt-3 mb-2 tracking-wide">
            Learn More
          </a>
        )}
        {renderCustomWeb3Button()}
      </div>
    );
  }

  if (isSoldOut) {
    return (
      <div className="litera-widget-container relative flex flex-col items-center p-6 sm:p-8 bg-white/70 dark:bg-[#0a0a0a]/90 backdrop-blur-2xl rounded-3xl shadow-2xl dark:shadow-[0_0_80px_-20px_rgba(0,0,0,0.8)] border border-slate-200/80 dark:border-white/10 text-center my-6 overflow-hidden group hover:dark:border-white/20 transition-all duration-700">
        
        {/* Subtle dark glow for Sold Out */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-slate-300/40 dark:bg-slate-700/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-slate-300/50 transition-colors duration-700"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-red-500/5 dark:bg-red-600/5 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100/50 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none"></div>
        
        {/* Watermark Icon */}
        <div className="absolute -bottom-16 -right-16 text-slate-200/50 dark:text-slate-800/50 pointer-events-none transition-transform duration-1000 group-hover:scale-105 group-hover:-rotate-3">
          <svg className="w-48 h-48 sm:w-64 sm:h-64" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
          </svg>
        </div>

        <div className="w-14 h-14 mb-4 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-inner border border-slate-300/50 dark:border-slate-700/50 relative z-10 group-hover:scale-105 transition-transform duration-500">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
        </div>

        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold mb-3 tracking-[0.15em] text-[9px] sm:text-[10px] bg-slate-100 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 relative z-10">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
          <span>MINTING ENDED</span>
        </div>

        <h3 className="text-2xl sm:text-[28px] font-black text-slate-900 dark:text-white mb-2 tracking-tight relative z-10">Sold Out</h3>
        
        <p className="text-xs sm:text-[14px] text-slate-500 dark:text-slate-400 mb-6 max-w-sm leading-relaxed relative z-10">
          All available NFTs for this campaign have been minted. Thank you for the incredible support!
        </p>

        <a
          href={getOpenSeaUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 flex items-center justify-center gap-2 w-full py-3.5 text-center rounded-2xl bg-white dark:bg-transparent text-slate-800 dark:text-white font-bold transition-all duration-200 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 mt-2 mb-2 shadow-sm hover:shadow text-sm"
        >
          <span>View Collection</span>
        </a>

        {renderCustomWeb3Button()}
      </div>
    );
  }

  return (
    <div className="litera-widget-container relative flex flex-col items-center p-6 sm:p-8 bg-white/70 dark:bg-[#0a0a0a]/90 backdrop-blur-2xl rounded-3xl shadow-2xl dark:shadow-[0_0_80px_-20px_rgba(255,255,255,0.05)] border border-slate-200/50 dark:border-white/10 text-center my-6 transition-all duration-700 overflow-hidden group hover:dark:border-white/20">
      
      {/* Premium Web3 Glow Effects */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-blue-500/20 transition-colors duration-700"></div>
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-indigo-500/20 transition-colors duration-700"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 dark:to-transparent opacity-50 pointer-events-none"></div>

      <div className="flex flex-col items-center w-full mb-6 relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
          <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Digital Collectible</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Litera Mint</h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Collect & earn rewards</p>
      </div>

      <button
        onClick={handleBuy}
        disabled={isApprovingReq || isApprovingTx || isMintingReq || isMintingTx || isMintSuccess || (userBalance !== undefined && BigInt(userBalance as any) < BigInt(price))}
        className="w-full py-3.5 rounded-2xl text-white font-black transition-all duration-200 relative z-10 flex items-center justify-center gap-3 text-sm bg-blue-600 shadow-[0_4px_0_0_#1d4ed8,0_10px_20px_rgba(37,99,235,0.4)] hover:-translate-y-1 hover:shadow-[0_4px_0_0_#1d4ed8,0_15px_25px_rgba(37,99,235,0.5)] active:translate-y-1 active:shadow-[0_0px_0_0_#1d4ed8,0_5px_10px_rgba(37,99,235,0.5)] disabled:opacity-50 disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed"
      >
        <span className="relative z-10 flex items-center justify-center gap-2 font-bold tracking-wide">
          {isApprovingTx || isApprovingReq ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Approving LITE...
            </>
          ) : isMintingTx || isMintingReq ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Minting NFT...
            </>
          ) : isMintSuccess ? (
             "Success!"
          ) : (
            <>
              Mint NFT <span className="opacity-50">|</span> <span className="text-blue-200">{price && price > BigInt(0) ? `${parseFloat(formatUnits(price, 18)).toLocaleString('en-US')} LITE` : 'Free'}</span>
              <svg className="w-4 h-4 ml-1 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </>
          )}
        </span>
      </button>

      {userBalance !== undefined && BigInt(userBalance as any) < BigInt(price) && (
        <p className="text-xs text-rose-400 mt-3 font-semibold tracking-wide relative z-10 flex items-center justify-center gap-1.5 opacity-90">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          Insufficient LITE Balance
        </p>
      )}

      {renderCustomWeb3Button()}
    </div>
  );
};

export default LiteraWidget;