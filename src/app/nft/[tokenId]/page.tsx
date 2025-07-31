'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import Image from 'next/image'
import { Header } from '@/components/Header'
import { CONTRACT_ADDRESSES } from '@/lib/config'
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
}

export default function NFTDetailPage() {
  const params = useParams()
  const tokenId = params.tokenId as string
  const { address, isConnected } = useAccount()
  
  const [nft, setNft] = useState<NFTData | null>(null)
  const [loading, setLoading] = useState(true)
  const [bidAmount, setBidAmount] = useState('')
  const [isListing, setIsListing] = useState(false)
  const [listingData, setListingData] = useState({
    startingPrice: '',
    buyNowPrice: '',
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
    if (!nft?.sale || !bidAmount || !isConnected) return

    try {
      writeContract({
        address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`,
        abi: MARKETPLACE_ABI,
        functionName: 'placeBid',
        args: [BigInt(nft.sale.id)],
        value: parseEther(bidAmount),
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
    if (!nft || !isConnected || !listingData.startingPrice || !listingData.buyNowPrice) return

    try {
      const durationInSeconds = parseInt(listingData.duration) * 3600 // Convert hours to seconds
      
      writeContract({
        address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`,
        abi: MARKETPLACE_ABI,
        functionName: 'listNFT',
        args: [
          CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`,
          BigInt(nft.tokenId),
          parseEther(listingData.startingPrice),
          parseEther(listingData.buyNowPrice),
          BigInt(durationInSeconds)
        ],
      })
    } catch (error) {
      console.error('Error listing NFT:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface)]">
        <Header />
        <div className="flex justify-center items-center h-64">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--surface-variant)] border-t-[var(--primary)]"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 bg-[var(--primary)] rounded-full animate-pulse"></div>
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
        <div className="max-w-4xl mx-auto pt-16 px-6 text-center">
          <h1 className="text-2xl font-bold text-[var(--on-surface)]">NFT not found</h1>
        </div>
      </div>
    )
  }

  const isOwner = address?.toLowerCase() === nft.owner.toLowerCase()
  const isOnSale = nft.sale?.active && nft.sale.endTime > Date.now() / 1000
  const timeLeft = nft.sale ? Math.max(0, nft.sale.endTime * 1000 - Date.now()) : 0

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Header />
      
      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image */}
          <div className="aspect-square relative rounded-[var(--radius-lg)] overflow-hidden elevation-2">
            <Image
              src={nft.image}
              alt={nft.name}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Details */}
          <div className="space-y-8">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-[var(--on-surface)] tracking-tight">{nft.name}</h1>
              <p className="text-[var(--on-surface-variant)] text-lg leading-relaxed">{nft.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Creator</span>
                <p className="font-mono text-[var(--on-surface)] text-sm">{nft.creator.slice(0, 6)}...{nft.creator.slice(-4)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Owner</span>
                <p className="font-mono text-[var(--on-surface)] text-sm">{nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Token ID</span>
                <p className="font-medium text-[var(--on-surface)]">{nft.tokenId}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Royalty</span>
                <p className="font-medium text-[var(--on-surface)]">{nft.royalty / 100}%</p>
              </div>
            </div>

            {/* Sale Information */}
            {isOnSale && nft.sale && (
              <div className="card">
                <h3 className="text-xl font-semibold mb-6 text-[var(--on-surface)]">Current Sale</h3>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-1">
                    <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Starting Price</span>
                    <p className="font-bold text-xl text-[var(--on-surface)]">{formatEther(BigInt(nft.sale.startingPrice))} ETH</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Buy Now Price</span>
                    <p className="font-bold text-xl text-[var(--on-surface)]">{formatEther(BigInt(nft.sale.buyNowPrice))} ETH</p>
                  </div>
                </div>

                {nft.sale.currentBid !== '0' && (
                  <div className="mb-6 p-4 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-[var(--radius-md)]">
                    <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Current Highest Bid</span>
                    <p className="font-bold text-2xl text-[var(--success)] mt-1">
                      {formatEther(BigInt(nft.sale.currentBid))} ETH
                    </p>
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
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[var(--on-surface)] mb-2">
                        Your Bid (ETH)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="block w-full px-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] placeholder-[var(--on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
                        placeholder="Enter bid amount"
                      />
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={handleBid}
                        disabled={isPending || isConfirming || !bidAmount}
                        className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        Place Bid
                      </button>
                      <button
                        onClick={handleBuyNow}
                        disabled={isPending || isConfirming}
                        className="flex-1 bg-[var(--success)] text-white py-3 px-4 rounded-[var(--radius-md)] font-medium hover:bg-[var(--success)]/90 transition-all duration-200 hover:transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Listing Section for Owner */}
            {isOwner && !isOnSale && (
              <div className="card">
                <h3 className="text-xl font-semibold mb-6 text-[var(--on-surface)]">List for Sale</h3>
                
                {!isListing ? (
                  <button
                    onClick={() => setIsListing(true)}
                    className="w-full btn-primary py-3"
                  >
                    List NFT for Sale
                  </button>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[var(--on-surface)] mb-2">
                        Starting Price (ETH)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={listingData.startingPrice}
                        onChange={(e) => setListingData({...listingData, startingPrice: e.target.value})}
                        className="block w-full px-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] placeholder-[var(--on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[var(--on-surface)] mb-2">
                        Buy Now Price (ETH)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={listingData.buyNowPrice}
                        onChange={(e) => setListingData({...listingData, buyNowPrice: e.target.value})}
                        className="block w-full px-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] placeholder-[var(--on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
                      />
                    </div>
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
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setIsListing(false)}
                        className="flex-1 btn-secondary py-3"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleListNFT}
                        disabled={isPending || isConfirming}
                        className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        List NFT
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}