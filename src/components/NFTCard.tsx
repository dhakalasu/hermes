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
      <div className="card group cursor-pointer overflow-hidden">
        <div className="aspect-square relative mb-4 overflow-hidden rounded-[var(--radius-md)]">
          <Image
            src={nft.image}
            alt={nft.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
          {isOnSale && (
            <div className="absolute top-3 right-3 bg-[var(--success)] text-white px-3 py-1 rounded-full text-xs font-medium">
              Live
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg text-[var(--on-surface)] mb-1 truncate">
              {nft.name}
            </h3>
            
            <p className="text-[var(--on-surface-variant)] text-sm line-clamp-2 leading-relaxed">
              {nft.description}
            </p>
          </div>
          
          <div className="flex justify-between items-start text-sm">
            <div className="space-y-1">
              <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Creator</span>
              <div className="font-mono text-[var(--on-surface)] text-xs">
                {nft.creator.slice(0, 6)}...{nft.creator.slice(-4)}
              </div>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Owner</span>
              <div className="font-mono text-[var(--on-surface)] text-xs">
                {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}
              </div>
            </div>
          </div>
          
          {isOnSale && nft.price && (
            <div className="pt-4 border-t border-[var(--surface-variant)]">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-xs text-[var(--on-surface-variant)] uppercase tracking-wide">Current Price</span>
                  <div className="font-bold text-xl text-[var(--on-surface)] mt-1">
                    {formatEther(BigInt(nft.price))} ETH
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