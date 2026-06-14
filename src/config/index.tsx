import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { polygon } from 'wagmi/chains'

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
  metadata
})