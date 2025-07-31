import { base, baseSepolia } from 'viem/chains'
import { createConfig } from 'wagmi'
import { http } from 'viem'
import { coinbaseWallet, metaMask, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: 'Base Marketplace',
      preference: 'smartWalletOnly',
    }),
    metaMask(),
    // walletConnect({
    //   projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || '',
    // }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
})

export const SUPPORTED_CHAINS = [base, baseSepolia]

export const CONTRACT_ADDRESSES = {
  [baseSepolia.id]: {
    nft: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '',
    marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || '',
  },
  [base.id]: {
    nft: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '',
    marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || '',
  },
}