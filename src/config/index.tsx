import { createConfig } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { http, fallback } from 'wagmi'
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors'

export const projectId = process.env.REACT_APP_REOWN_PROJECT_ID || 'd94f04faafa515ac177c9c41052264b7' || '3b80ae67f7bf7baa0d65ddfdebe61662'

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
    [polygon.id]: fallback([
        http(`${LITERA_ORIGIN}/api/v1/rpc/proxy`, { timeout: 8000 }),
        http('https://polygon.drpc.org', { timeout: 8000 }),
        http('https://polygon.gateway.tenderly.co', { timeout: 8000 }),
    ], { rank: false })
  }
})
