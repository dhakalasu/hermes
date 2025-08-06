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
    nft: '0x1A56D45D17aa3DB402a79055892423D95c489cdE',
    marketplace: '0x547C12fA1AFFf575a881c765229B0D478C4c499E',
  },
  [base.id]: {
    nft: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '',
    marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || '',
  },
}