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
    url: 'https://app.literaa.xyz',
    icons: ['https://avatars.githubusercontent.com/u/179229932']
}

export const chains = [polygon] as const

export const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  transports: {
    [polygon.id]: fallback([
        http(process.env.REACT_APP_ALCHEMY_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/REDACTED_ALCHEMY_KEY'),
        http(process.env.REACT_APP_INFURA_RPC_URL),
        http('https://polygon.llamarpc.com'),
        http('https://polygon-bor-rpc.publicnode.com'),
        http('https://1rpc.io/matic'),
        http('https://rpc-mainnet.maticvigil.com')
    ])
  }
})
