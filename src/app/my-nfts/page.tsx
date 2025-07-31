'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Header } from '@/components/Header'
import { NFTCard } from '@/components/NFTCard'

interface NFT {
  id: string
  tokenId: string
  name: string
  description: string
  image: string
  owner: string
  creator: string
  price?: string
  saleId?: string
  endTime?: number
}

export default function MyNFTsPage() {
  const { address, isConnected } = useAccount()
  const [nfts, setNfts] = useState<NFT[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isConnected && address) {
      fetchMyNFTs()
    } else {
      setLoading(false)
    }
  }, [isConnected, address])

  const fetchMyNFTs = async () => {
    if (!address) return
    
    try {
      const response = await fetch(`/api/users/${address}/nfts`)
      if (response.ok) {
        const data = await response.json()
        setNfts(data.nfts || [])
      }
    } catch (error) {
      console.error('Error fetching my NFTs:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[var(--surface)]">
        <Header />
        <div className="max-w-2xl mx-auto pt-16 px-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-[var(--on-surface)] mb-4">My NFTs</h1>
            <p className="text-[var(--on-surface-variant)]">Please connect your wallet to view your NFTs</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Header />
      
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-12 space-y-2">
          <h1 className="text-4xl font-bold text-[var(--on-surface)]">My NFTs</h1>
          <p className="text-[var(--on-surface-variant)] text-lg">
            Manage your digital collectibles and list them for sale
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--surface-variant)] border-t-[var(--primary)]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 bg-[var(--primary)] rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        ) : nfts.length === 0 ? (
          <div className="text-center py-24">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-16 h-16 bg-[var(--surface-container)] rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-[var(--on-surface-variant)]"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-[var(--on-surface)]">No NFTs found</h3>
                <p className="text-[var(--on-surface-variant)]">
                  You don&apos;t own any NFTs yet. Create your first one!
                </p>
              </div>
              <a
                href="/mint"
                className="btn-primary inline-block"
              >
                Create NFT
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {nfts.map((nft) => (
              <NFTCard key={nft.id} nft={nft} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}