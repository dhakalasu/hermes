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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto pt-16 px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">My NFTs</h1>
            <p className="text-gray-600">Please connect your wallet to view your NFTs</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My NFTs</h1>
          <p className="text-gray-600 mt-2">
            Manage your digital collectibles and list them for sale
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : nfts.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A9.971 9.971 0 0118 28a9.971 9.971 0 016.286 2.286m0 0v-1.714a6 6 0 10-12 0v1.714"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No NFTs found</h3>
              <p className="mt-1 text-sm text-gray-500">
                You don't own any NFTs yet. Create your first one!
              </p>
              <div className="mt-6">
                <a
                  href="/mint"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create NFT
                </a>
              </div>
            </div>
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