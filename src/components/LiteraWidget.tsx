import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSignMessage } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { CheckCircle2Icon, AlertCircleIcon, BookOpenIcon, Loader2Icon, ShieldCheckIcon } from 'lucide-react';
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

/* ═══════════════════════════════════════════════════════
   Dynamic Theme CSS — injected once via <style> tag.
   Uses prefers-color-scheme so dark/light follows device.
   ═══════════════════════════════════════════════════════ */
const THEME_CSS = `
@media (prefers-color-scheme: light) {
  .lw-root {
    --lw-bg: rgba(255, 255, 255, 0.4);
    --lw-bg-alt: rgba(255, 255, 255, 0.7);
    --lw-bg-inner: rgba(255, 255, 255, 0.5);
    --lw-border: rgba(255, 255, 255, 0.6);
    --lw-border-hover: rgba(255, 255, 255, 0.9);
    --lw-text: #1e293b;
    --lw-text-secondary: #475569;
    --lw-text-muted: #94a3b8;
    --lw-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
    --lw-option-bg: rgba(255, 255, 255, 0.6);
    --lw-option-border: rgba(255, 255, 255, 0.8);
    --lw-option-hover: rgba(255, 255, 255, 0.9);
    --lw-option-selected-bg: rgba(240,78,55,0.15);
    --lw-option-selected-border: rgba(240,78,55,0.6);
    --lw-progress-bg: rgba(0,0,0,0.05);
    --lw-badge-bg: rgba(240,78,55,0.15);
    --lw-badge-border: rgba(240,78,55,0.3);
    --lw-badge-text: #F04E37;
    --lw-wallet-bg: rgba(255, 255, 255, 0.8);
    --lw-wallet-text: #0f172a;
    --lw-score-card-bg: rgba(255, 255, 255, 0.7);
    --lw-glow: rgba(240,78,55,0.15);
    --lw-glass-inset: inset 0 0 0 1px rgba(255,255,255,0.8);
  }
}
@media (prefers-color-scheme: dark) {
  .lw-root {
    --lw-bg: rgba(15, 23, 42, 0.95);
    --lw-bg-alt: rgba(10, 15, 28, 0.98);
    --lw-bg-inner: rgba(255, 255, 255, 0.08);
    --lw-border: rgba(255, 255, 255, 0.15);
    --lw-border-hover: rgba(255, 255, 255, 0.3);
    --lw-text: #ffffff;
    --lw-text-secondary: #e2e8f0;
    --lw-text-muted: #94a3b8;
    --lw-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.7);
    --lw-option-bg: rgba(255, 255, 255, 0.08);
    --lw-option-border: rgba(255, 255, 255, 0.15);
    --lw-option-hover: rgba(255, 255, 255, 0.2);
    --lw-option-selected-bg: rgba(240,78,55,0.15);
    --lw-option-selected-border: rgba(240,78,55,0.6);
    --lw-progress-bg: rgba(255,255,255,0.15);
    --lw-badge-bg: rgba(240,78,55,0.25);
    --lw-badge-border: rgba(240,78,55,0.4);
    --lw-badge-text: #ff8c7a;
    --lw-wallet-bg: rgba(255, 255, 255, 0.15);
    --lw-wallet-text: #ffffff;
    --lw-score-card-bg: rgba(255, 255, 255, 0.08);
    --lw-glow: rgba(240,78,55,0.15);
    --lw-glass-inset: inset 0 0 0 1px rgba(255,255,255,0.15);
  }
}
.lw-root {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--lw-text);
}
`;

let themeInjected = false;
const injectThemeCSS = () => {
  if (themeInjected) return;
  const style = document.createElement('style');
  style.textContent = THEME_CSS;
  document.head.appendChild(style);
  themeInjected = true;
};

/* ═══════════════════════════════════════════════════════
   Reusable Sub-components
   ═══════════════════════════════════════════════════════ */

