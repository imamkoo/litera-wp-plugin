import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
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

export const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  transports: {
    // Keyless public RPC yang masih hidup (diverifikasi 2026-08-26).
    // ankr.com/polygon (butuh API key → Unauthorized), llamarpc & maticvigil (mati) DIBUANG.
    [polygon.id]: fallback([
        http('https://polygon-bor-rpc.publicnode.com'),
        http('https://1rpc.io/matic'),
    ])
  }
})
