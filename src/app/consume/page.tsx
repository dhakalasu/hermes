'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { Header } from '@/components/Header'
import { CONTRACT_ADDRESSES } from '@/lib/config'
import { baseSepolia } from 'viem/chains'
import { AddressLink } from '@/components/AddressLink'
import NFT_ABI from '@/lib/BaseNFT.json'

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
  eventType?: string
}

export default function ConsumePage() {
  const { address, isConnected, chain } = useAccount()
  const [nfts, setNfts] = useState<NFT[]>([])
  const [loading, setLoading] = useState(true)
  const [consumingNFT, setConsumingNFT] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'unconsumed' | 'consumed'>('all')
  const [selectedEventType, setSelectedEventType] = useState<string>('all')

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })
  const { switchChain } = useSwitchChain()

  useEffect(() => {
    if (isConnected && address) {
      fetchOriginalOwnerNFTs()
    } else {
      setLoading(false)
    }
  }, [isConnected, address])

  useEffect(() => {
    if (isSuccess) {
      // Refresh NFTs after successful consumption
      fetchOriginalOwnerNFTs()
      setConsumingNFT(null)
    }
  }, [isSuccess])

  const fetchOriginalOwnerNFTs = async () => {
    if (!address) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/users/${address}/original-nfts`)
      if (response.ok) {
        const data = await response.json()
        setNfts(data.nfts || [])
      }
    } catch (error) {
      console.error('Error fetching original owner NFTs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConsumeNFT = async (tokenId: string) => {
    if (!isConnected || !address) {
      alert('Please connect your wallet')
      return
    }

    // Check if user is on the correct network
    if (chain?.id !== baseSepolia.id) {
      try {
        await switchChain({ chainId: baseSepolia.id })
      } catch (error) {
        console.error('Failed to switch network:', error)
        alert('Please switch to Base Sepolia network to consume NFTs')
        return
      }
    }

    setConsumingNFT(tokenId)
    
    try {
      writeContract({
        address: CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`,
        abi: NFT_ABI,
        functionName: 'consume',
        args: [BigInt(tokenId)],
      })
    } catch (error) {
      console.error('Error consuming NFT:', error)
      setConsumingNFT(null)
      alert('Failed to consume NFT')
    }
  }

  // Filter NFTs based on status and event type
  const filteredNFTs = nfts.filter(nft => {
    const statusMatch = filterStatus === 'all' || 
                       (filterStatus === 'consumed' && nft.consumed) ||
                       (filterStatus === 'unconsumed' && !nft.consumed)
    
    const typeMatch = selectedEventType === 'all' || nft.eventType === selectedEventType
    
    return statusMatch && typeMatch
  })

  // Event type options with counts
  const eventTypeFilters = [
    { value: 'all', label: 'All Types', count: filteredNFTs.length },
    { value: 'food', label: 'Food', count: nfts.filter(nft => nft.eventType === 'food' && (filterStatus === 'all' || (filterStatus === 'consumed' && nft.consumed) || (filterStatus === 'unconsumed' && !nft.consumed))).length },
    { value: 'sports', label: 'Sports', count: nfts.filter(nft => nft.eventType === 'sports' && (filterStatus === 'all' || (filterStatus === 'consumed' && nft.consumed) || (filterStatus === 'unconsumed' && !nft.consumed))).length },
    { value: 'events', label: 'Events', count: nfts.filter(nft => nft.eventType === 'events' && (filterStatus === 'all' || (filterStatus === 'consumed' && nft.consumed) || (filterStatus === 'unconsumed' && !nft.consumed))).length },
    { value: 'other', label: 'Other', count: nfts.filter(nft => nft.eventType === 'other' && (filterStatus === 'all' || (filterStatus === 'consumed' && nft.consumed) || (filterStatus === 'unconsumed' && !nft.consumed))).length }
  ].filter(filter => filter.count > 0)

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[var(--surface)]">
        <Header />
        <div className="max-w-2xl mx-auto pt-16 px-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-[var(--on-surface)] mb-4">Consume NFTs</h1>
            <p className="text-[var(--on-surface-variant)]">Please connect your wallet to manage your NFTs</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Header />
      <div className="max-w-7xl mx-auto pt-8 px-6">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold text-[var(--on-surface)]">Consume NFTs</h1>
          <p className="text-[var(--on-surface-variant)] text-lg">
            Mark your event tickets as used. You can only consume NFTs where you are the original creator.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-[var(--on-surface)] mr-2 self-center">Status:</span>
            {[
              { value: 'all', label: 'All NFTs', count: nfts.length },
              { value: 'unconsumed', label: 'Available to Consume', count: nfts.filter(nft => !nft.consumed).length },
              { value: 'consumed', label: 'Already Consumed', count: nfts.filter(nft => nft.consumed).length }
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterStatus(filter.value as any)}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                  filterStatus === filter.value
                    ? 'bg-[var(--primary)] text-white shadow-md'
                    : 'bg-[var(--surface-variant)] text-[var(--on-surface-variant)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]'
                }`}
              >
                {filter.label}
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                  filterStatus === filter.value
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--primary)]/10 text-[var(--primary)]'
                }`}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>

          {/* Event Type Filter */}
          {eventTypeFilters.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-[var(--on-surface)] mr-2 self-center">Type:</span>
              {eventTypeFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setSelectedEventType(filter.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedEventType === filter.value
                      ? 'bg-[var(--secondary)] text-white shadow-md'
                      : 'bg-[var(--surface-variant)] text-[var(--on-surface-variant)] hover:bg-[var(--secondary)]/10 hover:text-[var(--secondary)]'
                  }`}
                >
                  {filter.label}
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                    selectedEventType === filter.value
                      ? 'bg-white/20 text-white'
                      : 'bg-[var(--secondary)]/10 text-[var(--secondary)]'
                  }`}>
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* NFT Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--surface-variant)] border-t-[var(--primary)]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 bg-[var(--primary)] rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        ) : filteredNFTs.length === 0 ? (
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-[var(--on-surface)]">
                  {nfts.length === 0 ? 'No NFTs found' : 'No NFTs match your filters'}
                </h3>
                <p className="text-[var(--on-surface-variant)]">
                  {nfts.length === 0 
                    ? "You haven't created any NFTs yet."
                    : 'Try adjusting your filters to see more NFTs.'
                  }
                </p>
              </div>
              {nfts.length === 0 && (
                <a
                  href="/mint"
                  className="btn-primary inline-block"
                >
                  Create NFT
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredNFTs.map((nft) => (
              <div key={nft.id} className="card">
                <div className="aspect-square relative mb-4 overflow-hidden rounded-[var(--radius-md)]">
                  <img
                    src={nft.image}
                    alt={nft.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-image.png'
                    }}
                  />
                  {nft.consumed && (
                    <div className="absolute top-3 right-3 bg-[var(--error)] text-white px-3 py-1 rounded-full text-xs font-medium">
                      Consumed
                    </div>
                  )}
                  {nft.eventType && (
                    <div className="absolute top-3 left-3 bg-[var(--primary)]/90 text-white px-2 py-1 rounded text-xs font-medium capitalize">
                      {nft.eventType}
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg text-[var(--on-surface)] mb-1">
                      {nft.name}
                    </h3>
                    <p className="text-[var(--on-surface-variant)] text-sm">
                      Token #{nft.tokenId} • {nft.location}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[var(--on-surface-variant)] uppercase tracking-wide">Event Date</span>
                      <div className="font-medium text-[var(--on-surface)] mt-0.5">
                        {new Date(nft.datetime * 1000).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-[var(--on-surface-variant)] uppercase tracking-wide">Current Owner</span>
                      <div className="font-mono mt-0.5">
                        <AddressLink address={nft.owner} className="text-xs" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-[var(--surface-variant)]">
                    {nft.consumed ? (
                      <div className="text-center py-2">
                        <span className="text-[var(--error)] text-sm font-medium">
                          ✓ Already Consumed
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConsumeNFT(nft.tokenId)}
                        disabled={isPending || isConfirming || consumingNFT === nft.tokenId}
                        className="w-full bg-[var(--error)] text-white py-3 rounded-[var(--radius-sm)] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--error)]/90 transition-colors"
                      >
                        {consumingNFT === nft.tokenId
                          ? (isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Consuming...')
                          : 'Mark as Consumed'
                        }
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isSuccess && (
          <div className="fixed bottom-6 right-6 p-4 bg-[var(--success)] text-white rounded-[var(--radius-md)] shadow-lg">
            <p className="font-medium">NFT marked as consumed successfully!</p>
          </div>
        )}
      </div>
    </div>
  )
}