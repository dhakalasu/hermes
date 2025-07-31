'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { Header } from '@/components/Header'
import { NFTCard } from '@/components/NFTCard'
import { CONTRACT_ADDRESSES } from '@/lib/config'
import { baseSepolia } from 'viem/chains'
import MARKETPLACE_ABI from '@/lib/Marketplace.json'
import NFT_ABI from '@/lib/BaseNFT.json'

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
  price?: string
  saleId?: string
  endTime?: number
}

export default function MyNFTsPage() {
  const { address, isConnected } = useAccount()
  const [nfts, setNfts] = useState<NFT[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null)
  const [listPriceUsd, setListPriceUsd] = useState<string>('')
  const [buyNowPriceUsd, setBuyNowPriceUsd] = useState<string>('')
  const [duration, setDuration] = useState<string>('86400')
  const [isApproving, setIsApproving] = useState(false)
  const [needsApproval, setNeedsApproval] = useState(false)
  const [showListingModal, setShowListingModal] = useState(false)

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Check if marketplace is approved for the selected NFT
  const { data: approvedAddress } = useReadContract({
    address: CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`,
    abi: NFT_ABI,
    functionName: 'getApproved',
    args: selectedNFT ? [BigInt(selectedNFT.tokenId)] : undefined,
    query: {
      enabled: !!selectedNFT,
    },
  })

  useEffect(() => {
    if (selectedNFT && approvedAddress !== undefined) {
      const marketplaceAddress = CONTRACT_ADDRESSES[baseSepolia.id].marketplace.toLowerCase()
      const approved = (approvedAddress as string).toLowerCase()
      setNeedsApproval(approved !== marketplaceAddress)
    }
  }, [selectedNFT, approvedAddress])

  useEffect(() => {
    if (isSuccess) {
      setSelectedNFT(null)
      setListPriceUsd('')
      setBuyNowPriceUsd('')
      setIsApproving(false)
      setNeedsApproval(false)
      setShowListingModal(false)
      fetchMyNFTs() // Refresh the list
    }
  }, [isSuccess])

  useEffect(() => {
    if (isConnected && address) {
      fetchMyNFTs()
    } else {
      setLoading(false)
    }
  }, [isConnected, address])

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

  const handleListNFT = (nft: NFT) => {
    setSelectedNFT(nft)
    setShowListingModal(true)
  }

  const handleApprove = async () => {
    if (!selectedNFT) return
    
    setIsApproving(true)
    try {
      writeContract({
        address: CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`,
        abi: NFT_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES[baseSepolia.id].marketplace, BigInt(selectedNFT.tokenId)],
      })
    } catch (error) {
      console.error('Error approving:', error)
      setIsApproving(false)
    }
  }

  const handleSubmitListing = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedNFT || !listPriceUsd || !buyNowPriceUsd || !duration) {
      alert('Please fill all fields')
      return
    }

    if (needsApproval) {
      alert('Please approve the marketplace to transfer your NFT first')
      return
    }

    // Convert USD to 8 decimals (e.g., $50.00 -> 5000000000)
    const listPriceUsdBigInt = BigInt(Math.floor(parseFloat(listPriceUsd) * 100000000))
    const buyNowPriceUsdBigInt = BigInt(Math.floor(parseFloat(buyNowPriceUsd) * 100000000))
    const durationBigInt = BigInt(duration)

    writeContract({
      address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'listNFT',
      args: [BigInt(selectedNFT.tokenId), listPriceUsdBigInt, buyNowPriceUsdBigInt, durationBigInt],
    })
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

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--surface-variant)] border-t-[var(--primary)]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 bg-[var(--primary)] rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        ) : nfts.length === 0 ? (
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
                  You don&apos;t own any NFTs yet. Create your first one!
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {nfts.map((nft) => (
              <div key={nft.id} className="relative">
                <NFTCard nft={nft} />
                {!nft.consumed && (
                  <button
                    onClick={() => handleListNFT(nft)}
                    className="absolute top-4 left-4 bg-[var(--primary)] text-[var(--on-primary)] px-3 py-1 rounded-full text-xs font-medium hover:bg-[var(--primary)]/90 transition-colors z-10"
                  >
                    List for Sale
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Listing Modal */}
        {showListingModal && selectedNFT && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-[var(--on-surface)] mb-4">
                List NFT #{selectedNFT.tokenId}
              </h3>
              
              <form onSubmit={handleSubmitListing} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--on-surface)] mb-2">
                    Starting Price (USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={listPriceUsd}
                    onChange={(e) => setListPriceUsd(e.target.value)}
                    className="block w-full px-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] placeholder-[var(--on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
                    placeholder="50.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--on-surface)] mb-2">
                    Buy Now Price (USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={buyNowPriceUsd}
                    onChange={(e) => setBuyNowPriceUsd(e.target.value)}
                    className="block w-full px-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] placeholder-[var(--on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
                    placeholder="100.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--on-surface)] mb-2">
                    Duration *
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="block w-full px-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors"
                  >
                    <option value="3600">1 hour</option>
                    <option value="86400">24 hours</option>
                    <option value="259200">3 days</option>
                    <option value="604800">7 days</option>
                  </select>
                </div>

                {needsApproval && (
                  <div className="space-y-3">
                    <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-[var(--radius-md)] p-4">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-[var(--warning)]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-[var(--warning)] font-medium">
                          Approval Required
                        </p>
                      </div>
                      <p className="text-xs text-[var(--on-surface-variant)] mt-1">
                        You need to approve the marketplace to transfer your NFT before listing it.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={isApproving || isPending || isConfirming}
                      className="w-full bg-[var(--warning)] text-white py-3 rounded-[var(--radius-sm)] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--warning)]/90 transition-colors"
                    >
                      {isApproving ? 'Approving...' : 'Approve Marketplace'}
                    </button>
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowListingModal(false)}
                    className="flex-1 py-3 px-4 border border-[var(--surface-variant)] rounded-[var(--radius-sm)] text-[var(--on-surface)] hover:bg-[var(--surface-variant)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || isConfirming || needsApproval}
                    className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? 'Confirming...' : isConfirming ? 'Listing...' : 'List NFT'}
                  </button>
                </div>

                {isSuccess && (
                  <div className="text-center p-4 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-[var(--radius-md)]">
                    <p className="text-[var(--success)] font-medium">NFT listed successfully!</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}