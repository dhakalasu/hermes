'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { Header } from '@/components/Header'
import { NFTCard } from '@/components/NFTCard'
import { CONTRACT_ADDRESSES } from '@/lib/config'
import { baseSepolia } from 'viem/chains'
import MARKETPLACE_ABI from '@/lib/Marketplace.json'

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

interface ClaimableAuction {
  saleId: number
  sale: {
    seller: string
    tokenId: string
    listPriceUsd: string
    buyNowPriceUsd: string
    currentBidUsd: string
    currentBidder: string
    endTime: string
    active: boolean
  }
  nftData: {
    picture: string
    location: string
    datetime: string
    consumed: boolean
    originalOwner: string
    currentOwner: string
  }
  claimType: 'reclaim' | 'claim'
}

export default function MyNFTsPage() {
  const { address, isConnected, chain } = useAccount()
  const [nfts, setNfts] = useState<NFT[]>([])
  const [loading, setLoading] = useState(true)
  const [claimableAuctions, setClaimableAuctions] = useState<ClaimableAuction[]>([])
  const [loadingClaimable, setLoadingClaimable] = useState(true)
  const [claimingAuction, setClaimingAuction] = useState<number | null>(null)

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })
  const { switchChain } = useSwitchChain()

  useEffect(() => {
    if (isConnected && address) {
      fetchMyNFTs()
      fetchClaimableAuctions()
    } else {
      setLoading(false)
      setLoadingClaimable(false)
    }
  }, [isConnected, address])

  useEffect(() => {
    if (isSuccess) {
      // Refresh both lists after successful transaction
      fetchMyNFTs()
      fetchClaimableAuctions()
      setClaimingAuction(null)
    }
  }, [isSuccess])

  const fetchMyNFTs = async () => {
    if (!address) return
    
    try {
      const response = await fetch(`/api/users/${address}/nfts`)
      if (response.ok) {
        const data = await response.json()
        setNfts(data.nfts || [])
      }
    } catch (error) {
      console.error('Error fetching my NFTs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClaimableAuctions = async () => {
    if (!address) return
    
    try {
      const response = await fetch(`/api/marketplace/claimable/${address}`)
      if (response.ok) {
        const data = await response.json()
        setClaimableAuctions(data.claimableAuctions || [])
      }
    } catch (error) {
      console.error('Error fetching claimable auctions:', error)
    } finally {
      setLoadingClaimable(false)
    }
  }

  const handleClaimAuction = async (saleId: number, claimType: 'reclaim' | 'claim') => {
    if (!isConnected || !address) {
      alert('Please connect your wallet')
      return
    }

    // Check if user is on the correct network
    if (chain?.id !== baseSepolia.id) {
      try {
        await switchChain({ chainId: baseSepolia.id })
      } catch (error) {
        console.error('Failed to switch network:', error)
        alert('Please switch to Base Sepolia network to claim NFTs')
        return
      }
    }

    setClaimingAuction(saleId)
    
    try {
      // Use finalizeSale for claiming winning bid, cancelSale for reclaiming with no bids
      const functionName = claimType === 'claim' ? 'finalizeSale' : 'cancelSale'
      
      writeContract({
        address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`,
        abi: MARKETPLACE_ABI,
        functionName,
        args: [BigInt(saleId)],
      })
    } catch (error) {
      console.error('Error claiming auction:', error)
      setClaimingAuction(null)
      alert('Failed to claim auction')
    }
  }

  const formatUsdPrice = (priceUsd: string) => {
    const price = BigInt(priceUsd)
    return `$${(Number(price) / 100000000).toFixed(2)}`
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[var(--surface)]">
        <Header />
        <div className="max-w-2xl mx-auto pt-16 px-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-[var(--on-surface)] mb-4">My NFTs</h1>
            <p className="text-[var(--on-surface-variant)]">Please connect your wallet to view your NFTs</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Header />
      
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-12 space-y-2">
          <h1 className="text-4xl font-bold text-[var(--on-surface)]">My NFTs</h1>
          <p className="text-[var(--on-surface-variant)] text-lg">
            Manage your digital collectibles and list them for sale
          </p>
        </div>

        {/* Claimable Auctions Section */}
        {!loadingClaimable && claimableAuctions.length > 0 && (
          <div className="mb-12">
            <div className="mb-6 space-y-2">
              <h2 className="text-2xl font-bold text-[var(--on-surface)]">Claimable Auctions</h2>
              <p className="text-[var(--on-surface-variant)]">Expired auctions you can claim or reclaim</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {claimableAuctions.map((auction) => (
                <div key={auction.saleId} className="card">
                  <div className="aspect-square relative mb-4 overflow-hidden rounded-[var(--radius-md)]">
                    <img
                      src={auction.nftData.picture || '/placeholder-image.png'}
                      alt={`NFT #${auction.sale.tokenId}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-image.png'
                      }}
                    />
                    <div className="absolute top-3 right-3 bg-[var(--warning)] text-white px-3 py-1 rounded-full text-xs font-medium">
                      {auction.claimType === 'claim' ? 'Won' : 'Expired'}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg text-[var(--on-surface)] mb-1">
                        NFT #{auction.sale.tokenId}
                      </h3>
                      <p className="text-[var(--on-surface-variant)] text-sm">
                        {auction.nftData.location || 'Unknown location'}
                      </p>
                    </div>
                    
                    <div className="text-sm">
                      {auction.claimType === 'claim' ? (
                        <div>
                          <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">Winning Bid</span>
                          <div className="font-bold text-lg text-[var(--success)]">
                            {formatUsdPrice(auction.sale.currentBidUsd)}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[var(--on-surface-variant)] text-xs uppercase tracking-wide">No Bids Received</span>
                          <div className="font-bold text-lg text-[var(--on-surface-variant)]">
                            Starting: {formatUsdPrice(auction.sale.listPriceUsd)}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleClaimAuction(auction.saleId, auction.claimType)}
                      disabled={isPending || isConfirming || claimingAuction === auction.saleId}
                      className="w-full btn-primary py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {claimingAuction === auction.saleId
                        ? (isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Claiming...')
                        : auction.claimType === 'claim'
                        ? 'Claim NFT'
                        : 'Reclaim NFT'
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Owned NFTs Section */}
        <div className="mb-8 space-y-2">
          <h2 className="text-2xl font-bold text-[var(--on-surface)]">Owned NFTs</h2>
          <p className="text-[var(--on-surface-variant)]">
            NFTs you currently own and can list for sale
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--surface-variant)] border-t-[var(--primary)]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 bg-[var(--primary)] rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        ) : nfts.length === 0 && claimableAuctions.length === 0 ? (
          <div className="text-center py-24">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-16 h-16 bg-[var(--surface-container)] rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-[var(--on-surface-variant)]"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-[var(--on-surface)]">No NFTs found</h3>
                <p className="text-[var(--on-surface-variant)]">
                  You don&apos;t own any NFTs yet and have no claimable auctions. Create your first NFT!
                </p>
              </div>
              <a
                href="/mint"
                className="btn-primary inline-block"
              >
                Create NFT
              </a>
            </div>
          </div>
        ) : nfts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--on-surface-variant)]">No owned NFTs to display</p>
            <a
              href="/mint"
              className="btn-primary inline-block mt-4"
            >
              Create NFT
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {nfts.map((nft) => (
              <NFTCard key={nft.id} nft={nft} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}