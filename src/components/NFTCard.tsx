'use client'

import Link from 'next/link'
import Image from 'next/image'
import { formatEther } from 'viem'
import { UsdPrice } from './UsdPrice'

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
  eventType: string
  price?: string
  saleId?: string
  endTime?: number
}

type EventType = 'sports' | 'music' | 'food' | 'others'

// Function to get event type directly from NFT data
const getEventType = (nft: NFT): EventType => {
  return nft.eventType as EventType || 'others'
}

const getEventTypeEmoji = (eventType: EventType): string => {
  switch (eventType) {
    case 'sports': return '⚽'
    case 'music': return '🎵'
    case 'food': return '🍽️'
    case 'others': return '✨'
  }
}

interface NFTCardProps {
  nft: NFT
}

export function NFTCard({ nft }: NFTCardProps) {
  const isOnSale = nft.saleId && nft.endTime && Date.now() < nft.endTime * 1000
  const eventType = getEventType(nft)
  const eventEmoji = getEventTypeEmoji(eventType)
  
  const formatTimeLeft = (timeLeft: number) => {
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h`
    return '<1h'
  }

  const timeLeft = isOnSale && nft.endTime ? nft.endTime * 1000 - Date.now() : 0

  return (
    <Link href={`/nft/${nft.tokenId}`} className="block">
      <div className="card group hover:scale-[1.02] transition-all duration-200 hover:shadow-lg">
        <div className="relative">
          <div className="aspect-square w-full rounded-[var(--radius-md)] overflow-hidden bg-[var(--surface-container)]">
            <Image
              src={nft.image}
              alt={nft.name}
              width={400}
              height={400}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // e.currentTarget.src = '/placeholder-image.png'
              }}
            />
          </div>
          
          {nft.consumed && (
            <div className="absolute top-3 right-3 px-3 py-1 bg-[var(--error)] text-[var(--on-error)] text-xs font-medium rounded-full">
              Used
            </div>
          )}
          
          {/* Event Type Badge */}
          <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 text-white text-xs font-medium rounded-full flex items-center space-x-1">
            <span>{eventEmoji}</span>
            <span className="capitalize">{eventType}</span>
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-[var(--on-surface)] text-lg leading-tight line-clamp-1">
              {nft.name}
            </h3>
            <p className="text-[var(--on-surface-variant)] text-sm mt-1 line-clamp-2">
              {nft.description}
            </p>
          </div>

          <div className="flex justify-between items-start text-xs">
            <div>
              <span className="text-[var(--on-surface-variant)] uppercase tracking-wide">Location</span>
              <div className="font-medium text-[var(--on-surface)] mt-0.5">
                {nft.location}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[var(--on-surface-variant)] uppercase tracking-wide">Date</span>
              <div className="font-medium text-[var(--on-surface)] mt-0.5">
                {new Date(nft.datetime * 1000).toLocaleDateString()}
              </div>
            </div>
          </div>
          
          {isOnSale && nft.price && (
            <div className="pt-4 border-t border-[var(--surface-variant)]">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-xs text-[var(--on-surface-variant)] uppercase tracking-wide">Current Price</span>
                  <div className="font-bold text-xl text-[var(--on-surface)] mt-1">
                    <UsdPrice 
                      weiAmount={BigInt(nft.price)} 
                      className="text-xl font-bold text-[var(--on-surface)]"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[var(--on-surface-variant)] uppercase tracking-wide">Time Left</span>
                  <div className="font-medium text-sm text-[var(--error)] mt-1">
                    {formatTimeLeft(timeLeft)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}