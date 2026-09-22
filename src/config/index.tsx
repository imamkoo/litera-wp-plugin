import { createConfig } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { http, fallback } from 'wagmi'
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors'

export const projectId = "3b80ae67f7bf7baa0d65ddfdebe61662"

if (!projectId) {
  throw new Error('Project ID is not defined')
}

export const metadata = {
    name: 'Litera',
    description: 'Litera Web3 Publishing Platform',
    url: 'https://literaa.xyz',
    icons: ['https://avatars.githubusercontent.com/u/179229932']
}

export const chains = [polygon] as const

export const LITERA_ORIGIN = 'https://literaa.xyz'

const PRIVY_ALLOWED_ORIGINS = [
  'https://literaa.xyz',
  'https://www.literaa.xyz',
  'https://app.litera.id',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://litera-test.local',
  'https://litera-test.local',
]

export function isPrivyOriginAllowed(): boolean {
  if (typeof window === 'undefined') return false
  return PRIVY_ALLOWED_ORIGINS.includes(window.location.origin)
}

export const config = createConfig({
  chains,
  multiInjectedProviderDiscovery: true,
  connectors: [
    walletConnect({ projectId, metadata, showQrModal: false }),
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName: metadata.name, appLogoUrl: metadata.icons[0] })
  ],
  ssr: false,
  transports: {
    // Keyless public RPC yang masih hidup (diverifikasi 2026-08-26).
    // ankr.com/polygon (butuh API key → Unauthorized), llamarpc & maticvigil (mati) DIBUANG.
    [polygon.id]: fallback([
        http('https://polygon-bor-rpc.publicnode.com'),
        http('https://1rpc.io/matic'),
    ])
  }
})
