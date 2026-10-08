import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAccount, useConnect, useDisconnect, useConnectors, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSignMessage } from 'wagmi';
import { usePrivy, useLogout, useLogin, useWallets, useSignMessage as usePrivySignMessage } from '@privy-io/react-auth';
import { openWeb3ModalSafe, mountWeb3Modal, subscribeWeb3ModalOpen, probeWalletListReachable } from '../web3modal-lazy';
import { CheckCircle2Icon, AlertCircleIcon, BookOpenIcon, Loader2Icon, ShieldCheckIcon, CopyIcon, LogOutIcon, CheckIcon } from 'lucide-react';
import { formatUnits } from 'viem';
import axios from 'axios';
import CryptoJS from 'crypto-js';
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
import { LITERA_ORIGIN, isPrivyOriginAllowed } from '../config';

interface LiteraWidgetProps {
  tokenId: number;
  articleTitle?: string;
  generation?: 'v2' | 'legacy';
  contractAddress?: string;
}

// Gateway IPFS Litera sendiri jauh lebih cepat (~0.5s) dibanding ipfs.io (~13s),
// yang sering membuat <img>/fetch metadata gagal atau timeout.
const IPFS_GATEWAY = 'https://ipfs.literaa.xyz:8443/ipfs';

const formatIpfsUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('ipfs://')) return `${IPFS_GATEWAY}/${url.replace('ipfs://', '')}`;
  if (url.startsWith('Qm') || url.startsWith('bafy')) return `${IPFS_GATEWAY}/${url}`;
  if (url.includes('ipfs.io/ipfs/')) return url.replace('https://ipfs.io/ipfs/', `${IPFS_GATEWAY}/`);
  if (url.includes('gateway.pinata.cloud/ipfs/')) return url.replace('https://gateway.pinata.cloud/ipfs/', `${IPFS_GATEWAY}/`);
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

const WIDGET_VERSION = '1.4.66';