/** Consistent "Powered by Litera" footer used in ALL states */
const PoweredByLitera: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '16px', opacity: 0.5 }}>
    <svg viewBox="0 0 200 200" style={{ width: '12px', height: '12px' }}>
      <circle cx="100" cy="100" r="100" fill="#F04E37" />
      <text x="100" y="130" fill="#FFFFFF" fontSize="90" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="bold" textAnchor="middle" letterSpacing="-2">L</text>
    </svg>
    <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--lw-text-muted)', letterSpacing: '0.05em' }}>Powered by Litera</span>
  </div>
);

/** Primary action button — solid Litera orange, no gradient */
const LiteraButton: React.FC<{ onClick?: () => void; disabled?: boolean; children: React.ReactNode; variant?: 'primary' | 'secondary' | 'outline'; fullWidth?: boolean; href?: string }> = ({ onClick, disabled, children, variant = 'primary', fullWidth = true, href }) => {
  const baseStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    width: fullWidth ? '100%' : 'auto',
    padding: '14px 24px',
    borderRadius: '16px',
    fontSize: '13px', fontWeight: 800, letterSpacing: '0.02em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    border: 'none',
    textDecoration: 'none',
    opacity: disabled ? 0.5 : 1,
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: { 
      ...baseStyle, 
      background: 'linear-gradient(135deg, #F04E37 0%, #d9432f 100%)', 
      color: '#ffffff',
      boxShadow: '0 8px 16px -4px rgba(240,78,55,0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
      textShadow: '0 1px 2px rgba(0,0,0,0.2)'
    },
    secondary: { 
      ...baseStyle, 
      background: 'var(--lw-bg-inner)', 
      color: 'var(--lw-text)', 
      border: '1px solid var(--lw-border)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05), var(--lw-glass-inset)'
    },
    outline: { 
      ...baseStyle, 
      background: 'transparent', 
      color: 'var(--lw-text)', 
      border: '1.5px solid var(--lw-border)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    },
  };

  const style = variants[variant] || variants.primary;

  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" style={style}>{children}</a>;
  }
  return <button onClick={onClick} disabled={disabled} style={style}>{children}</button>;
};

/** Widget container shell — consistent across all states */
const WidgetShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="lw-root" style={{
    position: 'relative',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '28px 24px',
    background: 'var(--lw-bg)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '24px',
    border: '1px solid var(--lw-border)',
    margin: '24px 0',
    textAlign: 'center' as const,
    overflow: 'hidden',
    transition: 'border-color 0.3s ease',
    boxShadow: 'var(--lw-shadow), var(--lw-glass-inset)',
  }}>
    {/* Ambient glass glows */}
    <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '150px', height: '150px', background: 'var(--lw-glow)', borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0 }} />
    <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '150px', height: '150px', background: 'var(--lw-glow)', borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0 }} />
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {children}
    </div>
  </div>
);

/** Badge component */
const Badge: React.FC<{ children: React.ReactNode; color?: 'orange' | 'green' | 'red' | 'blue' }> = ({ children, color = 'orange' }) => {
  const colors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    orange: { bg: 'var(--lw-badge-bg)', border: 'var(--lw-badge-border)', text: 'var(--lw-badge-text)', dot: '#F04E37' },
    green: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.15)', text: '#10b981', dot: '#10b981' },
    red: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)', text: '#ef4444', dot: '#ef4444' },
    blue: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.15)', text: '#3b82f6', dot: '#3b82f6' },
  };
  const c = colors[color] || colors.orange;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '99px', fontSize: '10px', fontWeight: 700, color: c.text, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: c.dot, animation: 'pulse 2s infinite' }} />
      {children}
    </div>
  );
};

