'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { Header } from '@/components/Header'
import { CONTRACT_ADDRESSES } from '@/lib/config'
import { baseSepolia } from 'viem/chains'

const NFT_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "picture", "type": "string" },
      { "internalType": "string", "name": "location", "type": "string" },
      { "internalType": "uint256", "name": "datetime", "type": "uint256" }
    ],
    "name": "mint",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "getNFTData",
    "outputs": [
      { "internalType": "string", "name": "picture", "type": "string" },
      { "internalType": "string", "name": "location", "type": "string" },
      { "internalType": "uint256", "name": "datetime", "type": "uint256" },
      { "internalType": "bool", "name": "consumed", "type": "bool" },
      { "internalType": "address", "name": "originalOwner", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

export default function MintPage() {
  const { address, isConnected, chain } = useAccount()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })
  const { switchChain } = useSwitchChain()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImage(e.target.files[0])
    }
  }

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !address || !image || !name || !location || !eventDate || !eventTime) {
      alert('Please connect wallet and fill all required fields')
      return
    }

    // Check if user is on the correct network
    if (chain?.id !== baseSepolia.id) {
      try {
        await switchChain({ chainId: baseSepolia.id })
      } catch (error) {
        console.error('Failed to switch network:', error)
        alert('Please switch to Base Sepolia network to mint NFTs')
        return
      }
    }

    setIsUploading(true)
    
    try {
      // Upload to IPFS via backend API
      const formData = new FormData()
      formData.append('image', image)
      formData.append('name', name)
      formData.append('description', description)
      formData.append('location', location)
      formData.append('eventDate', eventDate)
      formData.append('eventTime', eventTime)

      const response = await fetch('/api/upload-metadata', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload metadata')
      }

      const { pictureUrl } = await response.json()

      // Convert date and time to Unix timestamp
      const eventDateTime = new Date(`${eventDate}T${eventTime}`).getTime() / 1000

      // Mint NFT with current timestamp
      const currentTimestamp = Math.floor(Date.now() / 1000)
      writeContract({
        address: CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`,
        abi: NFT_ABI,
        functionName: 'mint',
        args: [pictureUrl, location, BigInt(Math.floor(eventDateTime))],
      })
    } catch (error) {
      console.error('Error minting NFT:', error)
      alert('Failed to mint NFT')
    } finally {
      setIsUploading(false)
    }
  }

  const isWrongNetwork = isConnected && chain?.id !== baseSepolia.id

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto pt-16 px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Create Event NFT</h1>
            <p className="text-gray-600">Please connect your wallet to create an event NFT</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-2xl mx-auto pt-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Event NFT</h1>
        <p className="text-gray-600 mb-6">Create NFTs for tickets, reservations, and special events</p>
        
        {isWrongNetwork && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Wrong Network</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Please switch to Base Sepolia network to mint NFTs
                </p>
              </div>
              <button
                type="button"
                onClick={() => switchChain({ chainId: baseSepolia.id })}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                Switch Network
              </button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleMint} className="space-y-6 bg-white p-6 rounded-lg shadow">
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
              Event Image *
            </label>
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              required
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Event Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter event name"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Event Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe your event"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Event Location *
            </label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter event location"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isPending || isConfirming || isUploading || isWrongNetwork}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading
              ? 'Uploading...'
              : isPending
              ? 'Confirming...'
              : isConfirming
              ? 'Minting...'
              : 'Create Event NFT'}
          </button>

          {isSuccess && (
            <div className="text-center p-4 bg-green-50 rounded-md">
              <p className="text-green-800">Event NFT minted successfully!</p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}