/** Consistent "Powered by Litera" footer used in ALL states */
const PoweredByLitera: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '16px', opacity: 0.6 }}>
    <svg viewBox="0 0 200 200" style={{ width: '12px', height: '12px' }}>
      <circle cx="100" cy="100" r="100" fill="#F04E37" />
      <text x="100" y="130" fill="#FFFFFF" fontSize="90" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="bold" textAnchor="middle" letterSpacing="-2">L</text>
    </svg>
    <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--lw-text-muted)', letterSpacing: '0.02em' }}>v{WIDGET_VERSION} • Powered by Litera</span>
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
const Badge: React.FC<{ children: React.ReactNode; color?: 'orange' | 'green' | 'red' | 'blue' | 'yellow' }> = ({ children, color = 'orange' }) => {
  const colors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    orange: { bg: 'var(--lw-badge-bg)', border: 'var(--lw-badge-border)', text: 'var(--lw-badge-text)', dot: '#F04E37' },
    yellow: { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)', text: '#ca8a04', dot: '#eab308' },
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

/** Holographic Specimen NFT Card — used in preview & owned states with ultra-smooth fluid water-droplet blur reveal */
const NftSpecimenCard: React.FC<{
  media?: { url: string; type: 'image' | 'video' } | null;
  title?: string;
  author?: string;
  tokenId?: string | number;
  isOwned?: boolean;
}> = ({ media, title, author, tokenId, isOwned = false }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50, active: false });
  const animFrameRef = useRef<number | null>(null);

  // Smooth fluid lerp (linear interpolation) for organic water-drop physics
  useEffect(() => {
    let currentX = pos.x;
    let currentY = pos.y;

    const loop = () => {
      if (targetPos.active) {
        currentX += (targetPos.x - currentX) * 0.16;
        currentY += (targetPos.y - currentY) * 0.16;
        setPos({ x: currentX, y: currentY });
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };

    if (targetPos.active) {
      animFrameRef.current = requestAnimationFrame(loop);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetPos.active, targetPos.x, targetPos.y]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTargetPos({ x, y, active: true });
  };

  const handleMouseLeave = () => {
    setTargetPos(prev => ({ ...prev, active: false }));
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  return (
    <div style={{
      position: 'relative',
      margin: '6px 0 16px 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      zIndex: 1,
    }}>
      {/* 3D Floating NFT Card with Specimen Glow */}
      <div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'relative',
          width: '180px',
          height: '180px',
          borderRadius: '22px',
          padding: '3px',
          background: isOwned
            ? 'linear-gradient(135deg, rgba(208,121,84,0.55) 0%, rgba(16,185,129,0.4) 50%, rgba(255,255,255,0.2) 100%)'
            : 'linear-gradient(135deg, rgba(208,121,84,0.35) 0%, rgba(148,163,184,0.25) 50%, rgba(255,255,255,0.1) 100%)',
          boxShadow: isOwned
            ? '0 20px 40px -10px rgba(208,121,84,0.35), 0 0 35px 2px rgba(16,185,129,0.18), inset 0 1px 2px rgba(255,255,255,0.4)'
            : '0 16px 32px -10px rgba(208,121,84,0.25), 0 0 24px rgba(208,121,84,0.1), inset 0 1px 2px rgba(255,255,255,0.25)',
          transform: 'perspective(800px) rotateX(4deg) translateY(-2px)',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '19px',
          overflow: 'hidden',
          backgroundColor: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
          {/* Subtle Ambient Shimmer while media is loading */}
          {(!media?.url || !imageLoaded) && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 50% 40%, rgba(208,121,84,0.2) 0%, rgba(30,41,59,0.8) 70%)',
              filter: 'blur(10px)',
              pointerEvents: 'none',
              zIndex: 0,
            }} />
          )}

          {/* Under-layer: Original Clean NFT Media */}
          {media?.url ? (
            media.type === 'video' ? (
              <video
                src={media.url}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: isOwned ? 'none' : 'contrast(1.05) brightness(0.95)',
                  position: 'relative',
                  zIndex: 1,
                }}
                autoPlay loop muted playsInline
              />
            ) : (
              <img
                src={media.url}
                alt={title || "NFT Media"}
                onLoad={() => setImageLoaded(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  position: 'relative',
                  zIndex: 1,
                  opacity: imageLoaded ? 1 : 0.4,
                  transition: 'opacity 0.6s ease-out',
                }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )
          ) : null}

          {/* Top Fluid Frosted Glass Blur Overlay: Organic Water-Droplet Multi-Stop Gradient Mask */}
          {imageLoaded && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                backgroundColor: 'rgba(15, 23, 42, 0.25)',
                pointerEvents: 'none',
                opacity: targetPos.active ? 1 : 0.96,
                transition: 'opacity 0.5s ease',
                maskImage: targetPos.active
                  ? `radial-gradient(circle 68px at ${pos.x.toFixed(1)}% ${pos.y.toFixed(1)}%, transparent 0%, transparent 20%, rgba(0,0,0,0.08) 35%, rgba(0,0,0,0.28) 50%, rgba(0,0,0,0.58) 65%, rgba(0,0,0,0.85) 80%, black 100%)`
                  : 'none',
                WebkitMaskImage: targetPos.active
                  ? `radial-gradient(circle 68px at ${pos.x.toFixed(1)}% ${pos.y.toFixed(1)}%, transparent 0%, transparent 20%, rgba(0,0,0,0.08) 35%, rgba(0,0,0,0.28) 50%, rgba(0,0,0,0.58) 65%, rgba(0,0,0,0.85) 80%, black 100%)`
                  : 'none',
              }}
            />
          )}

          {/* Floating Badge on Top Right — always highest z-index */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 10,
            maxWidth: '130px',
            padding: '4px 8px',
            borderRadius: '99px',
            backgroundColor: isOwned ? 'rgba(15,23,42,0.88)' : 'rgba(15,23,42,0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: isOwned ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              flexShrink: 0,
              backgroundColor: isOwned ? '#10b981' : '#d07954',
              boxShadow: isOwned ? '0 0 8px #10b981' : '0 0 6px #d07954',
            }} />
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              color: isOwned ? '#34d399' : '#fdba74',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {isOwned ? 'MILIK KAMU' : (author || 'Author')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const LiteraWidget: React.FC<LiteraWidgetProps> = ({ tokenId, articleTitle, generation = 'v2', contractAddress: legacyContractAddress }) => {
  // --- Wagmi & Privy Auth Hooks ---
  const { address: wagmiAddress, isConnected: isWagmiConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const allConnectors = useConnectors();
  const { ready: privyReady, authenticated: privyAuthenticated, user: privyUser } = usePrivy();
  const { logout: privyLogout } = useLogout();
  const { wallets } = useWallets();
  const { signMessageAsync: signWagmi } = useSignMessage();
  const { signMessage: signPrivy } = usePrivySignMessage();

  // --- Modal & Connection States ---
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [cloudWalletAddress, setCloudWalletAddress] = useState<string | null>(() => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem('litera_cloud_wallet_addr') : null;
    } catch {
      return null;
    }
  });
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isGaslessMinting, setIsGaslessMinting] = useState(false);
  const [web3ModalLoading, setWeb3ModalLoading] = useState(false);
  const [web3ModalError, setWeb3ModalError] = useState<string | null>(null);
  const [walletListBlocked, setWalletListBlocked] = useState(false);

  // --- Refs ---
  const popupRef = useRef<Window | null>(null);
  const authNonceRef = useRef<string | null>(null);

  const signViaPopup = (message: string): Promise<string> => {
    const requestId = Math.random().toString(36).slice(2);
    const signUrl = `${LITERA_ORIGIN}/widget-auth?${new URLSearchParams({
      article: window.location.href,
      tokenId: String(tokenId ?? ''),
      action: 'sign',
      reqId: requestId,
      signMsg: encodeURIComponent(message),
    }).toString()}`;

    const w = Math.max(380, Math.min(460, window.innerWidth - 40));
    const h = Math.max(560, Math.min(760, window.innerHeight - 60));
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;

    let popup = popupRef.current;
    if (!popup || popup.closed) {
      popup = window.open(
        signUrl,
        'litera-cloud-wallet',
        `width=${w},height=${h},left=${left},top=${top}`,
      );
      popupRef.current = popup;
    } else {
      try {
        popup.location.href = signUrl;
        popup.focus();
      } catch {
        popup = window.open(
          signUrl,
          'litera-cloud-wallet',
          `width=${w},height=${h},left=${left},top=${top}`,
        );
        popupRef.current = popup;
      }
    }

    if (!popup) {
      return Promise.reject(new Error('Popup diblokir browser. Izinkan popup, lalu coba lagi.'));
    }

    try {
      popup.focus();
    } catch (e) {}

    return new Promise((resolve, reject) => {
      let cleanedUp = false;
      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        window.clearTimeout(timer);
        window.clearInterval(pollClosed);
        window.removeEventListener('message', onResult);
      };

      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error('Waktu tanda tangan habis. Coba lagi.'));
      }, 120000);

      const pollClosed = window.setInterval(() => {
        try {
          if (!popup || popup.closed) {
            cleanup();
            reject(new Error('Tanda tangan dibatalkan (jendela ditutup).'));
          }
        } catch (e) {}
      }, 500);

      const onResult = (e: MessageEvent) => {
        if (e.origin !== LITERA_ORIGIN) return;
        const data = e.data;
        if (!data || data.type !== 'LITERA_SIGN_RESULT' || data.requestId !== requestId) return;
        cleanup();
        if (data.signature) resolve(data.signature);
        else reject(new Error(data.error || 'Tanda tangan dibatalkan'));
      };

      window.addEventListener('message', onResult);
    });
  };

  const signIntent = async (message: string): Promise<string> => {
    if (isWagmiConnected) return signWagmi({ message });
    if (privyAuthenticated) {
      try {
        const res = await signPrivy({ message });
        return (res as { signature?: string })?.signature ?? (res as unknown as string);
      } catch (err: any) {
        console.warn('[Litera Widget] In-app Privy sign gagal, beralih ke popup signing:', err);
        return signViaPopup(message);
      }
    }
    if (cloudWalletAddress) return signViaPopup(message);
    throw new Error('Dompet belum tersambung. Hubungkan dompet dulu, lalu coba lagi.');
  };

  // --- Content & Metadata States ---
  const [unlockedContent, setUnlockedContent] = useState<{ description: string; content: string } | null>(null);
  const [localUnlocked, setLocalUnlocked] = useState(false);
  const [sponsorUrl, setSponsorUrl] = useState<string | null>(null);
  const [nftMedia, setNftMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [publisherName, setPublisherName] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [articleCid, setArticleCid] = useState<string | null>(null);

  // --- Quiz & Auth States ---
  const [step, setStep] = useState<'idle' | 'checking_auth' | 'quiz_intro' | 'quiz_active' | 'quiz_evaluating' | 'quiz_result' | 'mint_ready' | 'minting' | 'receipt' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<any | null>(null);

  // --- Derived Auth & Contract Values ---
  const embeddedWallet = (privyUser?.linkedAccounts?.find((a: any) => a.type === 'wallet') as any)?.address;
  const address = wagmiAddress || privyUser?.wallet?.address || embeddedWallet || cloudWalletAddress || undefined;
  const isConnected = isWagmiConnected || privyAuthenticated || !!cloudWalletAddress;
  const nftContractAddress = generation === 'legacy' && legacyContractAddress ? legacyContractAddress : Erc1155Adress;
  const isLegacy = generation === 'legacy';

  // --- Effects ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__LITERA_WIDGET_VERSION__ = WIDGET_VERSION;
    }
  }, []);

  // Inject theme CSS on mount
  useEffect(() => { injectThemeCSS(); }, []);

  // Mirror wagmi connection state ke ref agar watchdog baca nilai terbaru
  // tanpa harus jadi dependency useEffect (mencegah restart interval sia-sia).
  const wagmiConnectedRef = useRef(false);
  useEffect(() => { wagmiConnectedRef.current = isWagmiConnected; }, [isWagmiConnected]);

  // Watchdog reset isConnecting:
  //   - Saat wagmi.isConnected berubah ke true → user berhasil connect → reset.
  //   - Setelah 60 detik tanpa connect → diasumsikan user menutup modal tanpa melanjutkan → reset.
  // Tidak lagi bergantung pada subscribeState Reown yang tidak reliable.
  useEffect(() => {
    if (!isConnecting) return;
    let cancelled = false;
    let ticked = 0;
    const MAX_TICKS = 60;
    const id = setInterval(() => {
      if (cancelled) return;
      ticked++;
      if (wagmiConnectedRef.current) {
        clearInterval(id);
        if (!cancelled) {
          setIsConnecting(false);
          setIsLoginModalOpen(false);
          setLoginError(null);
        }
        return;
      }
      if (ticked >= MAX_TICKS) {
        clearInterval(id);
        if (!cancelled) {
          setIsConnecting(false);
          setIsLoginModalOpen(false);
        }
      }
    }, 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, [isConnecting]);

  // Preload Web3Modal chunk secara silent saat modal login dibuka
  useEffect(() => {
    if (isLoginModalOpen) {
      setWeb3ModalLoading(true);
      setWeb3ModalError(null);
      mountWeb3Modal()
        .then(() => {
          setWeb3ModalError(null);
        })
        .catch((err) => {
          console.warn('[Litera Widget] Web3Modal preload background failed (direct wallet/cloud wallet available):', err);
        })
        .finally(() => setWeb3ModalLoading(false));
      let cancelled = false;
      probeWalletListReachable().then((ok) => { if (!cancelled) setWalletListBlocked(!ok); });
      return () => { cancelled = true; };
    }
  }, [isLoginModalOpen]);

  // Reset state lokal kuis & unlock ketika berpindah artikel (SPA navigation)
  useEffect(() => {
    setLocalUnlocked(false);
    setUnlockedContent(null);
    setStep('idle');
    setQuestions([]);
    setAnswers({});
    setQuizResult(null);
    setErrorMessage('');
  }, [tokenId]);

  // --- Action Handlers ---
  const handleDisconnect = async () => {
    // 1. Putuskan semua connector Wagmi (bukan cuma active connector)
    try {
      await disconnectAsync();
    } catch (e) {}

    if (allConnectors && allConnectors.length > 0) {
      await Promise.all(
        allConnectors.map(async (connector) => {
          try {
            await disconnectAsync({ connector });
          } catch (e) {}
        })
      );
    }

    // 2. Putuskan semua wallet Privy
    if (wallets && wallets.length > 0) {
      await Promise.all(
        wallets.map(async (w) => {
          try {
            await w.disconnect();
          } catch (e) {}
        })
      );
    }

    // 3. Logout Privy session
    try {
      await privyLogout();
    } catch (e) {}

    // 4. Bersihkan localStorage keys yang memicu auto-reconnect
    try {
      if (typeof localStorage !== 'undefined') {
        const keysToRemove = [
          'litera_cloud_wallet_addr',
          'wagmi.store',
          'wagmi.recentConnectorId',
          'wagmi.connected',
          'wagmi.injected.shimDisconnect',
        ];
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      }
    } catch (e) {}

    setCloudWalletAddress(null);
    setUnlockedContent(null);
    setLocalUnlocked(false);
    setIsDisconnectModalOpen(false);
    setIsConnecting(false);
  };

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const { login: privyLoginWithError } = useLogin({
    onError: (err: any) => {
      console.error('[Litera Widget] Privy login gagal:', err);
      setLoginError('Login email/Google tidak tersedia di situs ini. Gunakan “Hubungkan Dompet” untuk melanjutkan tanpa meninggalkan artikel.');
    },
  });

  const handlePrivyLogin = () => {
    setLoginError(null);
    setIsLoginModalOpen(false);
    privyLoginWithError();
  };

  const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    const userAgent = navigator.userAgent || (navigator as any).vendor || (window as any).opera || '';
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i;
    const isNarrow = typeof window.innerWidth === 'number' && window.innerWidth <= 768;
    return mobileRegex.test(userAgent) || isNarrow || ('ontouchstart' in window);
  };

  const handleConnectWallet = async () => {
    setLoginError(null);
    setWeb3ModalError(null);

    const isMobile = isMobileDevice();
    const hasInjectedProvider = typeof window !== 'undefined' && Boolean((window as any).ethereum);
    const injectedConnector = connectors?.find((c) => c.id === 'injected');
    const wcConnector = connectors?.find(
      (c) =>
        c.id === 'walletConnect' ||
        c.type === 'walletConnect' ||
        c.name.toLowerCase().includes('walletconnect')
    );

    // Kasus 1: Desktop dengan Injected Extension (MetaMask, OKX, Rabby, Brave, Bitget)
    // ATAU Mobile Browser yang memang menginjeksi provider (misal: MetaMask / OKX In-App Browser)
    if (hasInjectedProvider && injectedConnector) {
      try {
        setIsLoginModalOpen(false);
        setIsConnecting(true);
        await connectAsync({ connector: injectedConnector });
        return;
      } catch (err: any) {
        console.warn('[Litera Widget] Injected connector cancelled or failed:', err);
        setIsConnecting(false);
        if (err?.name === 'UserRejectedRequestError' || err?.message?.includes('rejected') || err?.message?.includes('denied')) {
          return;
        }
      }
    }

    // Kasus 2: Mobile Browser biasa (Chrome/Safari) -> Panggil connectAsync WalletConnect langsung
    // Pola ini sama persis dengan useSmartConnectModal di dashboard literaa.xyz yang terbukti lancar
    // membuka dialog WalletConnect & deep-linking langsung ke aplikasi MetaMask / Trust / Bitget
    if (isMobile && wcConnector) {
      try {
        setIsLoginModalOpen(false);
        setIsConnecting(true);
        await connectAsync({ connector: wcConnector });
        return;
      } catch (err: any) {
        console.warn('[Litera Widget] Mobile WalletConnect cancelled or failed:', err);
        setIsConnecting(false);
        if (err?.name === 'UserRejectedRequestError' || err?.message?.includes('rejected') || err?.message?.includes('denied')) {
          return;
        }
      }
    }

    // Kasus 3: Fallback ke Web3Modal / Reown Modal jika connectAsync belum selesai
    try {
      setIsLoginModalOpen(false);
      openWeb3ModalSafe();
    } catch (err: any) {
      console.error('[Litera Widget] Web3Modal open failed:', err);
      setWeb3ModalError('Gagal memuat dialog dompet. Silakan gunakan opsi Email atau Google.');
      setIsLoginModalOpen(true);
      setIsConnecting(false);
    }
  };

  const buildWidgetAuthUrl = () => {
    const contract = generation === 'legacy' && legacyContractAddress
      ? legacyContractAddress
      : Erc1155Adress;
    const nonce = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    authNonceRef.current = nonce;
    try {
      sessionStorage.setItem('litera_auth_nonce', nonce);
    } catch (e) {}

    const params = new URLSearchParams({
      article: window.location.href,
      tokenId: String(tokenId ?? ''),
      contract,
      auth: 'email',
      state: nonce,
      ...(generation === 'legacy' ? { gen: 'legacy' } : {}),
    });
    return `${LITERA_ORIGIN}/widget-auth?${params.toString()}`;
  };

  const openCloudWalletPopup = () => {
    setLoginError(null);
    setIsLoginModalOpen(false);
    if (isMobileDevice()) {
      try {
        sessionStorage.setItem('litera_pending_article', window.location.href);
        sessionStorage.setItem('litera_pending_tokenid', String(tokenId ?? ''));
      } catch (e) {}
      window.location.href = buildWidgetAuthUrl();
      return;
    }
    setIsConnecting(true);
    const authUrl = buildWidgetAuthUrl();
    const w = Math.max(380, Math.min(460, window.innerWidth - 40));
    const h = Math.max(560, Math.min(760, window.innerHeight - 60));
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    popupRef.current = window.open(
      authUrl,
      'litera-cloud-wallet',
      `width=${w},height=${h},left=${left},top=${top}`
    );

    const pollLoginClosed = window.setInterval(() => {
      try {
        if (!popupRef.current || popupRef.current.closed) {
          window.clearInterval(pollLoginClosed);
          setIsConnecting(false);
        }
      } catch (e) {
        window.clearInterval(pollLoginClosed);
        setIsConnecting(false);
      }
    }, 600);
  };

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== LITERA_ORIGIN) return;
      const payload = e.data;
      if (!payload || typeof payload !== 'object') return;
      if (payload.type === 'LITERA_CLOUD_LOGIN_SUCCESS') {
        const expectedNonce = authNonceRef.current || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('litera_auth_nonce') : null);
        if (expectedNonce && payload.state && payload.state !== expectedNonce) {
          console.warn('[Litera Widget] Nonce state mismatch. Aborting handshake.');
          setIsConnecting(false);
          return;
        }
        setIsConnecting(false);
        setIsLoginModalOpen(false);
        if (payload.address) {
          setCloudWalletAddress(payload.address);
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('litera_cloud_wallet_addr', payload.address);
            }
          } catch (err) {}
        }
        if (payload.alreadyOwned || payload.minted) {
          setLocalUnlocked(true);
        }
        try {
          sessionStorage.removeItem('litera_auth_nonce');
        } catch (err) {}
      } else if (payload.type === 'LITERA_CLOUD_LOGIN_CLOSED') {
        setIsConnecting(false);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [tokenId]);

  // Mobile OAuth-style return
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const addr = url.searchParams.get('lite_addr');
    const returnedState = url.searchParams.get('lite_state');
    const expectedNonce = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('litera_auth_nonce') : null;

    if (addr && /^0x[a-fA-F0-9]{40}$/.test(addr)) {
      if (expectedNonce && returnedState && returnedState !== expectedNonce) {
        console.warn('[Litera Widget] Mobile OAuth state mismatch. Ignoring return.');
      } else {
        setCloudWalletAddress(addr);
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('litera_cloud_wallet_addr', addr);
          }
        } catch (err) {}
        const owned = url.searchParams.get('lite_owned') === '1';
        if (owned) {
          setLocalUnlocked(true);
        }
      }
      url.searchParams.delete('lite_addr');
      url.searchParams.delete('lite_owned');
      url.searchParams.delete('lite_state');
      window.history.replaceState({}, document.title, url.toString());
    }
    try {
      sessionStorage.removeItem('litera_pending_article');
      sessionStorage.removeItem('litera_pending_tokenid');
      sessionStorage.removeItem('litera_auth_nonce');
    } catch (e) {}
  }, []);

  // Watchdog popup close
  useEffect(() => {
    if (!isConnecting || !popupRef.current) return;
    const timer = setInterval(() => {
      if (popupRef.current?.closed) {
        popupRef.current = null;
        setIsConnecting(false);
        setIsLoginModalOpen(false);
        clearInterval(timer);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [isConnecting]);

  // --- Contracts Write ---
  const { writeContract: approveWrite, data: approveHash, isPending: isApprovingReq } = useWriteContract();
  const { isLoading: isApprovingTx, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  const { writeContract: mintWrite, data: mintHash, isPending: isMintingReq, error: mintReqError } = useWriteContract();
  const { isLoading: isMintingTx, isSuccess: isMintSuccess, data: mintReceipt, isError: isMintTxError, error: mintTxError } = useWaitForTransactionReceipt({ hash: mintHash });

  const { writeContract: unlockWrite, data: unlockHash, isPending: isUnlockingReq } = useWriteContract();
  const { isLoading: isUnlockingTx, isSuccess: isUnlockSuccess } = useWaitForTransactionReceipt({ hash: unlockHash });

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
    address: nftContractAddress as `0x${string}`,
    abi: erc1155ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`, BigInt(tokenId)],
    chainId: activeChainId,
    query: { enabled: !!address && tokenId > 0 }
  });

  const { data: hasMintedData } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'hasMinted',
    args: [address as `0x${string}`, BigInt(tokenId)],
    chainId: activeChainId,
    query: { enabled: !!address && tokenId > 0 && !isLegacy }
  });

  const { data: hasAccessData } = useReadContract({
    address: UnlockableAddress,
    abi: unlockableABI,
    functionName: 'hasAccess',
    args: address && tokenId > 0 ? [address as `0x${string}`, BigInt(tokenId)] : undefined,
    chainId: activeChainId,
    query: { enabled: !!address && tokenId > 0 && !isLegacy }
  });
  const hasAccessContract = Boolean(hasAccessData);

  const alreadyMinted = Boolean(hasMintedData);
  const ownsNFT = (balanceData ? (BigInt(balanceData as any) > 0n) : false) || alreadyMinted || hasAccessContract;

  // Skip articleInfo query for legacy (Writer legacy doesn't have this function)
  const { data: articleInfo, isLoading: isArticleLoading } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'articleInfo',
    args: [BigInt(tokenId)],
    chainId: activeChainId,
    query: { enabled: !!tokenId && !isLegacy }
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
  
  // For legacy, we don't have articleInfo, so set defaults
  const creatorAddress = !isLegacy && articleArray ? articleArray[4] : "0x0";
  const publisherAddress = !isLegacy && articleArray ? articleArray[1] : "0x0";
  const price = !isLegacy && articleArray ? articleArray[5] : BigInt(0);
  const maxMinted = !isLegacy && articleArray ? Number(articleArray[6]) : 0;
  const totalMinted = !isLegacy && articleArray ? Number(articleArray[7]) : 0;
  const isSoldOut = maxMinted > 0 && totalMinted >= maxMinted;

  const isCreator = address && creatorAddress && address.toLowerCase() === creatorAddress.toLowerCase();
  const isPublisher = address && publisherAddress && address.toLowerCase() === publisherAddress.toLowerCase();
  const hasAccess = ownsNFT || isCreator || isPublisher;
  const isArticleValid = !isLegacy && articleArray ? Number(articleArray[0]) > 0 : true;

  const { data: v2CidUnlockable, isLoading: isV2UnlockableLoading } = useReadContract({
    address: UnlockableAddress,
    abi: unlockableABI,
    functionName: 'getUnlockedContent',
    args: [BigInt(tokenId)],
    account: address as `0x${string}`,
    chainId: activeChainId,
    query: { enabled: !!address && hasAccess && !isLegacy }
  });

  const { data: v2IsContentUnlockableData } = useReadContract({
    address: UnlockableAddress,
    abi: unlockableABI,
    functionName: 'isContentUnlockable',
    args: [BigInt(tokenId)],
    chainId: activeChainId,
    query: { enabled: !!tokenId && !isLegacy }
  });

  // State for legacy unlockable
  const [legacyHasUnlockable, setLegacyHasUnlockable] = useState(false);
  const [isLegacyUnlockableLoading, setIsLegacyUnlockableLoading] = useState(false);

  useEffect(() => {
    // Only check IF it has content without revealing CID
    const checkLegacyUnlockable = async () => {
      if (isLegacy && tokenId) {
        setIsLegacyUnlockableLoading(true);
        try {
          const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const defaultBackendUrl = isLocalhost ? 'http://localhost:3001' : 'https://literaa.xyz';
          const backendUrl = process.env.REACT_APP_BACKEND_URL || defaultBackendUrl;
          
          // Using the resolve endpoint logic to quickly see if it's a legacy item
          // For legacy generation 1, we assume all registered Legacy URLs have unlockable features.
          // Or we can just set it to true if ownsNFT.
          if (ownsNFT) {
            setLegacyHasUnlockable(true);
          }
        } catch (error) {
          console.error("Failed to check legacy unlockable status:", error);
        } finally {
          setIsLegacyUnlockableLoading(false);
        }
      }
    };
    checkLegacyUnlockable();
  }, [isLegacy, tokenId, ownsNFT]);

  const isUnlockableLoading = isLegacy ? isLegacyUnlockableLoading : isV2UnlockableLoading;

  // Watchdog agar verifikasi akses tidak stuck loading selamanya jika RPC lambat
  const [dataLoadingTimedOut, setDataLoadingTimedOut] = useState(false);
  useEffect(() => {
    if (!isConnected) {
      setDataLoadingTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      setDataLoadingTimedOut(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [isConnected]);
  
  // For legacy, show premium access if they own the NFT
  const hasUnlockableContent = isLegacy ? legacyHasUnlockable : Boolean(v2IsContentUnlockableData);

  const { data: tokenURI } = useReadContract({
    address: nftContractAddress as `0x${string}`,
    abi: erc1155ABI,
    functionName: 'uri',
    args: [BigInt(tokenId)],
    chainId: activeChainId,
    query: { enabled: !!tokenId }
  });

  const [encryptedData, setEncryptedData] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Variables fallback
  const cidUnlockable = !isLegacy ? v2CidUnlockable : undefined;

  useEffect(() => {
    if (!isLegacy && cidUnlockable && typeof cidUnlockable === 'string' && cidUnlockable.length > 0) {
      const fetchHiddenContent = async () => {
        try {
          // Bypass IPFS fetch for the migrated mock string
          if (cidUnlockable === 'migrated_encrypted_content') {
            setUnlockedContent({ 
              description: "Konten Rahasia Default (Sistem Migrasi)", 
              content: "Selamat! Anda berhasil membuka secret content dari NFT ini. Karena Anda memiliki NFT-nya di dalam wallet Anda, fitur eksklusif ini sekarang dapat diakses sepenuhnya." 
            });
            setLocalUnlocked(true);
            return;
          }
          const res = await axios.get(`${IPFS_GATEWAY}/${cidUnlockable}`, { timeout: 8000 });
          
          if (typeof res.data === 'string') {
            // It's an encrypted ciphertext!
            setEncryptedData(res.data);
            setLocalUnlocked(false);
          } else if (res.data && res.data.description) {
            // Backward compatibility for unencrypted JSON
            setUnlockedContent({ description: res.data.description, content: res.data.content });
            setLocalUnlocked(false);
          }
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
          const res = await axios.get(`${IPFS_GATEWAY}/${cid}`, { timeout: 8000 });
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

          const fetchedPublisher = res.data?.publisher || res.data?.properties?.PUBLISHER || res.data?.properties?.Publisher || res.data?.properties?.publisher || res.data?.properties?.COLLECTION || res.data?.properties?.Collection || res.data?.properties?.collection;
          if (fetchedPublisher) setPublisherName(fetchedPublisher);

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
        .catch(() => { });
    }
  }, [publisherAddress]);

  const handleStartAuthorization = async () => {
    if (!tokenId || !address) return;

    setStep('checking_auth');
    try {
      const apiUrl = process.env.REACT_APP_BACKEND_URL || LITERA_ORIGIN;
      const quizRes = await axios.get(`${apiUrl}/api/v1/quiz/token/${tokenId}`);
      const quizData = quizRes.data?.data || quizRes.data;

      if (!quizData || quizData.status === 'OFF' || !quizData.questions || quizData.questions.length === 0) {
        setStep('mint_ready');
        return;
      }

      const statusRes = await axios.get(`${apiUrl}/api/v1/quiz/token/${tokenId}/status/${address}`);
      const statusData = statusRes.data?.data || statusRes.data;

      if (statusData && statusData.hasAttempted && statusData.status === 'PASS') {
        setStep('mint_ready');
        return;
      }

      setQuestions(quizData.questions);
      setStep('quiz_intro');
    } catch (error: any) {
      if (
        (error.response && error.response.status === 404) ||
        error.response?.data?.code === 'QUIZ_001'
      ) {
        setStep('mint_ready');
        return;
      }
      console.error("Auth fetch failed", error);
      setErrorMessage("Failed to load Authorization Mechanism. Please try again later.");
      setStep('error');
    }
  };

  // Auto-transisi dari idle ke mint_ready/quiz saat user sudah terhubung (mis. refresh halaman)
  useEffect(() => {
    if (address && step === 'idle' && !ownsNFT && !isLegacy && tokenId > 0) {
      handleStartAuthorization();
    }
  }, [address, step, ownsNFT, isLegacy, tokenId]);

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

        const userWallet = (address || '').toLowerCase();
        const messagePayload = `Litera
Version: 1.0
Wallet: ${userWallet}
Action: ${action}
Nonce: ${nonce}
Chain: 137
IssuedAt: ${new Date().toISOString()}
Expires: ${expiresAt}`;

        const signature = await signIntent(messagePayload);

        const res = await axios.post(`${apiUrl}/api/v1/quiz/submit`, {
          tokenId: tokenId,
          answers: answers,
          nonce: nonce
        }, {
          headers: {
            'x-wallet-address': address,
            'x-signature': signature,
            'x-message': encodeURIComponent(messagePayload),
            'X-Litera-Ui-Version': WIDGET_VERSION,
          }
        });
        const responseData = res.data?.data || res.data;
        setQuizResult(responseData);
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
    if (isMintSuccess) {
      // Reload page immediately to show the NFT ownership state
      window.location.reload();
    }
    if (mintReqError || isMintTxError) {
      const err = mintReqError || mintTxError;
      const rawMsg = err?.message || 'Mint transaction failed';
      let friendlyMsg = 'Gagal mencetak NFT. Pastikan dompet Anda memiliki sedikit POL (Polygon) untuk biaya gas jaringan.';
      if (rawMsg.toLowerCase().includes('already minted')) {
        friendlyMsg = 'Alamat dompet ini sudah pernah mencetak/mengklaim NFT artikel ini.';
      } else if (rawMsg.toLowerCase().includes('reject') || rawMsg.toLowerCase().includes('denied')) {
        friendlyMsg = 'Transaksi dibatalkan di dompet.';
      } else if (rawMsg.toLowerCase().includes('insufficient funds')) {
        friendlyMsg = 'Saldo dompet tidak mencukupi untuk biaya gas jaringan Polygon.';
      }
      setErrorMessage(friendlyMsg);
      setStep('error');
    }
  }, [isMintingReq, isMintingTx, isMintSuccess, mintReqError, isMintTxError, mintTxError]);

  const mintGasless = async () => {
    if (!address) throw new Error('Wallet belum terhubung');
    const expiresAt = Math.floor(Date.now() / 1000) + 300;
    const message = [
      'Litera gasless mint',
      `TokenID: ${tokenId}`,
      `Address: ${address}`,
      `Expires: ${expiresAt}`,
    ].join('\n');
    const signature = await signIntent(message);
    await axios.post(`${LITERA_ORIGIN}/api/v1/relayer/widget-mint`, {
      tokenId: Number(tokenId),
      address,
      expiresAt,
      signature,
    });
    window.location.reload();
  };

  const handleBuy = async () => {
    if (!isLegacy && (!price || BigInt(price) === 0n)) {
      try {
        setIsGaslessMinting(true);
        setStep('minting');
        await mintGasless();
        return;
      } catch (error: any) {
        console.error('[Litera Widget] mintGasless error:', error);
        setIsGaslessMinting(false);
        const msg = (error?.message || '').toLowerCase();
        const isCancel = msg.includes('batal') || msg.includes('cancel') || msg.includes('denied') || msg.includes('reject');
        if (isCancel) {
          setStep('mint_ready');
          return;
        }
        const status = error?.response?.status;
        if (status !== 503) {
          setErrorMessage(error?.response?.data?.message || error?.message || 'Mint gratis gagal. Silakan coba lagi.');
          setStep('error');
          return;
        }
        setStep('mint_ready');
      }
    }
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

  const handleDecrypt = async () => {
    try {
      setIsDecrypting(true);
      
      const messagePayload = `Reveal secret content for Token #${tokenId}`;
      const signature = await signIntent(messagePayload);

      if (isLegacy) {
        // --- LEGACY FLOW (Generation 1) ---
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const defaultBackendUrl = isLocalhost ? 'http://localhost:3001' : 'https://literaa.xyz';
        const backendUrl = process.env.REACT_APP_BACKEND_URL || defaultBackendUrl;

        const res = await axios.post(`${backendUrl}/api/v1/unlocked/legacy`, {
          address: address,
          tokenId: tokenId,
          signature: signature,
          message: messagePayload
        });

        const legacyCids = res.data?.data || res.data;
        if (!legacyCids || legacyCids.length === 0) {
          throw new Error("Tidak ada konten rahasia untuk artikel ini.");
        }

        const cid = legacyCids[0];
        if (cid === 'migrated_encrypted_content') {
          setUnlockedContent({ 
            description: "Konten Rahasia Default (Sistem Migrasi)", 
            content: "Selamat! Anda berhasil membuka secret content dari NFT ini." 
          });
          setLocalUnlocked(true);
          return;
        }

        const ipfsRes = await axios.get(`${IPFS_GATEWAY}/${cid}`, { timeout: 8000 });
        let parsedData = ipfsRes.data;
        if (typeof parsedData === 'string') {
          try {
            parsedData = JSON.parse(parsedData);
          } catch (e) {
            parsedData = { description: 'Legacy Content', content: parsedData };
          }
        }
        
        setUnlockedContent({ description: parsedData.description || 'Konten Rahasia', content: parsedData.content || JSON.stringify(parsedData) });
        setLocalUnlocked(true);
      } else {
        // --- V2 FLOW ---
        if (!encryptedData) {
          throw new Error("Encrypted data not found on IPFS");
        }

        // 2. Fetch AES key from backend
        const res = await axios.post(`https://literaa.xyz/api/v1/nfts/${tokenId}/get-unlockable-key`, {
          signature: signature
        }, {
          headers: {
            'X-Litera-Ui-Version': WIDGET_VERSION,
          }
        });
        const aesKey = res.data?.aesKey || res.data?.data?.aesKey;

        if (!aesKey) {
          throw new Error("Encryption key not received from backend");
        }

        // 3. Decrypt ciphertext
        const bytes = CryptoJS.AES.decrypt(encryptedData, aesKey);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        
        if (!decryptedString) {
          throw new Error("Decryption failed. Invalid key or data.");
        }

        const parsedData = JSON.parse(decryptedString);

        // 4. Update UI
        setUnlockedContent({ description: parsedData.description, content: parsedData.content });
        setLocalUnlocked(true);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.response?.data?.message || e.message || "Unlocking failed. See console.");
      setStep('error');
    } finally {
      setIsDecrypting(false);
    }
  };

  useEffect(() => {
    if (isUnlockSuccess) {
      window.location.reload();
    }
  }, [isUnlockSuccess]);

  const getOpenSeaUrl = () => {
    const baseUrl = activeNetworkName === 'MAINNET' ? 'https://opensea.io/assets/matic' : 'https://testnets.opensea.io/assets/amoy';
    return `${baseUrl}/${Erc1155Adress}/${tokenId}`;
  };

  /* ─── Wallet Button (reusable) ─── */
  const renderWalletButton = () => (
    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <button
        disabled={isConnecting && !isConnected}
        onClick={() => {
          if (isConnecting) return;
          if (isConnected) {
            setIsDisconnectModalOpen(true);
          } else {
            setIsLoginModalOpen(true);
          }
        }}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          width: 'auto',
          maxWidth: '320px',
          padding: isConnected ? '10px 18px' : '13px 32px',
          borderRadius: '16px',
          background: isConnected ? 'var(--lw-wallet-bg)' : 'linear-gradient(135deg, #d07954 0%, #b86644 100%)',
          color: isConnected ? 'var(--lw-wallet-text)' : '#ffffff',
          fontSize: isConnected ? '13px' : '14px', fontWeight: 800,
          letterSpacing: '0.02em',
          border: isConnected ? '1px solid var(--lw-border)' : 'none',
          cursor: isConnecting && !isConnected ? 'not-allowed' : 'pointer',
          opacity: isConnecting && !isConnected ? 0.65 : 1,
          transition: 'all 0.2s ease',
          boxShadow: isConnected ? 'none' : '0 8px 20px -4px rgba(208,121,84,0.45), inset 0 1px 2px rgba(255,255,255,0.3)',
          marginTop: '8px',
        }}
      >
        {isConnected ? (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 10px', background: 'rgba(240,78,55,0.12)', borderRadius: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F04E37' }} />
              <span style={{ fontWeight: 800, color: '#F04E37', fontSize: '12px' }}>
                {userBalance !== undefined && userBalance !== null ? `${parseFloat(formatUnits(userBalance as bigint, 18)).toLocaleString('en-US', { maximumFractionDigits: 2 })} LITE` : '0 LITE'}
              </span>
            </span>
            <span style={{ fontSize: '11px', opacity: 0.7, fontFamily: 'monospace' }}>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
          </>
        ) : (
          <span>{isConnecting ? 'Menghubungkan…' : (price && price > BigInt(0) ? `Miliki Edisi Digital · ${parseFloat(formatUnits(price, 18)).toLocaleString('en-US')} LITE` : 'Miliki Edisi Digital')}</span>
        )}
      </button>

      {/* Dashboard link — shown in every state when connected */}
      {isConnected && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--lw-text-muted)' }}>Koleksi lengkap di</span>
          <a href="https://literaa.xyz/mynft" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', fontWeight: 700, color: '#d07954', textDecoration: 'none' }}>Dashboard →</a>
        </div>
      )}

      {/* Disconnect & Account Modal (via Portal agar tidak terpotong overflow container widget) */}
      {isConnected && isDisconnectModalOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2147483647,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setIsDisconnectModalOpen(false)}
        >
          <div
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: '360px',
              borderRadius: '24px',
              backgroundColor: '#ffffff',
              boxShadow: '0 30px 100px rgba(15,23,42,0.3)',
              padding: '24px',
              color: '#1f2937',
              textAlign: 'left',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#111827' }}>
                Akun Kamu
              </h3>
              <button
                onClick={() => setIsDisconnectModalOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280'
                }}
              >
                ✕
              </button>
            </div>

            {/* Identitas Email / Google bila tersedia */}
            {(privyUser?.email?.address || privyUser?.google) && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '14px',
                padding: '12px 14px',
                marginBottom: '10px',
                border: '1px solid #f3f4f6'
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  backgroundColor: '#fff', border: '1px solid #e5e7eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 800, color: '#d07954'
                }}>
                  {((privyUser?.google?.name || privyUser?.email?.address || 'U').trim().charAt(0)).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {privyUser?.google?.name || privyUser?.email?.address}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>
                    {privyUser?.google ? 'Login via Google' : 'Login via Email'}
                  </div>
                </div>
              </div>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f9fafb',
              borderRadius: '14px',
              padding: '12px 14px',
              marginBottom: '10px',
              border: '1px solid #f3f4f6'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Alamat Dompet</div>
                <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: '#111827' }}>
                  {address?.slice(0, 10)}...{address?.slice(-8)}
                </div>
              </div>
              <button
                onClick={handleCopyAddress}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: isCopied ? '#16a34a' : '#374151',
                  cursor: 'pointer'
                }}
              >
                {isCopied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                {isCopied ? 'Tersalin' : 'Salin'}
              </button>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: '#fff8f4',
              borderRadius: '14px',
              marginBottom: '14px',
              border: '1px solid rgba(208,121,84,0.2)'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Saldo LITE</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#d07954' }}>
                {userBalance !== undefined && userBalance !== null ? `${parseFloat(formatUnits(userBalance as bigint, 18)).toLocaleString('en-US', { maximumFractionDigits: 2 })} LITE` : '0 LITE'}
              </span>
            </div>

            <a
              href="https://literaa.xyz/mynft"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                padding: '12px',
                borderRadius: '14px',
                backgroundColor: '#ffffff',
                border: '1.5px solid #e5e7eb',
                fontSize: '13px',
                fontWeight: 700,
                color: '#374151',
                textDecoration: 'none',
                marginBottom: '10px',
                boxSizing: 'border-box'
              }}
            >
              Lihat Koleksi di Dashboard <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17l9.2-9.2M17 17V8H8"/></svg>
            </a>

            <button
              onClick={handleDisconnect}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                borderRadius: '14px',
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={e => (e.currentTarget.style.backgroundColor = '#fee2e2')}
              onMouseOut={e => (e.currentTarget.style.backgroundColor = '#fef2f2')}
            >
              <LogOutIcon size={15} /> Keluar dari Akun
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Login Modal Custom (Mirip Dashboard) — via portal ke document.body agar tidak terkurung widget */}
      {isLoginModalOpen && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2147483647,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
          }}
          onClick={() => { setIsLoginModalOpen(false); setIsConnecting(false); }}
        >
          <div
            style={{
              position: 'relative', width: '90%', maxWidth: '390px',
              borderRadius: '24px', backgroundColor: '#ffffff',
              boxShadow: '0 30px 100px rgba(15,23,42,0.3)',
              padding: '24px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              style={{
                position: 'absolute', top: '16px', right: '16px',
                width: '32px', height: '32px', borderRadius: '50%',
                backgroundColor: '#f3f4f6', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onClick={() => { setIsLoginModalOpen(false); setIsConnecting(false); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>

            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', color: '#111' }}>Masuk ke Litera</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px 0' }}>Pilih cara untuk mengakses artikel.</p>

            {isPrivyOriginAllowed() ? (
              <button
                onClick={() => { handlePrivyLogin(); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '16px', borderRadius: '16px',
                  backgroundColor: '#fff8f4', border: '1px solid rgba(208,121,84,0.3)',
                  cursor: 'pointer', marginBottom: '12px', textAlign: 'left'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#111' }}>Email atau Google</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Dompet Polygon dibuat otomatis.</div>
                </div>
              </button>
            ) : (
              <button
                onClick={() => { openCloudWalletPopup(); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '16px', borderRadius: '16px',
                  backgroundColor: '#fff8f4', border: '1px solid rgba(208,121,84,0.3)',
                  cursor: 'pointer', marginBottom: '12px', textAlign: 'left'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#111' }}>Email atau Google</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Login aman di literaa.xyz, kembali otomatis ke artikel.</div>
                </div>
              </button>
            )}

            <button
              onClick={() => { handleConnectWallet(); }}
              disabled={web3ModalLoading}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
                padding: '16px', borderRadius: '16px',
                backgroundColor: '#ffffff', border: '1px solid #e5e7eb',
                cursor: web3ModalLoading ? 'not-allowed' : 'pointer', textAlign: 'left',
                opacity: web3ModalLoading ? 0.7 : 1,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#111' }}>
                  {web3ModalLoading ? 'Memuat dompet…' : 'Hubungkan Dompet'}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                  {web3ModalLoading ? 'Menyiapkan dialog, mohon tunggu sebentar.' : 'MetaMask, Coinbase, dll.'}
                </div>
              </div>
              {web3ModalLoading && (
                <Loader2Icon size={18} style={{ animation: 'spin 1s linear infinite', color: '#d07954' }} />
              )}
            </button>
            {web3ModalError && (
              <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', fontSize: '12px', color: '#b91c1c', textAlign: 'left' }}>
                {web3ModalError}
              </div>
            )}
            {walletListBlocked && !web3ModalError && (
              <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '12px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', fontSize: '12px', color: '#92400e', textAlign: 'left' }}>
                Daftar semua dompet mungkin tidak tampil — situs ini membatasi akses daftar dompet. Dompet ekstensi browser tetap berfungsi, atau masuk via Email/Google.
              </div>
            )}
            <div style={{ marginTop: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '16px', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>v{WIDGET_VERSION} • Powered by Litera</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );

  /* ═══════════════════════════════════════════════════════
     STATE: Not Connected
     ═══════════════════════════════════════════════════════ */
  if (!isConnected) {
    return (
      <WidgetShell>
        <NftSpecimenCard media={nftMedia} title={articleTitle} author={authorName || undefined} tokenId={tokenId} isOwned={false} />
        <Badge color="orange">{publisherName || 'Official Publisher'}</Badge>
        <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '10px 0 4px 0', color: 'var(--lw-text)', maxWidth: '340px', lineHeight: 1.4 }}>
          {articleTitle || 'Digital Collectible'}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--lw-text-secondary)', margin: '0 0 16px 0', maxWidth: '300px', lineHeight: 1.6 }}>Diterbitkan resmi sebagai aset digital permanen artikel ini.</p>
        {renderWalletButton()}
        <PoweredByLitera />
      </WidgetShell>
    );
  }

  /* ═══════════════════════════════════════════════════════
     STATE: Loading Data
     ═══════════════════════════════════════════════════════ */
  const isDataLoading = (isBalanceLoading || isArticleLoading || (hasAccess && isUnlockableLoading)) && !dataLoadingTimedOut;

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
    const isValidCid = isLegacy ? true : (cidUnlockable && typeof cidUnlockable === 'string' && cidUnlockable.length > 10);

    // Has unlockable content AND it's decrypted AND localUnlocked is true
    if (hasUnlockableContent && isValidCid && unlockedContent && localUnlocked) {
      return (
        <WidgetShell>
          <NftSpecimenCard media={nftMedia} title={articleTitle} author={authorName || undefined} tokenId={tokenId} isOwned={true} />
          <Badge color="green">Akses Terbuka</Badge>
          <div style={{ width: '100%', background: 'var(--lw-bg-inner)', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--lw-border)', margin: '16px 0', position: 'relative', overflow: 'hidden', textAlign: 'left' as const }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: '#F04E37' }} />
            <p style={{ fontSize: '13px', color: 'var(--lw-text)', lineHeight: 1.7, margin: 0, paddingLeft: '8px' }}>{unlockedContent.description}</p>
          </div>
          <LiteraButton href={unlockedContent.content}>Buka Konten Eksklusif</LiteraButton>
          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
            <LiteraButton variant="outline" href="https://literaa.xyz/mynft">Buka Dashboard</LiteraButton>
            {sponsorUrl && sponsorUrl.length > 5 && (
              <LiteraButton variant="secondary" href={sponsorUrl}>Pelajari Lebih Lanjut</LiteraButton>
            )}
          </div>
          {renderWalletButton()}
          <PoweredByLitera />
        </WidgetShell>
      );
    }

    // Has unlockable content AND it's decrypted BUT localUnlocked is false (Local instant unlock)
    if (hasUnlockableContent && isValidCid && unlockedContent && !localUnlocked) {
      return (
        <WidgetShell>
          <NftSpecimenCard media={nftMedia} title={articleTitle} author={authorName || undefined} tokenId={tokenId} isOwned={true} />
          <Badge color="green">{publisherName || 'Official Publisher'}</Badge>
          <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '10px 0 6px 0', color: 'var(--lw-text)', maxWidth: '340px', lineHeight: 1.4 }}>
            {articleTitle || 'Digital Collectible'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--lw-text-secondary)', margin: '0 0 20px 0', maxWidth: '280px', lineHeight: 1.6 }}>Kamu memiliki NFT ini. Klik tombol di bawah untuk membuka materi eksklusif.</p>
          <LiteraButton onClick={() => setLocalUnlocked(true)} fullWidth={false}>
            Buka Konten Eksklusif
          </LiteraButton>
          {renderWalletButton()}
          <PoweredByLitera />
        </WidgetShell>
      );
    }

    // Has unlockable content but NOT decrypted yet
    if (hasUnlockableContent && !unlockedContent) {
      const isUnlocking = isUnlockingReq || isUnlockingTx || isDecrypting;
      return (
        <WidgetShell>
          <NftSpecimenCard media={nftMedia} title={articleTitle} author={authorName || undefined} tokenId={tokenId} isOwned={true} />
          <Badge color="green">{publisherName || 'Official Publisher'}</Badge>
          <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '10px 0 6px 0', color: 'var(--lw-text)', maxWidth: '340px', lineHeight: 1.4, zIndex: 1 }}>
            {articleTitle || 'Digital Collectible'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--lw-text-secondary)', margin: '0 0 20px 0', maxWidth: '280px', lineHeight: 1.6, zIndex: 1 }}>Sebagai pemilik NFT, kamu berhak membuka materi eksklusif artikel ini. Klik tombol di bawah untuk memverifikasi kepemilikan.</p>
          <div style={{ zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <LiteraButton onClick={handleDecrypt} disabled={isUnlocking} fullWidth={false}>
              {isUnlocking ? "Membuka Konten…" : "Buka Konten Eksklusif"}
            </LiteraButton>
            <div style={{ marginTop: '12px' }}>
              {renderWalletButton()}
            </div>
          </div>
          <PoweredByLitera />
        </WidgetShell>
      );
    }

    // Owns NFT, no unlockable
    return (
      <WidgetShell>
        <NftSpecimenCard media={nftMedia} title={articleTitle} author={authorName || undefined} tokenId={tokenId} isOwned={true} />
        <Badge color="green">{publisherName || 'Official Publisher'}</Badge>
        <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '10px 0 4px 0', color: 'var(--lw-text)', maxWidth: '340px', lineHeight: 1.4 }}>
          {articleTitle || 'Digital Collectible'}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--lw-text-secondary)', margin: '0 0 16px 0', maxWidth: '300px', lineHeight: 1.6 }}>
          Sertifikat kepemilikan digital kamu tersimpan aman di blockchain Polygon.
        </p>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <LiteraButton href="https://literaa.xyz/mynft" fullWidth={false}>
            Buka Koleksi di Dashboard
          </LiteraButton>
          {sponsorUrl && sponsorUrl.length > 5 && (
            <a
              href={sponsorUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '12px', fontWeight: 700, color: '#d07954', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
            >
              Kunjungi Halaman Terkait <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17l9.2-9.2M17 17V8H8"/></svg>
            </a>
          )}
          <a
            href={getOpenSeaUrl()}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '11px', color: 'var(--lw-text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}
          >
            Lihat data blockchain (OpenSea) <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17l9.2-9.2M17 17V8H8"/></svg>
          </a>
        </div>
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
      const isButtonDisabled = isApproving || isMintTx || isGaslessMinting;
      
      const needed = price ? BigInt(price) : 0n;
      const currentAllowance = allowance !== undefined ? BigInt(allowance as any) : 0n;
      const needsApproval = currentAllowance < needed;
      
      const priceText = price && price > BigInt(0) ? `${parseFloat(formatUnits(price, 18)).toLocaleString('en-US')} LITE` : 'Gratis';
      
      let buttonText = '';
      if (isApproving) buttonText = "Menyetujui LITE…";
      else if (isGaslessMinting || isMintTx) buttonText = "Menyimpan ke Koleksi…";
      else if (needsApproval) buttonText = `Setujui LITE · (${priceText})`;
      else buttonText = `Miliki Edisi Digital`;

      return (
        <WidgetShell>
          <NftSpecimenCard media={nftMedia} title={articleTitle} author={authorName || undefined} tokenId={tokenId} isOwned={false} />
          <Badge color="green">{publisherName || 'Official Publisher'}</Badge>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '10px 0 4px 0', color: 'var(--lw-text)', maxWidth: '340px', lineHeight: 1.4, zIndex: 1 }}>
            {articleTitle || 'Digital Collectible'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--lw-text-secondary)', margin: '0 0 16px 0', maxWidth: '300px', lineHeight: 1.6, zIndex: 1 }}>
            {needsApproval 
              ? "Setujui penggunaan token LITE terlebih dahulu, lalu selesaikan penyimpanan edisi digital."
              : "Verifikasi berhasil. Simpan edisi permanen artikel ini ke akun kamu."}
          </p>
          <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
            <LiteraButton onClick={handleBuy} disabled={isButtonDisabled} fullWidth={false}>{buttonText}</LiteraButton>
          </div>
          {renderWalletButton()}
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
      <NftSpecimenCard media={nftMedia} title={articleTitle} author={authorName || undefined} tokenId={tokenId} isOwned={false} />
      <Badge color="orange">{publisherName || 'Official Publisher'}</Badge>
      <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '10px 0 4px 0', color: 'var(--lw-text)', maxWidth: '340px', lineHeight: 1.4 }}>
        {articleTitle || 'Digital Collectible'}
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--lw-text-secondary)', margin: '0 0 16px 0', maxWidth: '300px', lineHeight: 1.6 }}>Diterbitkan resmi sebagai aset digital permanen artikel ini.</p>

      {/* Collect Button - Hidden for legacy articles */}
      {!isLegacy && (
        <LiteraButton onClick={handleStartAuthorization} fullWidth={false}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Collect NFT
            <span style={{ opacity: 0.5 }}>·</span>
            <span style={{ fontWeight: 500, opacity: 0.85 }}>{price && price > BigInt(0) ? `${parseFloat(formatUnits(price, 18)).toLocaleString('en-US')} LITE` : 'Free'}</span>
          </span>
        </LiteraButton>
      )}
      
      {/* Legacy message - shown instead of mint button */}
      {isLegacy && !ownsNFT && (
        <div style={{ 
          padding: '12px 16px', 
          background: 'var(--lw-bg-inner)', 
          border: '1px solid var(--lw-border)',
          borderRadius: '12px',
          fontSize: '12px',
          color: 'var(--lw-text-secondary)',
          textAlign: 'center',
          marginBottom: '12px'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>NFT Generasi 1</div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>Artikel ini tidak lagi tersedia untuk pembelian</div>
        </div>
      )}

      {/* Wallet + Branding */}
      {renderWalletButton()}
      <PoweredByLitera />
    </WidgetShell>
  );
};

export default LiteraWidget;
