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
    nft: '0x20558EeCb59EB2090A5A0588FD5fD18BF95f2A1d',
    marketplace: '0x8EDf3fce78d843b544Cc596e64c6108b434dE154',
  },
  [base.id]: {
    nft: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '',
    marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || '',
  },
}