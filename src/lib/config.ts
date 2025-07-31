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
    nft: '0xB667ecceBD3CE310e34cee8Fb8D174d4F46c247a',
    marketplace: '0x034288b171C27Df3b723385E347d688222192013',
  },
  [base.id]: {
    nft: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '',
    marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || '',
  },
}