import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
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
  activeNetworkName
} from '../shared/contracts/ContractConfig';
import { useSafeGas } from '../shared/hooks/useSafeGas';

interface LiteraWidgetProps {
  tokenId: number;
}

const LiteraWidget: React.FC<LiteraWidgetProps> = ({ tokenId }) => {
  const { address, isConnected } = useAccount();
  const [unlockedContent, setUnlockedContent] = useState<{ description: string; content: string } | null>(null);
  const [hasVisitedSponsor, setHasVisitedSponsor] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);

  const getOpenSeaUrl = () => {
    const baseUrl = activeNetworkName === 'MAINNET' ? 'https://opensea.io/assets/matic' : 'https://testnets.opensea.io/assets/amoy';
    return `${baseUrl}/${Erc1155Adress}/${tokenId}`;
  };

  useEffect(() => {
    setUnlockedContent(null);
  }, [address]);

  // --- Contracts Read ---

  // 1. Ownership Check (balanceOf)
  const { data: balanceData } = useReadContract({
    address: Erc1155Adress,
    abi: erc1155ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`, BigInt(tokenId)],
    chainId: 80002,
    query: { enabled: !!address && tokenId > 0 }
  });
  const ownsNFT = balanceData ? Number(balanceData) > 0 : false;

  // 2. Article Info Check (price, maxMint, totalMint)
  const { data: articleInfo } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'articleInfo',
    args: [BigInt(tokenId)],
    chainId: 80002,
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
    chainId: 80002,
    query: { enabled: !!address && hasAccess }
  });

  // 4. Allowance Check
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: Erc20Adress,
    abi: erc20ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, contractAddress],
    chainId: 80002,
    query: { enabled: !!address && !hasAccess }
  });

  // 4.5. Balance Check
  const { data: userBalance } = useReadContract({
    address: Erc20Adress,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    chainId: 80002,
    query: { enabled: !!address && !hasAccess }
  });

  // 5. Unlockable Existence Check
  const { data: isContentUnlockableData } = useReadContract({
    address: UnlockableAddress,
    abi: unlockableABI,
    functionName: 'isContentUnlockable',
    args: [BigInt(tokenId)],
    chainId: 80002,
    query: { enabled: tokenId > 0 }
  });
  const hasUnlockableContent = Boolean(isContentUnlockableData);

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

  // --- Effects ---

  // Auto-mint after approve
  useEffect(() => {
    if (isApproveSuccess) {
      handleMintAction();
    }
  }, [isApproveSuccess]);

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
      <div className="litera-widget-container flex flex-col items-center justify-center p-8 bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/50 text-center my-8 transition-all duration-500 hover:shadow-slate-300/50">
        <div className="w-12 h-12 mb-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">Exclusive Campaign</h3>
        <p className="text-sm text-slate-500 mb-6 max-w-xs leading-relaxed">Connect your wallet to collect this article and participate in the campaign.</p>
        {/* @ts-ignore */}
        <w3m-button />
      </div>
    );
  }

  if (hasAccess) {
    // Skenario: Require Visit Sponsor first if externalURI exists
    const sponsorRequired = externalURI && externalURI.length > 5 && !hasVisitedSponsor;

    if (sponsorRequired) {
      return (
        <div className="litera-widget-container flex flex-col items-center p-8 bg-gradient-to-b from-white/80 to-blue-50/50 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-200/50 border border-blue-100 my-8 text-center transition-all duration-500">
          <div className="w-16 h-16 mb-5 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-200 animate-bounce-slow">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold mb-3 tracking-wide text-sm bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100">
            <span>ONE MORE STEP</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">Complete Task to Unlock</h3>
          <p className="text-sm text-slate-600 mb-8 max-w-sm leading-relaxed">
            {hasUnlockableContent
              ? (isCreator ? "Welcome back, Creator! To access the hidden premium content, please view your NFT." : "You own this NFT! To access the hidden premium content, please view your NFT.")
              : (isCreator ? "Welcome back, Creator! To complete this campaign, please view your NFT." : "You own this NFT! To complete this campaign and verify your reward, please view your NFT.")}
          </p>
          <a
            href={getOpenSeaUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              // Beri sedikit delay agar UX terasa natural
              setTimeout(() => setHasVisitedSponsor(true), 1000);
            }}
            className="group relative flex items-center justify-center gap-3 w-full py-4 text-center rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 hover:scale-[1.02] transition-all duration-300 shadow-xl shadow-slate-300 overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600/20 to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <img src="https://opensea.io/static/images/logos/opensea-logo.svg" alt="OpenSea" className="relative z-10 w-5 h-5 invert" />
            <span className="relative z-10">View Your NFT</span>
            <svg className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </a>
          {externalURI && externalURI.length > 5 && (
            <a href={externalURI} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-600 underline mt-4" onClick={() => { setTimeout(() => setHasVisitedSponsor(true), 1000); }}>
              Visit Sponsor
            </a>
          )}
        </div>
      );
    }

    // Helper untuk memvalidasi apakah cidUnlockable benar-benar sebuah CID yang valid
    const isValidCid = cidUnlockable && typeof cidUnlockable === 'string' && cidUnlockable.length > 10;

    // Skenario A.1: Unlockable EXIST and already decrypted & fetched
    if (hasUnlockableContent && isValidCid && unlockedContent) {
      return (
        <div className="litera-widget-container flex flex-col items-center p-8 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-emerald-100/50 border border-emerald-500/10 my-8 transition-all duration-500">
          <div className="flex items-center gap-2 text-emerald-600 font-bold mb-5 tracking-wide text-sm bg-emerald-50 px-4 py-1.5 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
            <span>ACCESS GRANTED</span>
          </div>
          <div className="w-full bg-slate-50/50 p-5 rounded-2xl border border-slate-100 mb-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>
            <p className="text-slate-700 font-medium text-center leading-relaxed">"{unlockedContent.description}"</p>
          </div>
          <a
            href={unlockedContent.content}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 text-center rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 hover:scale-[1.02] transition-all duration-300 shadow-xl shadow-emerald-200 mb-3"
          >
            <span>Open Premium Content</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </a>
          <a
            href={getOpenSeaUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 text-center rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-all duration-300 mb-2 border border-slate-200"
          >
            <img src="https://opensea.io/static/images/logos/opensea-logo.svg" alt="OpenSea" className="w-5 h-5 opacity-80" />
            <span>View NFT on OpenSea</span>
          </a>
          {externalURI && externalURI.length > 5 && (
            <a href={externalURI} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-slate-700 underline mt-1 mb-2">
              Visit Sponsor
            </a>
          )}
          {/* @ts-ignore */}
          <div className="mt-4 flex justify-center w-full"><w3m-button /></div>
        </div>
      );
    }

    // Skenario A.2: Unlockable EXIST but waiting for IPFS or fallback after reveal
    if (hasUnlockableContent && (isRevealSuccess || isValidCid)) {
      // Fallback jika CID rusak atau publisher belum upload tapi status sudah isContentUnlockable
      return (
        <div className="litera-widget-container flex flex-col items-center p-8 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/50 my-8 text-center transition-all duration-500">
          <div className="w-16 h-16 mb-5 bg-gradient-to-tr from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </div>
          <div className="flex items-center gap-2 text-blue-600 font-bold mb-4 tracking-wide text-sm bg-blue-50 px-4 py-1.5 rounded-full">
            <span>LOADING CONTENT</span>
          </div>
          <p className="text-sm text-slate-500 mb-8 max-w-xs leading-relaxed">Decrypting and loading premium content securely from IPFS...</p>
          {/* @ts-ignore */}
          <div className="mt-2 flex justify-center w-full"><w3m-button /></div>
        </div>
      );
    }

    // Skenario A.3: Unlockable EXIST but not yet revealed
    if (hasUnlockableContent) {
      return (
        <div className="litera-widget-container flex flex-col items-center p-8 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/50 my-8 text-center transition-all duration-500">
          <div className="w-14 h-14 mb-4 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">{isCreator ? "Creator Access Granted" : "NFT Owned!"}</h3>
          <p className="text-sm text-slate-500 mb-8 max-w-xs leading-relaxed">
            {isCreator ? "You created this article. Reveal the hidden content now." : "You have collected this article. Reveal the hidden content now."}
          </p>
          <button
            onClick={handleReveal}
            disabled={isRevealingReq || isRevealingTx}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 transition-all duration-300 shadow-xl shadow-indigo-200"
          >
            {isRevealingTx ? "Decrypting..." : "Reveal Content"}
          </button>
          {/* @ts-ignore */}
          <div className="mt-4 flex justify-center w-full"><w3m-button /></div>
        </div>
      );
    }

    // Skenario B/C: No Unlockable Content! Pure Gamification / Sponsor Campaign
    return (
      <div className="litera-widget-container flex flex-col items-center p-8 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/50 my-8 text-center transition-all duration-500">
        <div className="w-16 h-16 mb-5 bg-gradient-to-tr from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <div className="flex flex-col items-center justify-center gap-1 mb-6 text-slate-800 font-semibold text-lg tracking-tight">
          <p>Campaign Completed</p>
          <p className="text-emerald-600">Reward Verified</p>
        </div>
        <p className="text-sm text-slate-500 mb-8 max-w-xs leading-relaxed">Terima kasih telah berpartisipasi!</p>
        <a
          href={getOpenSeaUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 text-center rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-all duration-300 mb-2 border border-slate-200"
        >
          <img src="https://opensea.io/static/images/logos/opensea-logo.svg" alt="OpenSea" className="w-5 h-5 opacity-80" />
          <span>View NFT on OpenSea</span>
        </a>
        {externalURI && externalURI.length > 5 && (
          <a href={externalURI} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-slate-700 underline mt-1 mb-2">
            Visit Sponsor
          </a>
        )}
        {/* @ts-ignore */}
        <div className="mt-4 flex justify-center w-full"><w3m-button /></div>
      </div>
    );
  }

  if (isSoldOut) {
    return (
      <div className="litera-widget-container flex flex-col items-center justify-center p-8 bg-white/50 backdrop-blur-md rounded-3xl border border-slate-200/50 text-center my-8">
        <div className="w-12 h-12 mb-4 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
        </div>
        <h3 className="text-lg font-bold text-slate-700 mb-1 tracking-tight">Campaign Sold Out</h3>
        <p className="text-sm text-slate-500">{totalMinted} / {maxMinted} Minted</p>
        {/* @ts-ignore */}
        <div className="mt-4 flex justify-center w-full"><w3m-button /></div>
      </div>
    );
  }

  return (
    <div className="litera-widget-container flex flex-col items-center p-8 bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/50 text-center my-8 transition-all duration-500 hover:shadow-slate-300/50">
      <div className="flex items-center justify-between w-full mb-6">
        <div className="flex flex-col items-start text-left">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Litera Campaign</h3>
          <p className="text-sm text-slate-500">Collect & earn rewards</p>
        </div>
        <div className="flex flex-col items-end text-right">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">MINTED</span>
          <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">{totalMinted} <span className="text-slate-400 font-normal">/ {maxMinted}</span></span>
        </div>
      </div>

      <button
        onClick={handleBuy}
        disabled={isApprovingReq || isApprovingTx || isMintingReq || isMintingTx || isMintSuccess || (userBalance !== undefined && BigInt(userBalance as any) < BigInt(price))}
        className="relative group w-full py-4 rounded-2xl bg-slate-900 text-white font-semibold overflow-hidden hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 transition-all duration-300 shadow-xl shadow-slate-300"
      >
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600/20 to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <span className="relative z-10 flex items-center justify-center gap-2">
          {userBalance !== undefined && BigInt(userBalance as any) < BigInt(price) ? "Insufficient LITE Balance" :
            isApprovingTx || isApprovingReq ? "Approving LITE..." :
              isMintingTx || isMintingReq ? "Minting..." :
                isMintSuccess ? "Success!" :
                  `Mint NFT${price && price > BigInt(0) ? ` - ${parseFloat(formatUnits(price, 18)).toLocaleString('en-US')} LITE` : ' - Free'}`}
          {!(userBalance !== undefined && BigInt(userBalance as any) < BigInt(price)) && !isApprovingTx && !isApprovingReq && !isMintingTx && !isMintingReq && !isMintSuccess && (
            <svg className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
          )}
        </span>
      </button>
      {/* @ts-ignore */}
      <div className="mt-6 flex justify-center w-full"><w3m-button /></div>
    </div>
  );
};

export default LiteraWidget;