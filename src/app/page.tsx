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
  consumed: boolean
  location: string
  datetime: number
  price?: string
  saleId?: string
  endTime?: number
}

type EventType = 'all' | 'sports' | 'music' | 'food' | 'others'

export default function Home() {
  const [nfts, setNfts] = useState<NFT[]>([])
  const [filteredNfts, setFilteredNfts] = useState<NFT[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEventType, setSelectedEventType] = useState<EventType>('all')

  useEffect(() => {
    fetchNFTs()
  }, [])

  useEffect(() => {
    filterNFTs(selectedEventType)
  }, [nfts, selectedEventType])

  const fetchNFTs = async () => {
    try {
      const response = await fetch('/api/nfts')
      if (response.ok) {
        const data = await response.json()
        const nftList = data.nfts || []
        setNfts(nftList)
        setFilteredNfts(nftList)
      }
    } catch (error) {
      console.error('Error fetching NFTs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Function to determine event type based on location
  const getEventType = (location: string): EventType => {
    // First check if event type is explicitly included in parentheses (new format)
    const typeMatch = location.match(/\((sports|music|food|others)\)$/)
    if (typeMatch) {
      return typeMatch[1] as EventType
    }
    
    // Fallback to keyword detection for older NFTs
    const locationLower = location.toLowerCase()
    if (locationLower.includes('stadium') || locationLower.includes('arena') || locationLower.includes('court') || locationLower.includes('field') || locationLower.includes('game') || locationLower.includes('sport') || locationLower.includes('match') || locationLower.includes('tournament')) {
      return 'sports'
    }
    if (locationLower.includes('concert') || locationLower.includes('festival') || locationLower.includes('club') || locationLower.includes('venue') || locationLower.includes('hall') || locationLower.includes('music') || locationLower.includes('band') || locationLower.includes('dj') || locationLower.includes('opera') || locationLower.includes('symphony')) {
      return 'music'
    }
    if (locationLower.includes('restaurant') || locationLower.includes('cafe') || locationLower.includes('bar') || locationLower.includes('kitchen') || locationLower.includes('food') || locationLower.includes('dining') || locationLower.includes('bistro') || locationLower.includes('grill') || locationLower.includes('tavern') || locationLower.includes('buffet')) {
      return 'food'
    }
    return 'others'
  }

  // Filter NFTs based on selected event type
  const filterNFTs = (eventType: EventType) => {
    if (eventType === 'all') {
      setFilteredNfts(nfts)
    } else {
      const filtered = nfts.filter(nft => getEventType(nft.location) === eventType)
      setFilteredNfts(filtered)
    }
  }

  // Handle event type filter change
  const handleEventTypeChange = (eventType: EventType) => {
    setSelectedEventType(eventType)
    filterNFTs(eventType)
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
        ) : filteredNfts.length === 0 && nfts.length === 0 ? (
          <div className="text-center py-24">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-[var(--surface-container)] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-[var(--on-surface-variant)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[var(--on-surface)]">No NFTs found</h3>
              <p className="text-[var(--on-surface-variant)]">Be the first to mint one and start the collection!</p>
            </div>
          </div>
        ) : (
          <>
            {/* Event Type Filter */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[var(--on-surface)] mb-4">Filter by Event Type</h2>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'all', label: 'All Events', icon: '🎯' },
                  { key: 'sports', label: 'Sports', icon: '⚽' },
                  { key: 'music', label: 'Music', icon: '🎵' },
                  { key: 'food', label: 'Food & Dining', icon: '🍽️' },
                  { key: 'others', label: 'Others', icon: '✨' },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => handleEventTypeChange(filter.key as EventType)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-all ${
                      selectedEventType === filter.key
                        ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-lg'
                        : 'bg-[var(--surface-variant)] text-[var(--on-surface-variant)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]'
                    }`}
                  >
                    <span>{filter.icon}</span>
                    <span>{filter.label}</span>
                    {selectedEventType === filter.key && (
                      <span className="bg-[var(--on-primary)]/20 text-xs px-2 py-0.5 rounded-full">
                        {filteredNfts.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {filteredNfts.length === 0 ? (
              <div className="text-center py-24">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 bg-[var(--surface-container)] rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-[var(--on-surface-variant)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--on-surface)]">No {selectedEventType === 'all' ? '' : selectedEventType} events found</h3>
                  <p className="text-[var(--on-surface-variant)]">Try selecting a different event type or check back later for new listings.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredNfts.map((nft) => (
                  <NFTCard key={nft.id} nft={nft} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}