const LiteraWidget: React.FC<LiteraWidgetProps> = ({ tokenId, articleTitle }) => {
  const { address, isConnected } = useAccount();
  const [unlockedContent, setUnlockedContent] = useState<{ description: string; content: string } | null>(null);
  const [sponsorUrl, setSponsorUrl] = useState<string | null>(null);
  const [nftMedia, setNftMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [publisherName, setPublisherName] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [articleCid, setArticleCid] = useState<string | null>(null);
  const { open } = useWeb3Modal();
  const { signMessageAsync } = useSignMessage();

  // --- Quiz & Auth States ---
  const [step, setStep] = useState<'idle' | 'checking_auth' | 'quiz_intro' | 'quiz_active' | 'quiz_evaluating' | 'quiz_result' | 'mint_ready' | 'minting' | 'receipt' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<any | null>(null);

  // --- Inject theme CSS on mount ---
  useEffect(() => { injectThemeCSS(); }, []);

  // --- Contracts Write ---
  const { writeContract: approveWrite, data: approveHash, isPending: isApprovingReq } = useWriteContract();
  const { isLoading: isApprovingTx, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  const { writeContract: mintWrite, data: mintHash, isPending: isMintingReq } = useWriteContract();
  const { isLoading: isMintingTx, isSuccess: isMintSuccess, data: mintReceipt } = useWaitForTransactionReceipt({ hash: mintHash });

  const { data: allowance } = useReadContract({
    address: Erc20Adress,
    abi: erc20ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, contractAddress],
    chainId: activeChainId,
    query: { enabled: !!address, refetchInterval: 3000 }
  });

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

          const fetchedAuthor = res.data?.author || res.data?.properties?.AUTHOR || res.data?.properties?.Author || res.data?.properties?.author;
          if (fetchedAuthor) setAuthorName(fetchedAuthor);

          const contentCid = res.data?.properties?.Content || res.data?.properties?.content;
          if (contentCid) setArticleCid(contentCid);
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

  const handleStartAuthorization = async () => {
    if (!tokenId || !address) return;
    
    setStep('checking_auth');
    try {
      const apiUrl = 'https://literaa.xyz';
      const quizRes = await axios.get(`${apiUrl}/api/v1/quiz/token/${tokenId}`);
      const quizData = quizRes.data?.data || quizRes.data;

      if (!quizData || quizData.status === 'OFF' || !quizData.questions || quizData.questions.length === 0) {
        setStep('mint_ready');
        return;
      }

      const statusRes = await axios.get(`${apiUrl}/api/v1/quiz/token/${tokenId}/status/${address}`);
      const statusData = statusRes.data;

      if (statusData && statusData.hasAttempted && statusData.status === 'PASS') {
        setStep('mint_ready');
        return;
      }

      setQuestions(quizData.questions);
      setStep('quiz_intro');
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        setStep('mint_ready');
        return;
      }
      console.error("Auth fetch failed", error);
      setErrorMessage("Failed to load Authorization Mechanism. Please try again later.");
      setStep('error');
    }
  };

  const handleSelectOption = (optionId: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion) {
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionId }));
    }
  };

  const selectedOptionId = questions[currentQuestionIndex] ? (answers[questions[currentQuestionIndex].id] ?? null) : null;

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setStep('quiz_evaluating');
      try {
        const apiUrl = 'https://literaa.xyz';
        const timestamp = Date.now().toString();
        const action = 'SUBMIT_QUIZ';
        const nonce = Math.random().toString(36).substring(2, 15);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        
        const messagePayload = `Litera
Version: 1.0
Wallet: ${address.toLowerCase()}
Action: ${action}
Nonce: ${nonce}
Chain: 137
IssuedAt: ${new Date().toISOString()}
Expires: ${expiresAt}`;
        
        const signature = await signMessageAsync({ message: messagePayload });

        const res = await axios.post(`${apiUrl}/api/v1/quiz/submit`, {
          tokenId: tokenId,
          answers: answers,
          nonce: nonce
        }, {
          headers: {
            'x-wallet-address': address,
            'x-signature': signature,
            'x-message': encodeURIComponent(messagePayload)
          }
        });
        setQuizResult(res.data);
        setStep('quiz_result');
      } catch (err: any) {
        if (err?.message?.toLowerCase().includes('reject') || err?.message?.toLowerCase().includes('denied')) {
          setStep('quiz_active');
          return;
        }
        setErrorMessage(err?.response?.data?.message || "Failed to evaluate quiz.");
        setStep('error');
      }
    }
  };

  useEffect(() => {
    if (isMintingReq || isMintingTx) setStep('minting');
    if (isMintSuccess) setStep('receipt');
  }, [isMintingReq, isMintingTx, isMintSuccess]);

  const handleBuy = async () => {
    try {
      const needed = price ? BigInt(price) : 0n;
      const currentAllowance = allowance !== undefined ? BigInt(allowance as any) : 0n;
      const currentUserBalance = userBalance !== undefined ? BigInt(userBalance as any) : 0n;

      if (currentUserBalance < needed) {
        alert("Insufficient LITE Balance!");
        return;
      }

      if (currentAllowance < needed) {
        approveWrite({
          address: Erc20Adress,
          abi: erc20ABI,
          functionName: 'approve',
          args: [contractAddress, needed]
        });
      } else {
        mintWrite({
          address: contractAddress,
          abi: contractABI,
          functionName: 'Mint',
          args: [BigInt(tokenId || 0), "0x"]
        });
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Minting failed. See console.");
      setStep('error');
    }
  };

  const getOpenSeaUrl = () => {
    const baseUrl = activeNetworkName === 'MAINNET' ? 'https://opensea.io/assets/matic' : 'https://testnets.opensea.io/assets/amoy';
    return `${baseUrl}/${Erc1155Adress}/${tokenId}`;
  };

  /* ─── Wallet Button (reusable) ─── */
  const renderWalletButton = () => (
    <button
      onClick={() => open()}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        padding: '10px 20px',
        borderRadius: '14px',
        background: 'var(--lw-wallet-bg)',
        color: 'var(--lw-wallet-text)',
        fontSize: '12px', fontWeight: 700,
        border: '1px solid var(--lw-border)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginTop: '8px',
      }}
    >
      {isConnected ? (
        <>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 10px', background: 'rgba(240,78,55,0.12)', borderRadius: '8px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F04E37' }} />
            <span style={{ fontWeight: 800, color: '#F04E37', fontSize: '12px' }}>
              {userBalance !== undefined && userBalance !== null ? `${parseFloat(formatUnits(userBalance as bigint, 18)).toLocaleString('en-US', {maximumFractionDigits: 2})} LITE` : '0 LITE'}
            </span>
          </span>
          <span style={{ fontSize: '11px', opacity: 0.7, fontFamily: 'monospace' }}>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
        </>
      ) : (
        <span>Connect Wallet</span>
      )}
    </button>
  );

  /* ═══════════════════════════════════════════════════════
     STATE: Not Connected
     ═══════════════════════════════════════════════════════ */
  if (!isConnected) {
    return (
      <WidgetShell>
        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--lw-bg-inner)', border: '1px solid var(--lw-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <svg style={{ width: '24px', height: '24px', color: 'var(--lw-text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--lw-text)' }}>Exclusive Collectible</h3>
        <p style={{ fontSize: '13px', color: 'var(--lw-text-secondary)', margin: '0 0 20px 0', maxWidth: '280px', lineHeight: 1.6 }}>Connect your Web3 wallet to collect this article and unlock premium perks.</p>
        {renderWalletButton()}
        <PoweredByLitera />
      </WidgetShell>
    );
  }

  /* ═══════════════════════════════════════════════════════
     STATE: Loading Data
     ═══════════════════════════════════════════════════════ */
  const isDataLoading = isBalanceLoading || isArticleLoading || (hasAccess && isUnlockableLoading);

  if (isConnected && isDataLoading) {
    return (
      <WidgetShell>
        <Loader2Icon size={36} style={{ color: '#F04E37', marginBottom: '16px', animation: 'spin 1s linear infinite' }} />
        <Badge color="orange">Verifying Access</Badge>
        <p style={{ fontSize: '13px', color: 'var(--lw-text-secondary)', margin: '12px 0 0 0', maxWidth: '260px', lineHeight: 1.6 }}>Checking your wallet for Litera Access License...</p>
        {renderWalletButton()}
        <PoweredByLitera />
      </WidgetShell>
    );
  }

  /* ═══════════════════════════════════════════════════════
     STATE: Has Access (unlocked content / no unlockable / verified)
     ═══════════════════════════════════════════════════════ */
  if (hasAccess) {
    const isValidCid = cidUnlockable && typeof cidUnlockable === 'string' && cidUnlockable.length > 10;

    // Has unlockable content AND it's decrypted
    if (hasUnlockableContent && isValidCid && unlockedContent) {
      return (
        <WidgetShell>
          <Badge color="green">Access Granted</Badge>
          <div style={{ width: '100%', background: 'var(--lw-bg-inner)', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--lw-border)', margin: '16px 0', position: 'relative', overflow: 'hidden', textAlign: 'left' as const }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: '#F04E37' }} />
            <p style={{ fontSize: '13px', color: 'var(--lw-text)', lineHeight: 1.7, margin: 0, paddingLeft: '8px' }}>{unlockedContent.description}</p>
          </div>
          <LiteraButton href={unlockedContent.content}>Open Premium Content</LiteraButton>
          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
            <LiteraButton variant="outline" href={getOpenSeaUrl()}>View NFT</LiteraButton>
            {sponsorUrl && sponsorUrl.length > 5 && (
              <LiteraButton variant="secondary" href={sponsorUrl}>Learn More</LiteraButton>
            )}
          </div>
          {renderWalletButton()}
          <PoweredByLitera />
        </WidgetShell>
      );
    }

    // Has unlockable content but NOT decrypted
    if (hasUnlockableContent && !isValidCid) {
      return (
        <WidgetShell>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--lw-badge-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <svg style={{ width: '24px', height: '24px', color: '#F04E37' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--lw-text)' }}>Content Locked</h3>
          <p style={{ fontSize: '13px', color: 'var(--lw-text-secondary)', margin: '0 0 20px 0', maxWidth: '280px', lineHeight: 1.6 }}>You own this NFT but the content is encrypted. Please go to your Dashboard to view it.</p>
          <LiteraButton href={`https://literaa.xyz/nfts/${contractAddress}/${tokenId}`}>Decrypt on Dashboard</LiteraButton>
          {renderWalletButton()}
          <PoweredByLitera />
        </WidgetShell>
      );
    }

    // Owns NFT, no unlockable
    return (
      <WidgetShell>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
          <CheckCircle2Icon size={24} style={{ color: '#10b981' }} />
        </div>
        <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--lw-text)' }}>Collection Verified</h3>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#10b981', margin: '0 0 20px 0' }}>You now own this Digital Asset.</p>
        
        {sponsorUrl && sponsorUrl.length > 5 ? (
          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <LiteraButton href={sponsorUrl}>Learn More</LiteraButton>
            <LiteraButton variant="outline" href={getOpenSeaUrl()}>View NFT</LiteraButton>
          </div>
        ) : (
          <LiteraButton variant="outline" href={getOpenSeaUrl()}>View NFT</LiteraButton>
        )}
        {renderWalletButton()}
        <PoweredByLitera />
      </WidgetShell>
    );
  }

  /* ═══════════════════════════════════════════════════════
     STATE: Article not valid
     ═══════════════════════════════════════════════════════ */
  if (!isArticleValid) {
    return (
      <WidgetShell>
        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <AlertCircleIcon size={24} style={{ color: '#ef4444' }} />
        </div>
        <Badge color="red">NFT Not Initialized</Badge>
        <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '12px 0 6px 0', color: 'var(--lw-text)' }}>Asset Not Found</h3>
        <p style={{ fontSize: '13px', color: 'var(--lw-text-secondary)', margin: '0 0 20px 0', maxWidth: '280px', lineHeight: 1.6 }}>This article was published on WordPress, but the NFT has not been successfully deployed to the blockchain. Please contact the publisher.</p>
        {renderWalletButton()}
        <PoweredByLitera />
      </WidgetShell>
    );
  }

  /* ═══════════════════════════════════════════════════════
     STATE: Sold Out
     ═══════════════════════════════════════════════════════ */
  if (isSoldOut) {
    return (
      <WidgetShell>
        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--lw-bg-inner)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <svg style={{ width: '24px', height: '24px', color: 'var(--lw-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
        </div>
        <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--lw-text)' }}>Sold Out</h3>
        <p style={{ fontSize: '13px', color: 'var(--lw-text-secondary)', margin: '0 0 20px 0', maxWidth: '280px', lineHeight: 1.6 }}>All available NFTs for this campaign have been minted. Thank you for the incredible support!</p>
        {renderWalletButton()}
        <PoweredByLitera />
      </WidgetShell>
    );
  }

  /* ═══════════════════════════════════════════════════════
     STEP-BASED STATES (Quiz / Mint flow)
     ═══════════════════════════════════════════════════════ */
  const alphabet = ['A', 'B', 'C', 'D', 'E', 'F'];

  if (step !== 'idle') {

    /* --- Checking Auth / Evaluating --- */
    if (step === 'checking_auth' || step === 'quiz_evaluating') {
      return (
        <WidgetShell>
          <Loader2Icon size={40} style={{ color: '#F04E37', marginBottom: '20px', animation: 'spin 1s linear infinite' }} />
          <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--lw-text)' }}>
            {step === 'checking_auth' ? 'Verifying Access' : 'Awaiting Wallet Signature'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--lw-text-secondary)', margin: '0', maxWidth: '260px', lineHeight: 1.6 }}>
            {step === 'checking_auth' ? 'Please wait while we check your authorization status.' : 'Please open your wallet and sign the message to verify your answers.'}
          </p>
          <PoweredByLitera />
        </WidgetShell>
      );
    }

    /* --- Quiz Intro --- */
    if (step === 'quiz_intro') {
      return (
        <WidgetShell>
          <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', opacity: 0.03, pointerEvents: 'none', transform: 'scale(2.5)' }}>
            <ShieldCheckIcon size={120} color="#F04E37" />
          </div>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--lw-badge-bg)', border: '1px solid var(--lw-badge-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', zIndex: 1 }}>
            <ShieldCheckIcon size={32} style={{ color: '#F04E37' }} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--lw-text)', zIndex: 1 }}>Knowledge Check</h2>
          <p style={{ fontSize: '13px', color: 'var(--lw-text-secondary)', margin: '0 0 24px 0', maxWidth: '280px', lineHeight: 1.6, zIndex: 1 }}>
            Ready to claim your reward? Pass this quick knowledge check to mint your exclusive NFT.
          </p>
          <div style={{ zIndex: 1 }}>
            <LiteraButton onClick={() => setStep('quiz_active')} fullWidth={false}>
              START QUIZ
            </LiteraButton>
          </div>
          <PoweredByLitera />
        </WidgetShell>
      );
    }

    /* --- Quiz Active --- */
    if (step === 'quiz_active') {
      const progress = ((currentQuestionIndex) / questions.length) * 100;
      return (
        <WidgetShell>
          {/* Header */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--lw-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#F04E37', background: 'var(--lw-badge-bg)', padding: '3px 10px', borderRadius: '99px', border: '1px solid var(--lw-badge-border)' }}>
              {Math.round(progress)}%
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: '4px', background: 'var(--lw-progress-bg)', borderRadius: '99px', marginBottom: '24px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#F04E37', borderRadius: '99px', transition: 'width 0.3s ease' }} />
          </div>

          {/* Question */}
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--lw-text)', lineHeight: 1.5, marginBottom: '24px', textAlign: 'center' as const, wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal', maxWidth: '100%' }}>
            {questions[currentQuestionIndex].text}
          </h3>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginBottom: '24px' }}>
            {questions[currentQuestionIndex].options.map((option: any, idx: number) => {
              const isSelected = selectedOptionId === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(option.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: `1.5px solid ${isSelected ? 'var(--lw-option-selected-border)' : 'var(--lw-option-border)'}`,
                    background: isSelected ? 'var(--lw-option-selected-bg)' : 'var(--lw-option-bg)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left' as const,
                    boxShadow: isSelected ? 'inset 0 0 0 1px rgba(240,78,55,0.2), 0 4px 12px rgba(240,78,55,0.1)' : 'var(--lw-glass-inset)'
                  }}
                >
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontSize: '11px', fontWeight: 800,
                    background: isSelected ? '#F04E37' : 'var(--lw-bg-inner)',
                    color: isSelected ? '#fff' : 'var(--lw-text-muted)',
                    border: isSelected ? 'none' : '1px solid var(--lw-border)',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 2px 8px rgba(240,78,55,0.4)' : 'none',
                    textShadow: isSelected ? '0 1px 2px rgba(0,0,0,0.2)' : 'none'
                  }}>
                    {alphabet[idx]}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: isSelected ? 'var(--lw-text)' : 'var(--lw-text-secondary)', lineHeight: 1.5, wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal', flex: 1 }}>
                    {option.text}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            {currentQuestionIndex > 0 && (
              <LiteraButton variant="secondary" onClick={handlePrevQuestion} fullWidth={false}>
                Prev
              </LiteraButton>
            )}
            <LiteraButton
              onClick={handleNextQuestion}
              disabled={selectedOptionId === null}
            >
              {currentQuestionIndex === questions.length - 1 ? 'Submit & Sign' : 'Next'}
            </LiteraButton>
          </div>
          <PoweredByLitera />
        </WidgetShell>
      );
    }

    /* --- Quiz Result --- */
    if (step === 'quiz_result') {
      const isPassed = quizResult?.passed === true;
      const resultColor = isPassed ? '#10b981' : '#ef4444';
      return (
        <WidgetShell>
          <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', opacity: 0.05, pointerEvents: 'none', transform: 'scale(2.5)' }}>
            {isPassed ? <CheckCircle2Icon size={120} color={resultColor} /> : <AlertCircleIcon size={120} color={resultColor} />}
          </div>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: isPassed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', zIndex: 1 }}>
            {isPassed
              ? <CheckCircle2Icon size={32} style={{ color: resultColor }} />
              : <AlertCircleIcon size={32} style={{ color: resultColor }} />}
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--lw-text)', zIndex: 1 }}>
              {isPassed ? 'Access Granted' : 'Assessment Failed'}
          </h2>

          {/* Score card */}
          <div style={{ width: '100%', background: 'var(--lw-score-card-bg)', border: '1px solid var(--lw-border)', padding: '24px', borderRadius: '20px', marginBottom: '20px', zIndex: 1 }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--lw-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 8px 0' }}>Final Score</p>
            <div style={{ fontSize: '48px', fontWeight: 900, color: resultColor, lineHeight: 1 }}>
              {quizResult?.score || 0}%
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--lw-text-secondary)', margin: '0 auto 24px auto', maxWidth: '280px', lineHeight: 1.6 }}>
            {quizResult.passed 
              ? 'Congratulations! Your signature has been verified and you may now proceed to mint your digital collectible.' 
              : `You need at least ${quizResult.passingScore ?? 60}% to pass. Please review the content and try again.`}
          </p>

          {isPassed ? (
            <LiteraButton onClick={() => setStep('mint_ready')}>Mint Digital Collectible</LiteraButton>
          ) : (
            <LiteraButton variant="secondary" onClick={() => { setStep('quiz_intro'); setAnswers({}); setCurrentQuestionIndex(0); }}>
              Retry Quiz
            </LiteraButton>
          )}
          <PoweredByLitera />
        </WidgetShell>
      );
    }

    /* --- Mint Ready / Minting --- */
    if (step === 'mint_ready' || step === 'minting') {
      const isApproving = isApprovingReq || isApprovingTx;
      const isMintTx = isMintingReq || isMintingTx;
      const isButtonDisabled = isApproving || isMintTx;
      const buttonText = isApproving ? "Approving LITE..." : isMintTx ? "Minting NFT..." : (allowance !== undefined && BigInt(allowance as any) < (price ? BigInt(price) : 0n)) ? "Approve LITE" : "Mint NFT";

      return (
        <WidgetShell>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--lw-badge-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <ShieldCheckIcon size={24} style={{ color: '#F04E37' }} />
          </div>
          <Badge color="green">Eligible for Minting</Badge>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '12px 0 6px 0', color: 'var(--lw-text)' }}>Claim Your Access</h2>
          <p style={{ fontSize: '13px', color: 'var(--lw-text-secondary)', margin: '0 0 20px 0', maxWidth: '280px', lineHeight: 1.6 }}>
            You have passed the authorization check. Mint your NFT now to unlock the premium article permanently.
          </p>

          <div style={{ width: '100%', background: 'var(--lw-bg-inner)', padding: '14px 20px', borderRadius: '14px', border: '1px solid var(--lw-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--lw-text-secondary)' }}>Price</span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--lw-text)' }}>
              {price && price > BigInt(0) ? `${parseFloat(formatUnits(price, 18)).toLocaleString('en-US')} LITE` : 'Free'}
            </span>
          </div>

          <LiteraButton onClick={handleBuy} disabled={isButtonDisabled}>{buttonText}</LiteraButton>
          <PoweredByLitera />
        </WidgetShell>
      );
    }

    /* --- Receipt --- */
    if (step === 'receipt') {
      const baseUrl = activeNetworkName === 'MAINNET' ? 'https://polygonscan.com/tx' : 'https://amoy.polygonscan.com/tx';
      const txUrl = mintReceipt?.transactionHash ? `${baseUrl}/${mintReceipt.transactionHash}` : null;

      return (
        <WidgetShell>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <CheckCircle2Icon size={28} style={{ color: '#10b981' }} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--lw-text)' }}>Publication Receipt</h2>
          <p style={{ fontSize: '13px', color: 'var(--lw-text-secondary)', margin: '0 0 20px 0', maxWidth: '280px', lineHeight: 1.6 }}>
            Congratulations! The NFT has been minted and added to your wallet. You now have permanent access to the article.
          </p>
          {txUrl && (
            <a href={txUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#F04E37', fontWeight: 600, marginBottom: '20px', textDecoration: 'none' }}>
              View on Explorer →
            </a>
          )}
          <LiteraButton onClick={() => window.location.reload()}>Read Article</LiteraButton>
          <PoweredByLitera />
        </WidgetShell>
      );
    }

    /* --- Error --- */
    if (step === 'error') {
      return (
        <WidgetShell>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <AlertCircleIcon size={24} style={{ color: '#ef4444' }} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--lw-text)' }}>An Error Occurred</h2>
          <p style={{ fontSize: '13px', color: 'var(--lw-text-secondary)', margin: '0 0 20px 0', maxWidth: '280px', lineHeight: 1.6 }}>{errorMessage}</p>
          <LiteraButton variant="secondary" onClick={() => setStep('idle')}>Return</LiteraButton>
          <PoweredByLitera />
        </WidgetShell>
      );
    }
  }

  /* ═══════════════════════════════════════════════════════
     STATE: Default (Idle — show Collect NFT)
     ═══════════════════════════════════════════════════════ */
  return (
    <WidgetShell>
      {/* Badge */}
      <Badge color="orange">Digital Collectible</Badge>

      {/* NFT Media */}
      {nftMedia && (
        <div style={{ margin: '16px 0 12px 0' }}>
          {nftMedia.type === 'video' ? (
            <video src={nftMedia.url} style={{ width: '120px', height: '120px', borderRadius: '16px', objectFit: 'cover', border: '1px solid var(--lw-border)' }} autoPlay loop muted playsInline />
          ) : (
            <img src={nftMedia.url} alt="NFT Media" style={{ width: '120px', height: '120px', borderRadius: '16px', objectFit: 'cover', border: '1px solid var(--lw-border)' }} />
          )}
        </div>
      )}

      {/* Title */}
      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--lw-text)', lineHeight: 1.4, maxWidth: '320px' }}>
        {articleTitle || 'Digital Asset'}
      </h3>

      {/* Publisher / Author */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--lw-text-muted)', marginBottom: '20px' }}>
        <span>Publisher</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '2px 8px', borderRadius: '6px', fontSize: '10px' }}>
          <svg style={{ width: '10px', height: '10px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          {publisherName || 'Verified'}
        </span>
        <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--lw-text-muted)' }} />
        <span>Author</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 700, color: '#F04E37', background: 'var(--lw-badge-bg)', padding: '2px 8px', borderRadius: '6px', fontSize: '10px' }}>
          <svg style={{ width: '10px', height: '10px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          {authorName || 'Verified'}
        </span>
      </div>

      {/* Collect Button */}
      <LiteraButton onClick={handleStartAuthorization}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Collect NFT
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ fontWeight: 500, opacity: 0.85 }}>{price && price > BigInt(0) ? `${parseFloat(formatUnits(price, 18)).toLocaleString('en-US')} LITE` : 'Free'}</span>
        </span>
      </LiteraButton>

      {/* Wallet + Branding */}
      {renderWalletButton()}
      <PoweredByLitera />
    </WidgetShell>
  );
};

export default LiteraWidget;
