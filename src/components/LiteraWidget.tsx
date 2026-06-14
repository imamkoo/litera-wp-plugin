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
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-blue-500/20">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
          </div>
          <h3 className="text-2xl font-black text-white mb-3">Connect Wallet</h3>
          <p className="text-sm text-slate-400 mb-8 max-w-sm leading-relaxed">
            Connect your Web3 wallet to collect this article and unlock premium perks.
          </p>
          <button onClick={() => open()} className="w-full py-4 rounded-xl bg-blue-600 text-white font-black shadow-[0_4px_0_0_#1d4ed8,0_10px_20px_rgba(37,99,235,0.4)] hover:-translate-y-1 hover:shadow-[0_4px_0_0_#1d4ed8,0_15px_25px_rgba(37,99,235,0.5)] active:translate-y-1 active:shadow-[0_0px_0_0_#1d4ed8,0_5px_10px_rgba(37,99,235,0.5)] transition-all duration-200">
            Connect Wallet
          </button>
        </div>
      );
    }

    if (isSoldOut && !hasAccess) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/5">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
          </div>
          <h3 className="text-2xl font-black text-white mb-3">Campaign Sold Out</h3>
          <p className="text-sm text-slate-400 mb-6">
            All available items have been minted.
          </p>
          <div className="bg-slate-800 px-6 py-2 rounded-full text-sm font-bold text-slate-300 border border-white/5">
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
          <div className="w-full h-full flex flex-col p-6 md:p-8">
            <div className="flex items-center justify-center gap-2 text-orange-400 font-black mb-6 tracking-[0.15em] text-[10px] bg-orange-500/10 w-fit mx-auto px-5 py-2.5 rounded-full border border-orange-500/20 shrink-0">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
              <span>ACCESS GRANTED</span>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar mb-6">
              <p className="text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {unlockedContent.description}
              </p>
            </div>
            
            <div className="flex flex-col gap-3 shrink-0">
              <a
                href={unlockedContent.content}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-orange-500 text-white font-black transition-all duration-200 shadow-[0_4px_0_0_#c2410c,0_10px_20px_rgba(249,115,22,0.4)] hover:-translate-y-1 hover:shadow-[0_4px_0_0_#c2410c,0_15px_25px_rgba(249,115,22,0.5)] active:translate-y-1 active:shadow-[0_0px_0_0_#c2410c,0_5px_10px_rgba(249,115,22,0.5)]"
              >
                <span>Open Premium Content</span>
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
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6 border border-orange-500/20 animate-pulse">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-3">Decrypting Data...</h3>
            <p className="text-sm text-slate-400">Loading premium content securely from IPFS.</p>
          </div>
        );
      }

      // Skenario A.3: Unlockable EXIST but not yet revealed
      if (hasUnlockableContent) {
        return (
          <div className="w-full h-full flex flex-col p-6 text-center justify-center items-center relative overflow-hidden">
            <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-4">Unlock Exclusive Content</h3>
            <p className="text-sm text-slate-400 mb-10 leading-relaxed max-w-sm">
              {isCreator 
                ? "You are the creator of this asset. Click the button below to decrypt and reveal the hidden content." 
                : "You own this NFT! Click the button below to decrypt and reveal the exclusive hidden content."}
            </p>
            <button
              onClick={handleReveal}
              disabled={isRevealingReq || isRevealingTx}
              className="w-full py-4 rounded-xl bg-blue-600 text-white font-black shadow-[0_4px_0_0_#1d4ed8,0_10px_20px_rgba(37,99,235,0.4)] hover:-translate-y-1 hover:shadow-[0_4px_0_0_#1d4ed8,0_15px_25px_rgba(37,99,235,0.5)] active:translate-y-1 active:shadow-[0_0px_0_0_#1d4ed8,0_5px_10px_rgba(37,99,235,0.5)] transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
            >
              {isRevealingTx ? "Decrypting..." : "Reveal Hidden Content"}
            </button>
          </div>
        );
      }

      // Skenario B/C: No Unlockable Content
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h3 className="text-2xl font-black text-white mb-2">Campaign Completed</h3>
          <p className="text-emerald-500 font-black text-sm mb-6">Reward Verified</p>
          <p className="text-sm text-slate-400">Terima kasih telah berpartisipasi!</p>
        </div>
      );
    }

    // Default: Minting (Live Campaign)
    return (
      <div className="w-full h-full flex flex-col p-6 text-center justify-center items-center">
        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30">
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
             <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
        </div>
        <h3 className="text-2xl font-black text-white mb-4">Exclusive Content</h3>
        <p className="text-sm text-slate-400 mb-10 leading-relaxed max-w-sm">
          This asset contains encrypted data. Mint this NFT to gain access and decrypt the hidden content.
        </p>
        <button
          onClick={handleBuy}
          disabled={isApprovingReq || isApprovingTx || isMintingReq || isMintingTx || isMintSuccess || (userBalance !== undefined && BigInt(userBalance as any) < BigInt(price))}
          className="w-full py-4 rounded-xl bg-blue-600 text-white font-black shadow-[0_4px_0_0_#1d4ed8,0_10px_20px_rgba(37,99,235,0.4)] hover:-translate-y-1 hover:shadow-[0_4px_0_0_#1d4ed8,0_15px_25px_rgba(37,99,235,0.5)] active:translate-y-1 active:shadow-[0_0px_0_0_#1d4ed8,0_5px_10px_rgba(37,99,235,0.5)] transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
        >
          {userBalance !== undefined && BigInt(userBalance as any) < BigInt(price) ? (
            "Insufficient LITE"
          ) : isApprovingTx || isApprovingReq ? (
            "Approving LITE..."
          ) : isMintingTx || isMintingReq ? (
            "Minting NFT..."
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
    <div className="litera-widget-container w-full max-w-3xl mx-auto my-10 font-sans">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
      `}</style>
      
      {/* SINGLE UNIFIED CARD */}
      <div className="bg-[#0f1219] rounded-[2.5rem] p-6 shadow-2xl border border-white/5 flex flex-col md:flex-row gap-6 relative overflow-hidden items-stretch">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>

        {/* LEFT COLUMN: NFT MEDIA & VIEW NFT */}
        <div className="w-full md:w-1/2 flex flex-col gap-4 shrink-0">
          <div className="aspect-[4/5] w-full rounded-[1.5rem] overflow-hidden bg-[#13192B] relative shadow-inner border border-white/5">
            {nftMedia ? (
              nftMedia.type === 'image' ? (
                <img src={nftMedia.url} alt="NFT Media" className="w-full h-full object-cover" />
              ) : (
                <video src={nftMedia.url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 animate-pulse">
                <span className="text-xs font-bold tracking-widest uppercase opacity-50">Loading Asset...</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
          </div>
          
          <a
            href={getOpenSeaUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 rounded-xl bg-slate-800 text-white font-black text-center shadow-[0_4px_0_0_#1e293b,0_10px_20px_rgba(0,0,0,0.4)] hover:-translate-y-1 hover:shadow-[0_4px_0_0_#1e293b,0_15px_25px_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-[0_0px_0_0_#1e293b,0_5px_10px_rgba(0,0,0,0.5)] transition-all duration-200 border border-white/5"
          >
            View NFT
          </a>
        </div>

        {/* RIGHT COLUMN: DYNAMIC STATE WITH SCROLL */}
        <div className="w-full md:w-1/2 flex flex-col bg-[#161b26] rounded-[1.5rem] border border-white/5 shadow-inner overflow-hidden max-h-[500px] md:max-h-none">
          {renderStateCard()}
        </div>

      </div>
    </div>
  );
};

export default LiteraWidget;