'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { Header } from '@/components/Header'
import { CONTRACT_ADDRESSES } from '@/lib/config'
import { baseSepolia } from 'viem/chains'
import MARKETPLACE_ABI from '@/lib/Marketplace.json'
import NFT_ABI from '@/lib/BaseNFT.json'

interface NFTData {
  picture: string
  location: string
  datetime: string
  consumed: boolean
  originalOwner: string
  currentOwner: string
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

type EventType = 'sports' | 'music' | 'food' | 'others'

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

const getEventTypeEmoji = (eventType: EventType): string => {
  switch (eventType) {
    case 'sports': return '⚽'
    case 'music': return '🎵'
    case 'food': return '🍽️'
    case 'others': return '✨'
  }
}

export default function NFTDetailPage() {
  const params = useParams()
  const tokenId = params.tokenId as string
  const { address, isConnected } = useAccount()
  const router = useRouter()
  
  const [nftData, setNftData] = useState<NFTData | null>(null)
  const [saleData, setSaleData] = useState<Sale | null>(null)
  const [saleId, setSaleId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [bidAmount, setBidAmount] = useState('')

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Read NFT data from contract
  const { data: nftInfo } = useReadContract({
    address: CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`,
    abi: NFT_ABI,
    functionName: 'getNFTData',
    args: tokenId ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: !!tokenId,
    },
  })

  useEffect(() => {
    if (nftInfo) {
      setNftData({
        picture: nftInfo[0] as string,
        location: nftInfo[1] as string,
        datetime: (nftInfo[2] as bigint).toString(),
        consumed: nftInfo[3] as boolean,
        originalOwner: nftInfo[4] as string,
        currentOwner: nftInfo[5] as string,
      })
    }
  }, [nftInfo])

  useEffect(() => {
    const fetchSaleData = async () => {
      try {
        // Check if NFT is for sale by trying all sale IDs
        for (let id = 1; id <= 20; id++) {
          try {
            const response = await fetch(`/api/marketplace/sales/${id}`)
            if (response.ok) {
              const data = await response.json()
              if (data.sale.tokenId === tokenId && data.sale.active) {
                setSaleData(data.sale)
                setSaleId(id)
                break
              }
            }
          } catch (error) {
            // Continue to next sale
          }
        }
      } catch (error) {
        console.error('Error fetching sale data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (tokenId) {
      fetchSaleData()
    }
  }, [tokenId, isSuccess])

  const handleBuyNow = async () => {
    if (!saleData || !saleId) return

    writeContract({
      address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'buyNow',
      args: [BigInt(saleId)],
      value: await calculateEthAmount(saleData.buyNowPriceUsd),
    })
  }

  const handlePlaceBid = async () => {
    if (!bidAmount || !saleData || !saleId) return

    const bidUsd = Math.floor(parseFloat(bidAmount) * 100000000) // Convert to 8 decimals
    
    writeContract({
      address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'placeBid',
      args: [BigInt(saleId)],
      value: await calculateEthAmount(bidUsd.toString()),
    })
  }

  const calculateEthAmount = async (usdAmount: string): Promise<bigint> => {
    const ethPrice = await getEthPrice()
    const usdValue = Number(usdAmount) / 100000000 // Convert from 8 decimals
    const ethValue = usdValue / ethPrice
    return BigInt(Math.floor(ethValue * 1e18)) // Convert to wei
  }

  const getEthPrice = async (): Promise<number> => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
      const data = await response.json()
      return data.ethereum.usd
    } catch {
      return 3000 // Fallback price
    }
  }

  const formatUsdPrice = (priceUsd: string) => {
    return `$${(Number(priceUsd) / 100000000).toFixed(2)}`
  }

  const formatTimeLeft = (endTime: string) => {
    const endTimeMs = Number(endTime) * 1000
    const timeLeft = Math.max(0, endTimeMs - Date.now())
    const hours = Math.floor(timeLeft / (1000 * 60 * 60))
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
    
    if (timeLeft === 0) return 'Ended'
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    return `${hours}h ${minutes}m`
  }

  if (loading || !nftData) {
    return (
      <div className="min-h-screen bg-[var(--surface)]">
        <Header />
        <div className="max-w-4xl mx-auto pt-8 px-6">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--surface-variant)] border-t-[var(--primary)]"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Header />
      <div className="max-w-4xl mx-auto pt-8 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* NFT Image */}
          <div>
            <div className="aspect-square relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--surface-variant)]">
              <img
                src={nftData.picture}
                alt={`NFT #${tokenId}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = `https://picsum.photos/400/400?random=${tokenId}`
                }}
              />
              {nftData.consumed && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="bg-red-500 text-white px-4 py-2 rounded-[var(--radius-md)] font-medium">
                    CONSUMED
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* NFT Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-[var(--on-surface)]">
                  NFT #{tokenId}
                </h1>
                <div className="px-3 py-1 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-full flex items-center space-x-2">
                  <span>{getEventTypeEmoji(getEventType(nftData.location))}</span>
                  <span className="text-sm font-medium text-[var(--primary)] capitalize">
                    {getEventType(nftData.location)}
                  </span>
                </div>
              </div>
              <p className="text-lg text-[var(--on-surface-variant)]">
                📍 {nftData.location.replace(/\s*\([^)]*\)$/, '')}
              </p>
              <p className="text-sm text-[var(--on-surface-variant)]">
                🗓️ {new Date(Number(nftData.datetime) * 1000).toLocaleDateString()}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-[var(--on-surface-variant)]">Current Owner</span>
                <p className="font-mono text-sm break-all">{nftData.currentOwner}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-[var(--on-surface-variant)]">Original Owner</span>
                <p className="font-mono text-sm break-all">{nftData.originalOwner}</p>
              </div>
            </div>

            {/* Sale Information */}
            {saleData && (
              <div className="card">
                <h3 className="text-xl font-bold text-[var(--on-surface)] mb-4">For Sale</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-[var(--on-surface-variant)] uppercase tracking-wide">Current Price</span>
                      <div className="text-2xl font-bold text-[var(--on-surface)]">
                        {formatUsdPrice(Number(saleData.currentBidUsd) > 0 ? saleData.currentBidUsd : saleData.listPriceUsd)}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-[var(--on-surface-variant)] uppercase tracking-wide">Buy Now</span>
                      <div className="text-2xl font-bold text-[var(--primary)]">
                        {formatUsdPrice(saleData.buyNowPriceUsd)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-[var(--on-surface-variant)] uppercase tracking-wide">Time Left</span>
                    <div className="text-lg font-medium text-[var(--error)]">
                      {formatTimeLeft(saleData.endTime)}
                    </div>
                  </div>

                  {isConnected && address !== saleData.seller && !nftData.consumed && formatTimeLeft(saleData.endTime) !== 'Ended' && (
                    <div className="space-y-4">
                      {/* Buy Now Button */}
                      <button
                        onClick={handleBuyNow}
                        disabled={isPending || isConfirming}
                        className="w-full btn-primary py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPending || isConfirming ? 'Processing...' : `Buy Now for ${formatUsdPrice(saleData.buyNowPriceUsd)}`}
                      </button>

                      {/* Bid Section */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-[var(--on-surface)] mb-2">
                            Place Bid (USD)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            className="block w-full px-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] placeholder-[var(--on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
                            placeholder="Enter bid amount"
                            min={((Number(saleData.currentBidUsd) > 0 ? Number(saleData.currentBidUsd) : Number(saleData.listPriceUsd)) / 100000000 + 0.01).toString()}
                          />
                        </div>
                        <button
                          onClick={handlePlaceBid}
                          disabled={!bidAmount || isPending || isConfirming}
                          className="w-full bg-[var(--secondary)] text-[var(--on-secondary)] py-3 rounded-[var(--radius-sm)] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--secondary)]/90 transition-colors"
                        >
                          {isPending || isConfirming ? 'Processing...' : 'Place Bid'}
                        </button>
                      </div>
                    </div>
                  )}

                  {address === saleData.seller && (
                    <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-[var(--radius-md)] p-4">
                      <p className="text-[var(--warning)] text-sm font-medium">
                        This is your listing
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!saleData && !nftData.consumed && (
              <div className="card">
                <p className="text-[var(--on-surface-variant)]">This NFT is not currently for sale.</p>
              </div>
            )}

            {isSuccess && (
              <div className="bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-[var(--radius-md)] p-4">
                <p className="text-[var(--success)] font-medium">Transaction successful!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}