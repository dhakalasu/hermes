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
      { "internalType": "uint256", "name": "datetime", "type": "uint256" },
      { "internalType": "uint8", "name": "eventType", "type": "uint8" }
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
      { "internalType": "address", "name": "originalOwner", "type": "address" },
      { "internalType": "address", "name": "currentOwner", "type": "address" },
      { "internalType": "uint8", "name": "eventType", "type": "uint8" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint8", "name": "eventType", "type": "uint8" }
    ],
    "name": "getEventTypeString",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "pure",
    "type": "function"
  }
]

export default function MintPage() {
  const { address, isConnected, chain } = useAccount()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [eventType, setEventType] = useState('0') // 0=FOOD, 1=SPORTS, 2=EVENTS, 3=OTHER
  const [isUploading, setIsUploading] = useState(false)

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })
  const { switchChain } = useSwitchChain()

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value)
  }

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !address || !imageUrl || !name || !location || !eventDate || !eventTime || eventType === '') {
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
      // Validate image URL via backend API
      const response = await fetch('/api/upload-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          name,
          description,
          location,
          eventDate,
          eventTime,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to validate image URL')
      }

      const { pictureUrl } = await response.json()

      // Convert date and time to Unix timestamp
      const eventDateTime = new Date(`${eventDate}T${eventTime}`).getTime() / 1000

      // Mint NFT
      writeContract({
        address: CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`,
        abi: NFT_ABI,
        functionName: 'mint',
        args: [pictureUrl, location, BigInt(Math.floor(eventDateTime)), parseInt(eventType)],
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
      <div className="min-h-screen bg-[var(--surface)]">
        <Header />
        <div className="max-w-2xl mx-auto pt-16 px-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-[var(--on-surface)] mb-4">Create Event NFT</h1>
            <p className="text-[var(--on-surface-variant)]">Please connect your wallet to create an event NFT</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Header />
      <div className="max-w-2xl mx-auto pt-8 px-6">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold text-[var(--on-surface)]">Create Event NFT</h1>
          <p className="text-[var(--on-surface-variant)] text-lg">Create NFTs for tickets, reservations, and special events</p>
        </div>
        
        {isWrongNetwork && (
          <div className="mb-6 p-4 bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-[var(--radius-md)]">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-[var(--warning)]">Wrong Network</h3>
                <p className="text-sm text-[var(--on-surface-variant)]">
                  Please switch to Base Sepolia network to mint NFTs
                </p>
              </div>
              <button
                type="button"
                onClick={() => switchChain({ chainId: baseSepolia.id })}
                className="btn-primary"
              >
                Switch Network
              </button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleMint} className="card space-y-6">
          <div className="space-y-2">
            <label htmlFor="imageUrl" className="block text-sm font-medium text-[var(--on-surface)] mb-2">
              Event Image URL *
            </label>
            <input
              type="url"
              id="imageUrl"
              value={imageUrl}
              onChange={handleImageUrlChange}
              className="block w-full px-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] placeholder-[var(--on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
              placeholder="https://example.com/image.jpg"
              required
            />
            {imageUrl && (
              <div className="mt-3">
                <img 
                  src={imageUrl}
                  alt="Preview"
                  className="w-full max-w-sm h-48 object-cover rounded-[var(--radius-md)] border border-[var(--surface-variant)]"
                  onError={(e) => {
                    e.currentTarget.src = `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000)}`
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-[var(--on-surface)] mb-2">
              Event Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full px-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] placeholder-[var(--on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
              placeholder="Enter event name"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-[var(--on-surface)] mb-2">
              Event Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="block w-full px-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] placeholder-[var(--on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors resize-none"
              placeholder="Describe your event"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="location" className="block text-sm font-medium text-[var(--on-surface)] mb-2">
              Event Location *
            </label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="block w-full px-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] placeholder-[var(--on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
              placeholder="Enter event location"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="eventType" className="block text-sm font-medium text-[var(--on-surface)] mb-2">
              Event Type *
            </label>
            <select
              id="eventType"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="block w-full px-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
              required
            >
              <option value="">Select event type</option>
              <option value="0">Food & Dining</option>
              <option value="1">Sports</option>
              <option value="2">Events & Entertainment</option>
              <option value="3">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="eventDate" className="block text-sm font-medium text-[var(--on-surface)] mb-2">
                Event Date *
              </label>
              <input
                type="date"
                id="eventDate"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="block w-full px-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="eventTime" className="block text-sm font-medium text-[var(--on-surface)] mb-2">
                Event Time *
              </label>
              <input
                type="time"
                id="eventTime"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="block w-full px-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || isConfirming || isUploading || isWrongNetwork}
            className="w-full btn-primary py-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
            <div className="text-center p-4 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-[var(--radius-md)]">
              <p className="text-[var(--success)] font-medium">Event NFT minted successfully!</p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}