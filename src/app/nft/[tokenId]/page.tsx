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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!nft) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto pt-16 px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">NFT not found</h1>
        </div>
      </div>
    )
  }

  const isOwner = address?.toLowerCase() === nft.owner.toLowerCase()
  const isOnSale = nft.sale?.active && nft.sale.endTime > Date.now() / 1000
  const timeLeft = nft.sale ? Math.max(0, nft.sale.endTime * 1000 - Date.now()) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image */}
          <div className="aspect-square relative rounded-lg overflow-hidden">
            <Image
              src={nft.image}
              alt={nft.name}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{nft.name}</h1>
              <p className="text-gray-600">{nft.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Creator</span>
                <p className="font-medium">{nft.creator.slice(0, 6)}...{nft.creator.slice(-4)}</p>
              </div>
              <div>
                <span className="text-gray-500">Owner</span>
                <p className="font-medium">{nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}</p>
              </div>
              <div>
                <span className="text-gray-500">Token ID</span>
                <p className="font-medium">{nft.tokenId}</p>
              </div>
              <div>
                <span className="text-gray-500">Royalty</span>
                <p className="font-medium">{nft.royalty / 100}%</p>
              </div>
            </div>

            {/* Sale Information */}
            {isOnSale && nft.sale && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Current Sale</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-gray-500">Starting Price</span>
                    <p className="font-bold text-lg">{formatEther(BigInt(nft.sale.startingPrice))} ETH</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Buy Now Price</span>
                    <p className="font-bold text-lg">{formatEther(BigInt(nft.sale.buyNowPrice))} ETH</p>
                  </div>
                </div>

                {nft.sale.currentBid !== '0' && (
                  <div className="mb-4">
                    <span className="text-gray-500">Current Highest Bid</span>
                    <p className="font-bold text-xl text-green-600">
                      {formatEther(BigInt(nft.sale.currentBid))} ETH
                    </p>
                    <p className="text-sm text-gray-500">
                      by {nft.sale.currentBidder.slice(0, 6)}...{nft.sale.currentBidder.slice(-4)}
                    </p>
                  </div>
                )}

                <div className="mb-4">
                  <span className="text-gray-500">Time Remaining</span>
                  <p className="font-medium text-red-600">
                    {Math.floor(timeLeft / (1000 * 60 * 60 * 24))}d{' '}
                    {Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))}h{' '}
                    {Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))}m
                  </p>
                </div>

                {!isOwner && isConnected && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Bid (ETH)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter bid amount"
                      />
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={handleBid}
                        disabled={isPending || isConfirming || !bidAmount}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        Place Bid
                      </button>
                      <button
                        onClick={handleBuyNow}
                        disabled={isPending || isConfirming}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
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
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">List for Sale</h3>
                
                {!isListing ? (
                  <button
                    onClick={() => setIsListing(true)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                  >
                    List NFT for Sale
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Starting Price (ETH)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={listingData.startingPrice}
                        onChange={(e) => setListingData({...listingData, startingPrice: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Buy Now Price (ETH)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={listingData.buyNowPrice}
                        onChange={(e) => setListingData({...listingData, buyNowPrice: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (hours)
                      </label>
                      <select
                        value={listingData.duration}
                        onChange={(e) => setListingData({...listingData, duration: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="24">24 hours</option>
                        <option value="72">3 days</option>
                        <option value="168">7 days</option>
                      </select>
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setIsListing(false)}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleListNFT}
                        disabled={isPending || isConfirming}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
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
      </div>
    </div>
  )
}