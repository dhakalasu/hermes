import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import { CONTRACT_ADDRESSES } from '@/lib/config'
import { getValidImageUrl } from '@/lib/imageUtils'

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
})

const NFT_ABI = [
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
    "name": "ownerOf",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
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
  }
] as const

import MARKETPLACE_ABI from '@/lib/Marketplace.json'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await context.params
    const contractAddress = CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`
    
    // Validate token ID
    const tokenIdNum = parseInt(tokenId)
    if (isNaN(tokenIdNum) || tokenIdNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid token ID' },
        { status: 400 }
      )
    }
    
    try {
      // Fetch NFT data and owner from blockchain
      const [nftData, owner] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: NFT_ABI,
          functionName: 'getNFTData',
          args: [BigInt(tokenIdNum)],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: NFT_ABI,
          functionName: 'ownerOf',
          args: [BigInt(tokenIdNum)],
        }),
      ])

      const [picture, location, datetime, consumed, originalOwner, currentOwner, eventType] = nftData
      
      // Validate and sanitize image URL
      const imageUrl = getValidImageUrl(picture)
      
      // Get event type string
      const getEventTypeString = (eventType: number): string => {
        switch (eventType) {
          case 0: return 'food'
          case 1: return 'sports'
          case 2: return 'events'
          case 3: return 'other'
          default: return 'other'
        }
      }

      // Fetch marketplace data to check if this NFT is currently for sale
      let saleData = null
      try {
        const marketplaceAddress = CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`
        
        // Get the next sale ID to know how many sales exist (same as marketplace API)
        const nextSaleId = await publicClient.readContract({
          address: marketplaceAddress,
          abi: MARKETPLACE_ABI,
          functionName: 'nextSaleId',
        }) as bigint

        const totalSales = Number(nextSaleId) - 1 // nextSaleId is the next ID to be used

        // Look for active sale for this token ID
        for (let saleId = 1; saleId <= totalSales; saleId++) {
          try {
            const sale = await publicClient.readContract({
              address: marketplaceAddress,
              abi: MARKETPLACE_ABI,
              functionName: 'getSale',
              args: [BigInt(saleId)],
            }) as any

            // Check if this sale is for our token ID and is still active
            if (Number(sale.tokenId) === tokenIdNum && sale.active) {
              saleData = {
                id: saleId.toString(),
                startingPrice: sale.listPriceUsd.toString(),
                buyNowPrice: sale.buyNowPriceUsd.toString(),
                currentBid: sale.currentBidUsd.toString(),
                currentBidder: sale.currentBidder.toLowerCase(),
                endTime: Number(sale.endTime),
                active: sale.active,
              }
              break
            }
          } catch (saleError) {
            // Skip invalid sales
            continue
          }
        }
      } catch (marketplaceError) {
        console.warn('Could not fetch marketplace data:', marketplaceError)
        // Continue without sale data
      }
      
      const nft = {
        id: tokenId,
        tokenId: tokenId,
        name: `Event at ${location}`,
        description: `Event ticket for ${location} - ${new Date(Number(datetime) * 1000).toLocaleDateString()}`,
        image: imageUrl,
        owner: owner.toLowerCase(),
        creator: originalOwner.toLowerCase(),
        consumed,
        location,
        datetime: Number(datetime),
        eventType: getEventTypeString(Number(eventType)),
        sale: saleData, // Include sale data if available
      }

      return NextResponse.json(nft)
    } catch (contractError: unknown) {
      // If contract call fails, token likely doesn't exist
      if (contractError.message?.includes('Token does not exist')) {
        return NextResponse.json(
          { error: 'NFT not found' },
          { status: 404 }
        )
      }
      throw contractError
    }
  } catch (error) {
    console.error('Error fetching NFT:', error)
    return NextResponse.json(
      { error: 'Failed to fetch NFT from blockchain' },
      { status: 500 }
    )
  }
}