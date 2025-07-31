'use client'

import Image from 'next/image'
import Link from 'next/link'
import { formatEther } from 'viem'

interface NFT {
  id: string
  tokenId: string
  name: string
  description: string
  image: string
  owner: string
  creator: string
  price?: string
  saleId?: string
  endTime?: number
}

interface NFTCardProps {
  nft: NFT
}

export function NFTCard({ nft }: NFTCardProps) {
  const isOnSale = nft.saleId && nft.endTime && Date.now() < nft.endTime * 1000
  const timeLeft = nft.endTime ? Math.max(0, nft.endTime * 1000 - Date.now()) : 0
  
  const formatTimeLeft = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <Link href={`/nft/${nft.tokenId}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
        <div className="aspect-square relative">
          <Image
            src={nft.image}
            alt={nft.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
          {isOnSale && (
            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">
              On Sale
            </div>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-lg text-gray-900 mb-2 truncate">
            {nft.name}
          </h3>
          
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {nft.description}
          </p>
          
          <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
            <div>
              <span className="block">Creator</span>
              <span className="font-medium text-gray-900">
                {nft.creator.slice(0, 6)}...{nft.creator.slice(-4)}
              </span>
            </div>
            <div>
              <span className="block">Owner</span>
              <span className="font-medium text-gray-900">
                {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}
              </span>
            </div>
          </div>
          
          {isOnSale && nft.price && (
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-500">Current Price</span>
                  <div className="font-bold text-lg">
                    {formatEther(BigInt(nft.price))} ETH
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-500">Time Left</span>
                  <div className="font-medium text-sm text-red-600">
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