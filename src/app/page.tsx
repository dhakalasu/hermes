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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Discover tickets, reservations, and more on BASE
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Buy, sell, and discover exclusive digital assets on the fast and low-cost Base blockchain.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : nfts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No NFTs found. Be the first to mint one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {nfts.map((nft) => (
              <NFTCard key={nft.id} nft={nft} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}