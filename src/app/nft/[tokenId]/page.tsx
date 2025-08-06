'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import Image from 'next/image'
import { Header } from '@/components/Header'
import { CONTRACT_ADDRESSES } from '@/lib/config'
import { UsdPrice, UsdPriceWithLabel } from '@/components/UsdPrice'
import { UsdInputWithLabel } from '@/components/UsdInput'
import { useUsdConversion } from '@/hooks/useUsdConversion'
import { AddressLink } from '@/components/AddressLink'
import { baseSepolia } from 'viem/chains'
import MARKETPLACE_ABI_FILE from '@/lib/Marketplace.json'
import BASE_NFT_ABI_FILE from '@/lib/BaseNFT.json'

const MARKETPLACE_ABI = MARKETPLACE_ABI_FILE.abi
const BASE_NFT_ABI = BASE_NFT_ABI_FILE.abi

interface NFTData {
  id: string
  tokenId: string
  name: string
  description: string
  image: string
  owner: string
  creator: string
  royalty: number
  sale?: {
    id: string
    startingPrice: string
    buyNowPrice: string
    currentBid: string
    currentBidder: string
    endTime: number
    active: boolean
  }
  location: string
  datetime: number
  consumed: boolean
}

export default function NFTDetailPage() {
  const params = useParams()
  const tokenId = params.tokenId as string
  const { address, isConnected } = useAccount()
  
  const [nft, setNft] = useState<NFTData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(Date.now())
  
  // USD input states with ETH equivalents
  const [bidAmountUsd, setBidAmountUsd] = useState('')
  const [bidAmountEth, setBidAmountEth] = useState('')
  const [isListing, setIsListing] = useState(false)
  const [needsApproval, setNeedsApproval] = useState(false)
  const [checkingApproval, setCheckingApproval] = useState(false)
  const [listingData, setListingData] = useState({
    startingPriceUsd: '',
    startingPriceEth: '',
    buyNowPriceUsd: '',
    buyNowPriceEth: '',
    duration: '24' // hours
  })

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })
  const { convertUsdToEth } = useUsdConversion()

  // Calculate if user is owner
  const isOwner = isConnected && address && nft && address?.toLowerCase() === nft.owner.toLowerCase()

  useEffect(() => {
    if (tokenId) {
      fetchNFT()
    }
  }, [tokenId])

  useEffect(() => {
    if (isOwner) {
      checkApproval()
    }
  }, [isOwner])

  useEffect(() => {
    if (isSuccess) {
      // Refresh NFT data and check approval status after successful transaction
      fetchNFT()
      if (isOwner) {
        checkApproval()
      }
    }
  }, [isSuccess, isOwner])

  const checkApproval = async () => {
    if (!address || !nft) {
      console.log('checkApproval: Missing address or nft', { address, nft })
      return
    }
    
    console.log('Checking approval for NFT:', tokenId, 'owner:', address, 'marketplace:', CONTRACT_ADDRESSES[baseSepolia.id].marketplace)
    setCheckingApproval(true)
    try {
      // Check if marketplace is approved to transfer this NFT
      const response = await fetch(`/api/nfts/${tokenId}/approval-status?owner=${address}&marketplace=${CONTRACT_ADDRESSES[baseSepolia.id].marketplace}`)
      console.log('Approval check response:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('Approval data:', data)
        setNeedsApproval(!data.isApproved)
      } else {
        console.error('Approval check failed with status:', response.status)
        const errorText = await response.text()
        console.error('Error response:', errorText)
      }
    } catch (error) {
      console.error('Error checking approval:', error)
    } finally {
      setCheckingApproval(false)
    }
  }

  const handleApprove = async () => {
    if (!isConnected || !address) return

    try {
      writeContract({
        address: CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`,
        abi: BASE_NFT_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES[baseSepolia.id].marketplace, BigInt(tokenId)],
      })
    } catch (error) {
      console.error('Error approving marketplace:', error)
    }
  }

  // Real-time timer updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const fetchNFT = async () => {
    try {
      const response = await fetch(`/api/nfts/${tokenId}`)
      if (response.ok) {
        const data = await response.json()
        setNft(data)
      }
    } catch (error) {
      console.error('Error fetching NFT:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBid = async () => {
    if (!nft?.sale || !bidAmountEth || !isConnected) return

    try {
      writeContract({
        address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`,
        abi: MARKETPLACE_ABI,
        functionName: 'placeBid',
        args: [BigInt(nft.sale.id)],
        value: parseEther(bidAmountEth),
      })
    } catch (error) {
      console.error('Error placing bid:', error)
    }
  }

  const handleBuyNow = async () => {
    if (!nft?.sale || !isConnected) return

    try {
      // Convert USD price to ETH
      const buyNowPriceUsd = Number(BigInt(nft.sale.buyNowPrice)) / 100000000 // Convert from 8 decimal USD to regular USD
      const ethAmount = await convertUsdToEth(buyNowPriceUsd)
      
      writeContract({
        address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`,
        abi: MARKETPLACE_ABI,
        functionName: 'buyNow',
        args: [BigInt(nft.sale.id)],
        value: ethAmount, // Send ETH equivalent
      })
    } catch (error) {
      console.error('Error buying NFT:', error)
    }
  }

  const handleListNFT = async () => {
    console.log('handleListNFT called', { 
      startingPriceUsd: listingData.startingPriceUsd, 
      buyNowPriceUsd: listingData.buyNowPriceUsd, 
      isConnected,
      tokenId 
    })
    
    if (!listingData.startingPriceUsd || !listingData.buyNowPriceUsd || !isConnected) {
      console.log('Missing required data for listing')
      return
    }

    try {
      // Convert USD prices to 8-decimal format (contract expects USD with 8 decimals)
      const startingPriceUsdFormatted = BigInt(Math.round(parseFloat(listingData.startingPriceUsd) * 100000000))
      const buyNowPriceUsdFormatted = BigInt(Math.round(parseFloat(listingData.buyNowPriceUsd) * 100000000))
      
      console.log('Calling writeContract with args:', {
        address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace,
        tokenId: BigInt(tokenId),
        startingPriceUsdFormatted: startingPriceUsdFormatted.toString(),
        buyNowPriceUsdFormatted: buyNowPriceUsdFormatted.toString(),
        duration: BigInt(parseInt(listingData.duration) * 3600).toString()
      })
      
      writeContract({
        address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`,
        abi: MARKETPLACE_ABI,
        functionName: 'listNFT',
        args: [
          BigInt(tokenId),
          startingPriceUsdFormatted,
          buyNowPriceUsdFormatted,
          BigInt(parseInt(listingData.duration) * 3600), // Convert hours to seconds
        ],
      })
    } catch (error) {
      console.error('Error listing NFT:', error)
    }
  }

  const handleBidAmountChange = (usdValue: string, ethValue: string) => {
    setBidAmountUsd(usdValue)
    setBidAmountEth(ethValue)
  }

  const handleStartingPriceChange = (usdValue: string, ethValue: string) => {
    setListingData(prev => ({
      ...prev,
      startingPriceUsd: usdValue,
      startingPriceEth: ethValue
    }))
  }

  const handleBuyNowPriceChange = (usdValue: string, ethValue: string) => {
    setListingData(prev => ({
      ...prev,
      buyNowPriceUsd: usdValue,
      buyNowPriceEth: ethValue
    }))
  }

  const formatUsdPrice = (priceUsd: bigint | string) => {
    const price = typeof priceUsd === 'string' ? BigInt(priceUsd) : priceUsd
    return `$${(Number(price) / 100000000).toFixed(2)}`
  }

  const formatTimeLeft = (timeLeft: number) => {
    if (timeLeft === 0) {
      return 'Expired'
    }
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface)]">
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-[var(--surface-variant)] rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-square bg-[var(--surface-variant)] rounded-[var(--radius-lg)]"></div>
              <div className="space-y-4">
                <div className="h-6 bg-[var(--surface-variant)] rounded w-2/3"></div>
                <div className="h-4 bg-[var(--surface-variant)] rounded w-full"></div>
                <div className="h-4 bg-[var(--surface-variant)] rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!nft) {
    return (
      <div className="min-h-screen bg-[var(--surface)]">
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[var(--on-surface)] mb-4">NFT Not Found</h1>
            <p className="text-[var(--on-surface-variant)]">The requested NFT could not be found.</p>
          </div>
        </div>
      </div>
    )
  }

  const isOnSale = nft.sale && nft.sale.active
  const timeLeft = isOnSale && nft.sale ? Math.max(0, nft.sale.endTime * 1000 - currentTime) : 0


  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* NFT Image */}
          <div className="aspect-square relative rounded-[var(--radius-lg)] overflow-hidden bg-[var(--surface-container)]">
            <Image
              src={nft.image}
              alt={nft.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          {/* NFT Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-[var(--on-surface)] mb-4">{nft.name}</h1>
              <p className="text-[var(--on-surface-variant)] text-lg leading-relaxed">
                {nft.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Location</span>
                <p className="font-medium text-[var(--on-surface)]">{nft.location}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Event Date</span>
                <p className="font-medium text-[var(--on-surface)]">
                  {new Date(nft.datetime * 1000).toLocaleDateString()}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Owner</span>
                <div className="font-mono text-sm">
                  <AddressLink address={nft.owner} />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Creator</span>
                <div className="font-mono text-sm">
                  <AddressLink address={nft.creator} />
                </div>
              </div>
            </div>

            {nft.consumed && (
              <div className="p-4 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-[var(--radius-md)]">
                <h3 className="font-semibold text-[var(--error)] mb-2">Event Used</h3>
                <p className="text-[var(--on-surface-variant)] text-sm">
                  This event ticket has been consumed and is no longer valid for entry.
                </p>
              </div>
            )}

          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sale Information */}
          {isOnSale && nft.sale && (
            <div className="card">
              <h3 className="text-xl font-semibold mb-6 text-[var(--on-surface)]">Current Sale</h3>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Starting Price</span>
                  <div className="font-bold text-xl text-[var(--on-surface)]">
                    {formatUsdPrice(nft.sale.startingPrice)}
                  </div>
                </div>
                <div>
                  <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Buy Now Price</span>
                  <div className="font-bold text-xl text-[var(--on-surface)]">
                    {formatUsdPrice(nft.sale.buyNowPrice)}
                  </div>
                </div>
              </div>

              {nft.sale.currentBid !== '0' && (
                <div className="mb-6 p-4 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-[var(--radius-md)]">
                  <div>
                    <span className="text-[var(--success)] text-xs uppercase tracking-wide">Current Highest Bid</span>
                    <div className="font-bold text-2xl text-[var(--success)]">
                      {formatUsdPrice(nft.sale.currentBid)}
                    </div>
                  </div>
                  <div className="text-sm text-[var(--on-surface-variant)] mt-1 font-mono">
                    by <AddressLink address={nft.sale.currentBidder} className="text-sm" />
                  </div>
                </div>
              )}

              <div className="mb-6 space-y-1">
                <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Time Remaining</span>
                <p className="font-bold text-lg text-[var(--error)]">
                  {formatTimeLeft(timeLeft)}
                </p>
              </div>

              {!isOwner && isConnected && (
                <div className="space-y-6">
                  <UsdInputWithLabel
                    label="Your Bid Amount"
                    value={bidAmountUsd}
                    onChange={handleBidAmountChange}
                    placeholder="Enter bid amount in USD"
                  />
                  <div className="flex space-x-4">
                    <button
                      onClick={handleBid}
                      disabled={isPending || isConfirming || !bidAmountEth}
                      className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Place Bid'}
                    </button>
                    <button
                      onClick={handleBuyNow}
                      disabled={isPending || isConfirming}
                      className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Buy Now'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* List NFT (Owner Only) */}
          {isOwner && !isOnSale && (
            <div className="card">
              <h3 className="text-xl font-semibold mb-6 text-[var(--on-surface)]">List for Sale</h3>
              
              {checkingApproval ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--primary)] border-t-transparent mx-auto"></div>
                  <p className="text-[var(--on-surface-variant)] mt-2">Checking approval status...</p>
                </div>
              ) : needsApproval ? (
                <div className="space-y-4">
                  <div className="p-4 bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-[var(--radius-md)]">
                    <h4 className="font-semibold text-[var(--warning)] mb-2">Approval Required</h4>
                    <p className="text-[var(--on-surface-variant)] text-sm mb-4">
                      You need to approve the marketplace to transfer this NFT before listing it for sale.
                    </p>
                    <button
                      onClick={handleApprove}
                      disabled={isPending || isConfirming}
                      className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Approve Marketplace'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <UsdInputWithLabel
                    label="Starting Price"
                    value={listingData.startingPriceUsd}
                    onChange={handleStartingPriceChange}
                    placeholder="Enter starting price in USD"
                  />
                  <UsdInputWithLabel
                    label="Buy Now Price"
                    value={listingData.buyNowPriceUsd}
                    onChange={handleBuyNowPriceChange}
                    placeholder="Enter buy now price in USD"
                  />
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--on-surface)] mb-2">
                      Duration (hours)
                    </label>
                    <select
                      value={listingData.duration}
                      onChange={(e) => setListingData({...listingData, duration: e.target.value})}
                      className="block w-full px-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
                    >
                      <option value="24">24 hours</option>
                      <option value="72">3 days</option>
                      <option value="168">7 days</option>
                    </select>
                  </div>
                  <button
                    onClick={handleListNFT}
                    disabled={isPending || isConfirming || !listingData.startingPriceUsd || !listingData.buyNowPriceUsd}
                    className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'List NFT'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {isSuccess && (
          <div className="mt-8 text-center p-4 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-[var(--radius-md)]">
            <p className="text-[var(--success)] font-medium">Transaction completed successfully!</p>
          </div>
        )}
      </div>
    </div>
  )
}