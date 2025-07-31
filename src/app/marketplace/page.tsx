'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { Header } from '@/components/Header'
import { CONTRACT_ADDRESSES } from '@/lib/config'
import { baseSepolia } from 'viem/chains'
import MARKETPLACE_ABI from '@/lib/Marketplace.json'
import NFT_ABI from '@/lib/BaseNFT.json'

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
}

export default function MarketplacePage() {
  const { address, isConnected } = useAccount()
  const [sales, setSales] = useState<{ saleId: number; sale: Sale; nftData: NFTData }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTokenId, setSelectedTokenId] = useState<string>('')
  const [listPriceUsd, setListPriceUsd] = useState<string>('')
  const [buyNowPriceUsd, setBuyNowPriceUsd] = useState<string>('')
  const [duration, setDuration] = useState<string>('86400') // 24 hours default
  const [isApproving, setIsApproving] = useState(false)
  const [needsApproval, setNeedsApproval] = useState(false)
  const [userNFTs, setUserNFTs] = useState<UserNFT[]>([])
  const [loadingUserNFTs, setLoadingUserNFTs] = useState(false)

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Check if marketplace is approved for the selected token
  const { data: approvedAddress } = useReadContract({
    address: CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`,
    abi: NFT_ABI,
    functionName: 'getApproved',
    args: selectedTokenId ? [BigInt(selectedTokenId)] : undefined,
    query: {
      enabled: !!selectedTokenId,
    },
  })

  useEffect(() => {
    if (selectedTokenId && approvedAddress !== undefined) {
      const marketplaceAddress = CONTRACT_ADDRESSES[baseSepolia.id].marketplace.toLowerCase()
      const approved = (approvedAddress as string).toLowerCase()
      setNeedsApproval(approved !== marketplaceAddress)
    }
  }, [selectedTokenId, approvedAddress])

  // Read user's NFT balance for listing
  const { data: userNFTBalance, refetch: refetchUserNFTs } = useReadContract({
    address: CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`,
    abi: NFT_ABI,
    functionName: 'balanceOf',
    args: [address],
    query: {
      enabled: !!address,
    },
  })

  useEffect(() => {
    if (isSuccess) {
      refetchUserNFTs()
      fetchUserNFTs()
      fetchSales() // Refresh sales to show newly listed NFT
      setSelectedTokenId('')
      setListPriceUsd('')
      setBuyNowPriceUsd('')
      setIsApproving(false)
      setNeedsApproval(false)
    }
  }, [isSuccess])

  useEffect(() => {
    fetchSales()
  }, [])

  useEffect(() => {
    if (isConnected && address) {
      fetchUserNFTs()
    }
  }, [isConnected, address])

  const fetchUserNFTs = async () => {
    if (!address) return
    
    try {
      setLoadingUserNFTs(true)
      const response = await fetch(`/api/users/${address}/nfts`)
      if (response.ok) {
        const data = await response.json()
        setUserNFTs(data.nfts || [])
      }
    } catch (error) {
      console.error('Error fetching user NFTs:', error)
    } finally {
      setLoadingUserNFTs(false)
    }
  }

  const fetchSales = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/marketplace/sales')
      if (response.ok) {
        const data = await response.json()
        setSales(data.sales || [])
      } else {
        console.error('Failed to fetch sales:', response.statusText)
        setSales([])
      }
    } catch (error) {
      console.error('Error fetching sales:', error)
      setSales([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedTokenId) return
    
    setIsApproving(true)
    try {
      writeContract({
        address: CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`,
        abi: NFT_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES[baseSepolia.id].marketplace, BigInt(selectedTokenId)],
      })
    } catch (error) {
      console.error('Error approving:', error)
      setIsApproving(false)
    }
  }

  const handleListNFT = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !address) {
      alert('Please connect your wallet')
      return
    }
    
    if (!selectedTokenId || !listPriceUsd || !buyNowPriceUsd || !duration) {
      alert('Please fill all fields')
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

    writeContract({
      address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'listNFT',
      args: [BigInt(selectedTokenId), listPriceUsdBigInt, buyNowPriceUsdBigInt, durationBigInt],
    })
  }

  const formatUsdPrice = (priceUsd: bigint | string) => {
    const price = typeof priceUsd === 'string' ? BigInt(priceUsd) : priceUsd
    return `$${(Number(price) / 100000000).toFixed(2)}`
  }

  const formatTimeLeft = (endTime: bigint | string) => {
    const time = typeof endTime === 'string' ? BigInt(endTime) : endTime
    const endTimeMs = Number(time) * 1000
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
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-[var(--on-surface)] mb-6">List Your NFT</h2>
          <div className="card max-w-5xl space-y-6">
            {/* NFT Selection */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-[var(--on-surface)]">
                Select NFT to List *
              </label>
              
              {loadingUserNFTs ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--surface-variant)] border-t-[var(--primary)]"></div>
                </div>
              ) : userNFTs.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-[var(--surface-variant)] rounded-[var(--radius-md)]">
                  <p className="text-[var(--on-surface-variant)]">You don't own any NFTs to list</p>
                  <a href="/mint" className="text-[var(--primary)] hover:underline mt-2 inline-block">
                    Create your first NFT
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {userNFTs.map((nft) => (
                    <div
                      key={nft.tokenId}
                      onClick={() => setSelectedTokenId(nft.tokenId)}
                      className={`cursor-pointer border-2 rounded-[var(--radius-md)] p-3 transition-all ${
                        selectedTokenId === nft.tokenId
                          ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                          : 'border-[var(--surface-variant)] hover:border-[var(--primary)]/50'
                      }`}
                    >
                      <div className="aspect-square relative mb-2 overflow-hidden rounded-[var(--radius-sm)]">
                        <img
                          src={nft.image}
                          alt={nft.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-image.png'
                          }}
                        />
                        {nft.consumed && (
                          <div className="absolute top-2 right-2 bg-[var(--error)] text-white px-2 py-1 rounded text-xs">
                            Used
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-[var(--on-surface)] truncate">
                          {nft.name}
                        </h4>
                        <p className="text-xs text-[var(--on-surface-variant)] truncate">
                          Token #{nft.tokenId}
                        </p>
                        <p className="text-xs text-[var(--on-surface-variant)] truncate">
                          {nft.location}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleListNFT} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[var(--on-surface)] mb-2">
                    Duration *
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

            {selectedTokenId && needsApproval && (
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
                disabled={isPending || isConfirming || needsApproval || !selectedTokenId}
                className="w-full btn-primary py-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!selectedTokenId ? 'Select an NFT first' : isPending ? 'Confirming...' : isConfirming ? 'Listing...' : 'List NFT'}
              </button>

              {isSuccess && (
                <div className="text-center p-4 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-[var(--radius-md)]">
                  <p className="text-[var(--success)] font-medium">NFT listed successfully!</p>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Active Sales */}
        <div>
          <h2 className="text-2xl font-bold text-[var(--on-surface)] mb-6">Active Sales</h2>
          
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
              {sales.map(({ saleId, sale, nftData }) => {
                try {
                  return (
                    <div key={saleId} className="card">
                      <div className="aspect-square relative mb-4 overflow-hidden rounded-[var(--radius-md)]">
                        <img
                          src={nftData.picture || '/placeholder-image.png'}
                          alt={`NFT #${sale.tokenId}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-image.png'
                          }}
                        />
                        <div className="absolute top-3 right-3 bg-[var(--success)] text-white px-3 py-1 rounded-full text-xs font-medium">
                          Live
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-lg text-[var(--on-surface)] mb-1">
                            NFT #{sale.tokenId}
                          </h3>
                          <p className="text-[var(--on-surface-variant)] text-sm">
                            {nftData.location || 'Unknown location'}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Current Price</span>
                            <div className="font-bold text-lg text-[var(--on-surface)]">
                              {formatUsdPrice(BigInt(sale.currentBidUsd) > 0n ? sale.currentBidUsd : sale.listPriceUsd)}
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
                            <button className="btn-primary text-sm px-4 py-2">
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                } catch (error) {
                  console.error('Error rendering sale:', error)
                  return (
                    <div key={saleId} className="card p-4 text-center">
                      <p className="text-[var(--error)]">Error loading sale #{saleId}</p>
                    </div>
                  )
                }
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}