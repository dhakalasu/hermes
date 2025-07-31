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
import { baseSepolia } from 'viem/chains'

const MARKETPLACE_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "nftContract", "type": "address" },
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "internalType": "uint256", "name": "startingPrice", "type": "uint256" },
      { "internalType": "uint256", "name": "buyNowPrice", "type": "uint256" },
      { "internalType": "uint256", "name": "duration", "type": "uint256" }
    ],
    "name": "listNFT",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "saleId", "type": "uint256" }],
    "name": "placeBid",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "saleId", "type": "uint256" }],
    "name": "buyNow",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
]

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
  
  // USD input states with ETH equivalents
  const [bidAmountUsd, setBidAmountUsd] = useState('')
  const [bidAmountEth, setBidAmountEth] = useState('')
  const [isListing, setIsListing] = useState(false)
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

  useEffect(() => {
    if (tokenId) {
      fetchNFT()
    }
  }, [tokenId])

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
      writeContract({
        address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`,
        abi: MARKETPLACE_ABI,
        functionName: 'buyNow',
        args: [BigInt(nft.sale.id)],
        value: BigInt(nft.sale.buyNowPrice),
      })
    } catch (error) {
      console.error('Error buying NFT:', error)
    }
  }

  const handleListNFT = async () => {
    if (!listingData.startingPriceEth || !listingData.buyNowPriceEth || !isConnected) return

    try {
      writeContract({
        address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`,
        abi: MARKETPLACE_ABI,
        functionName: 'listNFT',
        args: [
          CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`,
          BigInt(tokenId),
          parseEther(listingData.startingPriceEth),
          parseEther(listingData.buyNowPriceEth),
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

  const isOwner = isConnected && address?.toLowerCase() === nft.owner.toLowerCase()
  const isOnSale = nft.sale && nft.sale.active
  const timeLeft = isOnSale && nft.sale ? Math.max(0, nft.sale.endTime * 1000 - Date.now()) : 0

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
                <p className="font-mono text-[var(--on-surface)] text-sm">
                  {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Creator</span>
                <p className="font-mono text-[var(--on-surface)] text-sm">
                  {nft.creator.slice(0, 6)}...{nft.creator.slice(-4)}
                </p>
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
                <UsdPriceWithLabel
                  weiAmount={BigInt(nft.sale.startingPrice)}
                  label="Starting Price"
                  className="font-bold text-xl text-[var(--on-surface)]"
                />
                <UsdPriceWithLabel
                  weiAmount={BigInt(nft.sale.buyNowPrice)}
                  label="Buy Now Price"
                  className="font-bold text-xl text-[var(--on-surface)]"
                />
              </div>

              {nft.sale.currentBid !== '0' && (
                <div className="mb-6 p-4 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-[var(--radius-md)]">
                  <UsdPriceWithLabel
                    weiAmount={BigInt(nft.sale.currentBid)}
                    label="Current Highest Bid"
                    className="font-bold text-2xl text-[var(--success)]"
                  />
                  <p className="text-sm text-[var(--on-surface-variant)] mt-1 font-mono">
                    by {nft.sale.currentBidder.slice(0, 6)}...{nft.sale.currentBidder.slice(-4)}
                  </p>
                </div>
              )}

              <div className="mb-6 space-y-1">
                <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Time Remaining</span>
                <p className="font-bold text-lg text-[var(--error)]">
                  {Math.floor(timeLeft / (1000 * 60 * 60 * 24))}d{' '}
                  {Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))}h{' '}
                  {Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))}m
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
                  disabled={isPending || isConfirming || !listingData.startingPriceEth || !listingData.buyNowPriceEth}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'List NFT'}
                </button>
              </div>
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