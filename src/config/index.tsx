import { createConfig } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { http, fallback } from 'wagmi'

export const projectId = "3b80ae67f7bf7baa0d65ddfdebe61662"

if (!projectId) {
  throw new Error('Project ID is not defined')
}

export const metadata = {
    name: 'Litera',
    description: 'Litera dashboard',
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

// Catatan: defaultWagmiConfig (@web3modal/wagmi) sebelumnya membawa seluruh
// Reown AppKit (~5MB: x402, fiat-onramp, wallet UI) ke bundle widget.
// Widget hanya butuh email/Google login via Privy; connect wallet Web3
// di-lazy-load di Web3ModalLazy hanya saat user benar-benar klik connect.
// createConfig wagmi murni menggantikannya tanpa kehilangan fungsi.
export const config = createConfig({
  chains,
  multiInjectedProviderDiscovery: true,
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
