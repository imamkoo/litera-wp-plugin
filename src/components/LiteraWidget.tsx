import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
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
  const [sponsorUrl, setSponsorUrl] = useState<string | null>(null);
  const [nftMedia, setNftMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [nftMetadata, setNftMetadata] = useState<{ name: string, description: string, type: string } | null>(null);
  const { open } = useWeb3Modal();

  // ============================
  // CUSTOM PREMIUM WEB3 BUTTON
  // ============================
  const renderCustomWeb3Button = () => {
    return (
      <button
        onClick={() => open()}
        className="group relative flex items-center justify-center py-3 px-6 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:scale-[1.02] transition-all duration-300 shadow-xl overflow-hidden mt-6 z-10 border border-slate-700 dark:border-white/20"
      >
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <span className="relative z-10 flex items-center gap-3">
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
              <span className="text-sm tracking-wide opacity-90">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
              Connect Wallet
            </>
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
  const { data: allowance } = useReadContract({
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

          setNftMetadata({
            name: res.data.name || "Unknown Asset",
            description: res.data.description || "No description provided.",
            type: res.data?.properties?.TYPE || "Blog Post"
          });
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

  // --- STATE CARD RENDERER ---
  const renderStateCard = () => {
    if (!isConnected) {
      return (
        <div className="w-full bg-slate-50 dark:bg-slate-800/30 p-6 md:p-8 rounded-[2rem] border border-slate-200/60 dark:border-white/5 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Connect Wallet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-sm leading-relaxed">
            Connect your Web3 wallet to collect this article and unlock premium perks.
          </p>
          <button onClick={() => open()} className="py-3.5 px-8 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-xl hover:scale-105 transition-transform duration-300">
            Connect Wallet
          </button>
        </div>
      );
    }

    if (isSoldOut && !hasAccess) {
      return (
        <div className="w-full bg-slate-50 dark:bg-slate-800/30 p-6 md:p-8 rounded-[2rem] border border-slate-200/60 dark:border-white/5 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
            <svg className="w-8 h-8 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Campaign Sold Out</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            All available items have been minted.
          </p>
          <div className="bg-slate-200/50 dark:bg-slate-700/50 px-6 py-2 rounded-full text-sm font-bold text-slate-600 dark:text-slate-300">
            {totalMinted} / {maxMinted} Minted
          </div>
        </div>
      );
    }

    if (hasAccess) {
      const isValidCid = cidUnlockable && typeof cidUnlockable === 'string' && cidUnlockable.length > 10;

      // Skenario A.1: Unlockable EXIST and already decrypted & fetched
      if (hasUnlockableContent && isValidCid && unlockedContent) {
        return (
          <div className="w-full bg-[#2A2522] dark:bg-[#1f1a17] p-6 md:p-8 rounded-[2rem] border border-orange-500/20 shadow-2xl shadow-orange-500/10 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-400 to-orange-600"></div>
            
            <div className="flex items-center justify-center gap-2 text-orange-400 font-bold mb-6 tracking-[0.15em] text-xs bg-orange-500/10 w-fit mx-auto px-5 py-2 rounded-full border border-orange-500/20">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
              <span>ACCESS GRANTED</span>
            </div>
            
            <p className="text-slate-200 font-mono text-sm text-left leading-relaxed mb-8 whitespace-pre-wrap">
              {unlockedContent.description}
            </p>
            
            <div className="flex flex-col gap-3">
              <a
                href={unlockedContent.content}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all duration-300 shadow-lg shadow-orange-500/20"
              >
                <span>Open Premium Content</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
              </a>
              {sponsorUrl && sponsorUrl.length > 5 && (
                <a href={sponsorUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold transition-all duration-300 border border-blue-500/20 text-sm">
                  <span>Visit Sponsor</span>
                </a>
              )}
            </div>
          </div>
        );
      }

      // Skenario A.2: Loading / Decrypting
      if (hasUnlockableContent && (isRevealSuccess || isValidCid)) {
        return (
          <div className="w-full bg-slate-50 dark:bg-slate-800/30 p-6 md:p-8 rounded-[2rem] border border-slate-200/60 dark:border-white/5 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mb-4 shadow-inner animate-pulse">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Decrypting Data...</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Loading premium content securely from IPFS.</p>
          </div>
        );
      }

      // Skenario A.3: Unlockable EXIST but not yet revealed
      if (hasUnlockableContent) {
        return (
          <div className="w-full bg-slate-50 dark:bg-slate-800/30 p-6 md:p-8 rounded-[2rem] border border-slate-200/60 dark:border-white/5 relative overflow-hidden">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 mb-5 relative z-10">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
            {/* Background Watermark Lock */}
            <div className="absolute -bottom-16 -right-16 text-slate-200/80 dark:text-slate-800/80 pointer-events-none">
              <svg className="w-64 h-64" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 relative z-10">Unlock Exclusive Content</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed max-w-sm relative z-10">
              {isCreator 
                ? "You are the creator of this asset. Click the button below to decrypt and reveal the hidden content." 
                : "You own this NFT! Click the button below to decrypt and reveal the exclusive hidden content."}
            </p>
            <button
              onClick={handleReveal}
              disabled={isRevealingReq || isRevealingTx}
              className="w-full py-3.5 px-6 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all duration-300 shadow-md flex items-center justify-center gap-2 relative z-10"
            >
              {isRevealingTx ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Decrypting...
                </>
              ) : (
                "Reveal Hidden Content"
              )}
            </button>
          </div>
        );
      }

      // Skenario B/C: No Unlockable Content
      return (
        <div className="w-full bg-slate-50 dark:bg-slate-800/30 p-6 md:p-8 rounded-[2rem] border border-slate-200/60 dark:border-white/5 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight">Campaign Completed</h3>
          <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-6">Reward Verified</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Terima kasih telah berpartisipasi!</p>
          {sponsorUrl && sponsorUrl.length > 5 && (
            <a href={sponsorUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-600 underline">
              Visit Sponsor
            </a>
          )}
        </div>
      );
    }

    // Default: Minting (Live Campaign)
    return (
      <div className="w-full bg-slate-50 dark:bg-slate-800/30 p-6 md:p-8 rounded-[2rem] border border-slate-200/60 dark:border-white/5 relative overflow-hidden">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 mb-5">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
             <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Unlock Exclusive Content</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          This asset contains exclusive encrypted data. Mint this NFT to gain access and decrypt the hidden content.
        </p>
        <button
          onClick={handleBuy}
          disabled={isApprovingReq || isApprovingTx || isMintingReq || isMintingTx || isMintSuccess || (userBalance !== undefined && BigInt(userBalance as any) < BigInt(price))}
          className="w-full py-3.5 px-6 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all duration-300 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {userBalance !== undefined && BigInt(userBalance as any) < BigInt(price) ? (
            "Insufficient LITE Balance"
          ) : isApprovingTx || isApprovingReq ? (
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
            `Unlock for ${price && price > BigInt(0) ? parseFloat(formatUnits(price, 18)).toLocaleString('en-US') : '0'} LITE`
          )}
        </button>
      </div>
    );
  };

  // --- MAIN LAYOUT WRAPPER ---
  return (
    <div className="litera-widget-container flex flex-col lg:flex-row gap-6 lg:gap-10 w-full max-w-5xl mx-auto my-10 font-sans">
      
      {/* LEFT COLUMN: NFT MEDIA & ACTIONS */}
      <div className="w-full lg:w-5/12 flex flex-col gap-4 shrink-0">
        <div className="bg-[#0B0F19] rounded-[2rem] p-4 shadow-2xl relative overflow-hidden group">
          {/* Animated Glow behind image */}
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-purple-600/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
          
          <div className="aspect-square w-full rounded-[1.5rem] overflow-hidden bg-[#13192B] relative z-10 shadow-inner">
            {nftMedia ? (
              nftMedia.type === 'image' ? (
                <img src={nftMedia.url} alt="NFT Media" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              ) : (
                <video src={nftMedia.url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 animate-pulse">
                <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span className="text-xs font-bold tracking-widest uppercase opacity-50">Loading Asset...</span>
              </div>
            )}
          </div>
          
          {/* View NFT Action */}
          <div className="mt-4 relative z-10">
            <a
              href={getOpenSeaUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold transition-all duration-300 border border-white/10 hover:border-white/20 text-sm"
            >
              <img src="https://opensea.io/static/images/logos/opensea-logo.svg" alt="OpenSea" className="w-4 h-4 opacity-80 invert" />
              <span>View NFT</span>
            </a>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: METADATA & STATE */}
      <div className="w-full lg:w-7/12 bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-200/60 dark:border-white/5 flex flex-col relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-[80px] pointer-events-none"></div>

        {/* Top Bar: Web3 Button / Connected State */}
        <div className="flex justify-end mb-4 relative z-10">
          <div onClick={() => open()} className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors">
            {isConnected ? (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 tracking-wide">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </>
            ) : (
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wide px-1">Wallet Not Connected</span>
            )}
          </div>
        </div>

        {/* Header Title */}
        <div className="flex justify-between items-start mb-8 relative z-10">
          <h2 className="text-3xl md:text-[2.5rem] font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">
            {nftMetadata ? nftMetadata.name : "Exclusive Asset"}
          </h2>
          <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-xs font-extrabold text-slate-500 dark:text-slate-400 whitespace-nowrap ml-4 shrink-0 shadow-sm">
            ID #{tokenId}
          </div>
        </div>

        {/* Dynamic State Card */}
        <div className="flex-1 flex flex-col justify-center relative z-10">
          {renderStateCard()}
        </div>

        {/* Metadata Pills */}
        <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/50 relative z-10">
          <div className="flex-1 min-w-[110px] bg-slate-50 dark:bg-white/5 rounded-2xl p-4 flex flex-col items-start shadow-sm border border-transparent dark:border-white/5">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">SECURITY</span>
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold text-sm">
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
              Verified
            </div>
          </div>
          <div className="flex-1 min-w-[110px] bg-slate-50 dark:bg-white/5 rounded-2xl p-4 flex flex-col items-start shadow-sm border border-transparent dark:border-white/5">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">CATEGORY</span>
            <div className="text-slate-800 dark:text-slate-200 font-bold text-sm truncate w-full">
              {nftMetadata ? nftMetadata.type : "Blog Post"}
            </div>
          </div>
          <div className="flex-1 min-w-[110px] bg-slate-50 dark:bg-white/5 rounded-2xl p-4 flex flex-col items-start shadow-sm border border-transparent dark:border-white/5">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">NETWORK</span>
            <div className="text-slate-800 dark:text-slate-200 font-bold text-sm">
              {activeNetworkName === 'MAINNET' ? 'Polygon' : 'Amoy'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiteraWidget;