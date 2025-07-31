'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { Header } from '@/components/Header'
import { CONTRACT_ADDRESSES } from '@/lib/config'
import { baseSepolia } from 'viem/chains'
import MARKETPLACE_ABI from '@/lib/Marketplace.json'
import NFT_ABI from '@/lib/BaseNFT.json'
import { Abi } from 'viem'

type EventType = 'sports' | 'music' | 'food' | 'others'

// Function to get event type from NFT or fallback to location parsing for legacy data
const getEventType = (nft: UserNFT | { location: string; eventType?: string }): EventType => {
  if ('eventType' in nft && nft.eventType) {
    return nft.eventType as EventType
  }
  
  // Fallback to location parsing for legacy data
  const location = nft.location
  const typeMatch = location.match(/\((sports|music|food|others)\)$/)
  if (typeMatch) {
    return typeMatch[1] as EventType
  }
  
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

const getEventTypeEmoji = (eventType: EventType): string => {
  switch (eventType) {
    case 'sports': return '⚽'
    case 'music': return '🎵'
    case 'food': return '🍽️'
    case 'others': return '✨'
  }
}

const getEventTypeColor = (eventType: EventType): string => {
  switch (eventType) {
    case 'sports': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'music': return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'food': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'others': return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

interface Sale {
  seller: string
  tokenId: string
  listPriceUsd: string
  buyNowPriceUsd: string
  currentBidUsd: string
  currentBidder: string
  endTime: string
  active: boolean
}

interface NFTData {
  picture: string
  location: string
  datetime: string
  consumed: boolean
  originalOwner: string
  currentOwner: string
}

interface UserNFT {
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
  eventType: string
}

export default function MarketplacePage() {
  const { address, isConnected } = useAccount()
  const [sales, setSales] = useState<{ saleId: number; sale: Sale; nftData: NFTData }[]>([])
  const [loading, setLoading] = useState(true)
  const [userNFTs, setUserNFTs] = useState<UserNFT[]>([])
  const [loadingUserNFTs, setLoadingUserNFTs] = useState(false)
  const [selectedNFT, setSelectedNFT] = useState<UserNFT | null>(null)
  const [listPriceUsd, setListPriceUsd] = useState<string>('')
  const [buyNowPriceUsd, setBuyNowPriceUsd] = useState<string>('')
  const [duration, setDuration] = useState<string>('86400') // 24 hours default
  const [isApproving, setIsApproving] = useState(false)
  const [needsApproval, setNeedsApproval] = useState(false)
  const [lastAction, setLastAction] = useState<'approve' | 'list' | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Handle success and set appropriate message
  useEffect(() => {
    if (isSuccess && lastAction) {
      setShowSuccess(true)
      if (lastAction === 'list') {
        fetchUserNFTs() // Refresh NFTs after listing
        setSelectedNFT(null)
        setListPriceUsd('')
        setBuyNowPriceUsd('')
      }
      setIsApproving(false)
      setNeedsApproval(false)
    }
  }, [isSuccess, lastAction])

  // Check if marketplace is approved for the selected NFT
  const { data: approvedAddress } = useReadContract({
    address: CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`,
    abi: NFT_ABI as unknown as Abi,
    functionName: 'getApproved',
    args: selectedNFT ? [BigInt(selectedNFT.tokenId)] : undefined,
    query: {
      enabled: !!selectedNFT,
    },
  })

  useEffect(() => {
    if (selectedNFT && approvedAddress !== undefined) {
      const marketplaceAddress = CONTRACT_ADDRESSES[baseSepolia.id].marketplace.toLowerCase()
      const approved = (approvedAddress as string).toLowerCase()
      setNeedsApproval(approved !== marketplaceAddress)
    }
  }, [selectedNFT, approvedAddress])

  const fetchUserNFTs = async () => {
    if (!address) return
    
    setLoadingUserNFTs(true)
    try {
      const response = await fetch(`/api/users/${address}/nfts`)
      if (response.ok) {
        const data = await response.json()
        // Filter out consumed NFTs since they can't be listed
        const availableNFTs = (data.nfts || []).filter((nft: UserNFT) => !nft.consumed)
        setUserNFTs(availableNFTs)
      }
    } catch (error) {
      console.error('Error fetching user NFTs:', error)
    } finally {
      setLoadingUserNFTs(false)
    }
  }

  // Auto-dismiss success message and reset when changing NFT selection
  useEffect(() => {
    if (selectedNFT) {
      setShowSuccess(false)
      setLastAction(null)
    }
  }, [selectedNFT])

  useEffect(() => {
    fetchSales()
    if (address) {
      fetchUserNFTs()
    }
  }, [address])

  const fetchSales = async () => {
    try {
      setLoading(true)
      // For now, we'll check sales 1-10. In production, you'd track nextSaleId
      const salesData = []
      
      for (let saleId = 1; saleId <= 10; saleId++) {
        try {
          const response = await fetch(`/api/marketplace/sales/${saleId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.sale.active) {
              salesData.push({ saleId, ...data })
            }
          }
        } catch (error) {
          // Sale doesn't exist, continue
        }
      }
      
      setSales(salesData)
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedNFT) return
    
    setIsApproving(true)
    setLastAction('approve')
    try {
      writeContract({
        address: CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`,
        abi: NFT_ABI as unknown as Abi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES[baseSepolia.id].marketplace, BigInt(selectedNFT.tokenId)],
      })
    } catch (error) {
      console.error('Error approving:', error)
      setIsApproving(false)
      setLastAction(null)
    }
  }

  const handleListNFT = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !address) {
      alert('Please connect your wallet')
      return
    }
    
    if (!selectedNFT || !listPriceUsd || !buyNowPriceUsd || !duration) {
      alert('Please select an NFT and fill all fields')
      return
    }

    if (needsApproval) {
      alert('Please approve the marketplace to transfer your NFT first')
      return
    }

    // Convert USD to 8 decimals (e.g., $50.00 -> 5000000000)
    const listPriceUsdBigInt = BigInt(Math.floor(parseFloat(listPriceUsd) * 100000000))
    const buyNowPriceUsdBigInt = BigInt(Math.floor(parseFloat(buyNowPriceUsd) * 100000000))
    const durationBigInt = BigInt(duration)

    setLastAction('list')
    writeContract({
      address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`,
      abi: MARKETPLACE_ABI as unknown as Abi,
      functionName: 'listNFT',
      args: [BigInt(selectedNFT.tokenId), listPriceUsdBigInt, buyNowPriceUsdBigInt, durationBigInt],
    })
  }

  const formatUsdPrice = (priceUsd: string) => {
    return `$${(Number(priceUsd) / 100000000).toFixed(2)}`
  }

  const formatTimeLeft = (endTime: string) => {
    const endTimeMs = Number(endTime) * 1000
    const timeLeft = Math.max(0, endTimeMs - Date.now())
    const hours = Math.floor(timeLeft / (1000 * 60 * 60))
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    return `${hours}h ${minutes}m`
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[var(--surface)]">
        <Header />
        <div className="max-w-2xl mx-auto pt-16 px-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-[var(--on-surface)] mb-4">Marketplace</h1>
            <p className="text-[var(--on-surface-variant)]">Please connect your wallet to view and list NFTs</p>
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
          <h1 className="text-3xl font-bold text-[var(--on-surface)]">Marketplace</h1>
          <p className="text-[var(--on-surface-variant)] text-lg">Buy and sell NFTs with USD pricing</p>
        </div>

        {/* List NFT Section */}
        {isConnected && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[var(--on-surface)] mb-6">List Your NFT</h2>
            
            {/* NFT Selection */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-[var(--on-surface)] mb-4">Select NFT to List</h3>
              {loadingUserNFTs ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--surface-variant)] border-t-[var(--primary)]"></div>
                </div>
              ) : userNFTs.length === 0 ? (
                <div className="text-center py-8 card">
                  <p className="text-[var(--on-surface-variant)]">You don&apos;t have any NFTs available for listing</p>
                </div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userNFTs.map((nft) => (
                  <div
                    key={nft.tokenId}
                    onClick={() => setSelectedNFT(nft)}
                    className={`card cursor-pointer transition-all hover:scale-[1.02] relative ${
                      selectedNFT?.tokenId === nft.tokenId
                        ? 'ring-2 ring-[var(--primary)] bg-[var(--primary)]/10 shadow-lg scale-105'
                        : 'hover:shadow-lg hover:ring-1 hover:ring-[var(--primary)]/30'
                    }`}
                  >
                    <div className="aspect-square w-full rounded-[var(--radius-md)] overflow-hidden bg-[var(--surface-container)] mb-3">
                      <img
                        src={nft.image}
                        alt={nft.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-medium text-[var(--on-surface)] text-sm">{nft.name}</h4>
                      <p className="text-xs text-[var(--on-surface-variant)]">Token #{nft.tokenId}</p>
                      <p className="text-xs text-[var(--on-surface-variant)]">{nft.location}</p>
                    </div>
                    {selectedNFT?.tokenId === nft.tokenId && (
                      <div className="absolute top-2 right-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-full p-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedNFT && (
            <div className="mb-6 p-4 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-[var(--radius-md)]">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-[var(--radius-sm)] overflow-hidden bg-[var(--surface-container)]">
                  <img
                    src={selectedNFT.image}
                    alt={selectedNFT.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-image.png'
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-[var(--on-surface)]">{selectedNFT.name}</h4>
                  <p className="text-sm text-[var(--on-surface-variant)]">Token #{selectedNFT.tokenId} • {selectedNFT.location}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-[var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-[var(--primary)]">Selected</span>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-2xl">
            {selectedNFT && (
              <div className="flex items-center space-x-3 mb-4">
                <h3 className="text-lg font-medium text-[var(--on-surface)]">
                  Listing Details for NFT #{selectedNFT.tokenId}
                </h3>
                <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getEventTypeColor(getEventType(selectedNFT))}`}>
                  {getEventTypeEmoji(getEventType(selectedNFT))} {getEventType(selectedNFT)} Event
                </div>
              </div>
            )}
            <form onSubmit={handleListNFT} className="card space-y-6">
            {!selectedNFT && (
              <div className="p-4 bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-[var(--radius-md)] mb-6">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-[var(--warning)]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-[var(--warning)] font-medium">
                    Please select an NFT from above to list for sale
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--on-surface)] mb-2">
                  Duration (seconds) *
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="block w-full px-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
                >
                  <option value="3600">1 hour</option>
                  <option value="86400">24 hours</option>
                  <option value="259200">3 days</option>
                  <option value="604800">7 days</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--on-surface)] mb-2">
                  Starting Price (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={listPriceUsd}
                  onChange={(e) => setListPriceUsd(e.target.value)}
                  className="block w-full px-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] placeholder-[var(--on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
                  placeholder="50.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--on-surface)] mb-2">
                  Buy Now Price (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={buyNowPriceUsd}
                  onChange={(e) => setBuyNowPriceUsd(e.target.value)}
                  className="block w-full px-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] placeholder-[var(--on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
                  placeholder="100.00"
                  required
                />
              </div>
            </div>

            {selectedNFT && needsApproval && (
              <div className="space-y-3">
                <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-[var(--radius-md)] p-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-[var(--warning)]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-[var(--warning)] font-medium">
                      Approval Required
                    </p>
                  </div>
                  <p className="text-xs text-[var(--on-surface-variant)] mt-1">
                    You need to approve the marketplace to transfer your NFT before listing it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isApproving || isPending || isConfirming}
                  className="w-full bg-[var(--warning)] text-white py-4 rounded-[var(--radius-sm)] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--warning)]/90 transition-colors"
                >
                  {isApproving ? 'Approving...' : 'Approve Marketplace'}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || isConfirming || needsApproval || !selectedNFT}
              className="w-full btn-primary py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!selectedNFT ? 'Select an NFT to List' : isPending ? 'Confirming...' : isConfirming ? 'Listing...' : 'List NFT'}
            </button>

            {showSuccess && lastAction && (
              <div className="text-center p-4 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-[var(--radius-md)] relative">
                <button
                  onClick={() => setShowSuccess(false)}
                  className="absolute top-2 right-2 text-[var(--success)] hover:text-[var(--success)]/70 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <p className="text-[var(--success)] font-medium">
                  {lastAction === 'approve' ? 'NFT approved successfully!' : 'NFT listed successfully!'}
                </p>
              </div>
            )}
          </form>
          </div>
        </div>
        )}

        {!isConnected && (
          <div className="mb-12">
            <div className="card max-w-2xl">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-[var(--surface-container)] rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-[var(--on-surface-variant)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[var(--on-surface)]">Connect Wallet to List NFTs</h3>
                <p className="text-[var(--on-surface-variant)]">Connect your wallet to list your NFTs for sale on the marketplace.</p>
              </div>
            </div>
          </div>
        )}

        {/* Active Sales */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[var(--on-surface)]">Active Sales</h2>
            {sales.length > 0 && (
              <div className="flex items-center space-x-2">
                {['sports', 'music', 'food', 'others'].map((type) => {
                  const count = sales.filter(({ nftData }) => getEventType(nftData) === type).length
                  if (count === 0) return null
                  return (
                    <div key={type} className={`px-3 py-1 rounded-full text-sm font-medium border ${getEventTypeColor(type as EventType)}`}>
                      {getEventTypeEmoji(type as EventType)} {count}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--surface-variant)] border-t-[var(--primary)]"></div>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--on-surface-variant)]">No active sales found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sales.map(({ saleId, sale, nftData }) => (
                <div key={saleId} className="card">
                  <div className="aspect-square relative mb-4 overflow-hidden rounded-[var(--radius-md)]">
                    <img
                      src={nftData.picture}
                      alt={`NFT #${sale.tokenId}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 bg-[var(--success)] text-white px-3 py-1 rounded-full text-xs font-medium">
                      Live
                    </div>
                    {/* Event type badge */}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 text-white text-xs font-medium rounded-full flex items-center space-x-1">
                      <span>{getEventTypeEmoji(getEventType(nftData))}</span>
                      <span className="capitalize">{getEventType(nftData)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg text-[var(--on-surface)]">
                          NFT #{sale.tokenId}
                        </h3>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getEventTypeColor(getEventType(nftData))}`}>
                          {getEventTypeEmoji(getEventType(nftData))} {getEventType(nftData)}
                        </div>
                      </div>
                      <p className="text-[var(--on-surface-variant)] text-sm">
                        {nftData.location.replace(/\s*\([^)]*\)$/, '')}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Current Price</span>
                        <div className="font-bold text-lg text-[var(--on-surface)]">
                          {formatUsdPrice(Number(sale.currentBidUsd) > 0 ? sale.currentBidUsd : sale.listPriceUsd)}
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Buy Now</span>
                        <div className="font-bold text-lg text-[var(--primary)]">
                          {formatUsdPrice(sale.buyNowPriceUsd)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-[var(--surface-variant)]">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs text-[var(--on-surface-variant)] uppercase tracking-wide">Time Left</span>
                          <div className="font-medium text-sm text-[var(--error)]">
                            {formatTimeLeft(sale.endTime)}
                          </div>
                        </div>
                        <button 
                          onClick={() => window.location.href = `/nft/${sale.tokenId}`}
                          className="btn-primary text-sm px-4 py-2"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}