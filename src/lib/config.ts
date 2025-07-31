import { base, baseSepolia } from 'viem/chains'
import { createConfig } from 'wagmi'
import { http } from 'viem'
import { coinbaseWallet } from 'wagmi/connectors'

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: 'Base Marketplace',
      preference: 'eoaOnly',
    }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
})

export const SUPPORTED_CHAINS = [base, baseSepolia]

export const CONTRACT_ADDRESSES = {
  [baseSepolia.id]: {
    nft: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '0x956f49cbe8e4a29e7f14d1666195dd452d170183',
    marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || '',
  },
  [base.id]: {
    nft: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '',
    marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || '',
  },
}