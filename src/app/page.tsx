'use client'

import { useState, useEffect } from 'react'
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

export default function Home() {
  const [nfts, setNfts] = useState<NFT[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNFTs()
  }, [])

  const fetchNFTs = async () => {
    try {
      const response = await fetch('/api/nfts')
      if (response.ok) {
        const data = await response.json()
        setNfts(data.nfts || [])
      }
    } catch (error) {
      console.error('Error fetching NFTs:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Header />
      
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="text-center mb-16 space-y-6">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-[var(--on-surface)] tracking-tight">
              Discover tickets, reservations,
              <br />
              <span className="text-[var(--primary)]">and more on BASE</span>
            </h1>
            <p className="text-xl text-[var(--on-surface-variant)] max-w-2xl mx-auto leading-relaxed">
              Buy, sell, and discover exclusive digital assets on the fast and low-cost Base blockchain.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button className="btn-primary">
              Explore Collection
            </button>
            <button className="btn-secondary">
              Create NFT
            </button>
          </div>
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
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-[var(--surface-container)] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-[var(--on-surface-variant)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[var(--on-surface)]">No NFTs found</h3>
              <p className="text-[var(--on-surface-variant)]">Be the first to mint one and start the collection!</p>
              <button className="btn-primary mt-6">
                Create First NFT
              </button>
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