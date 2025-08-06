import { NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import { CONTRACT_ADDRESSES } from '@/lib/config'
import { getValidImageUrl } from '@/lib/imageUtils'
import MARKETPLACE_ABI_FILE from '@/lib/Marketplace.json'
import NFT_ABI_FILE from '@/lib/BaseNFT.json'

const MARKETPLACE_ABI = MARKETPLACE_ABI_FILE.abi
const NFT_ABI = NFT_ABI_FILE.abi

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
})

export async function GET(
  request: Request,
  context: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await context.params
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      )
    }

    // Get the next sale ID to know how many sales exist
    const nextSaleId = await client.readContract({
      address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'nextSaleId',
    }) as bigint

    const totalSales = Number(nextSaleId) - 1
    
    if (totalSales < 1) {
      return NextResponse.json({ claimableAuctions: [] })
    }

    const claimableAuctions = []
    const currentTime = Math.floor(Date.now() / 1000)
    
    for (let saleId = 1; saleId <= totalSales; saleId++) {
      try {
        // Get sale data from marketplace contract
        const sale = await client.readContract({
          address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`,
          abi: MARKETPLACE_ABI,
          functionName: 'getSale',
          args: [BigInt(saleId)],
        }) as any

        // Check if sale is expired and active
        const endTime = Number(sale.endTime)
        const isExpired = endTime <= currentTime
        
        // Debug logging
        console.log(`Sale ${saleId}: endTime=${endTime}, currentTime=${currentTime}, isExpired=${isExpired}, active=${sale.active}`)
        
        if (sale.active && isExpired) {
          // Check if user can claim this auction
          const userAddress = address.toLowerCase()
          const seller = sale.seller.toLowerCase()
          const currentBidder = sale.currentBidder.toLowerCase()
          
          // Check for no bids more robustly
          const currentBidAmount = BigInt(sale.currentBidUsd)
          const hasNoBids = currentBidAmount === 0n || sale.currentBidder === '0x0000000000000000000000000000000000000000'
          
          // User can claim if:
          // 1. They are the seller and there are no bids
          // 2. They are the highest bidder and there are bids
          const canClaim = (userAddress === seller && hasNoBids) || 
                          (userAddress === currentBidder && !hasNoBids)
          
          console.log(`Sale ${saleId}: userAddress=${userAddress}, seller=${seller}, currentBidder=${currentBidder}, hasNoBids=${hasNoBids}, canClaim=${canClaim}`)
          
          if (canClaim) {
            // Get NFT data
            const nftData = await client.readContract({
              address: CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`,
              abi: NFT_ABI,
              functionName: 'getNFTData',
              args: [sale.tokenId],
            }) as any

            // Validate and sanitize image URL
            const imageUrl = getValidImageUrl(nftData[0])
            
            // Helper function to convert event type to string
            const getEventTypeString = (eventType: number): string => {
              switch (eventType) {
                case 0: return 'food'
                case 1: return 'sports'
                case 2: return 'events'
                case 3: return 'other'
                default: return 'other'
              }
            }

            claimableAuctions.push({
              saleId,
              sale: {
                seller: sale.seller,
                tokenId: sale.tokenId.toString(),
                listPriceUsd: sale.listPriceUsd.toString(),
                buyNowPriceUsd: sale.buyNowPriceUsd.toString(),
                currentBidUsd: sale.currentBidUsd.toString(),
                currentBidder: sale.currentBidder,
                endTime: sale.endTime.toString(),
                active: sale.active,
              },
              nftData: {
                picture: imageUrl,
                location: nftData[1],
                datetime: nftData[2].toString(),
                consumed: nftData[3],
                originalOwner: nftData[4],
                currentOwner: sale.seller,
                eventName: `Event at ${nftData[1]}`,
                eventType: getEventTypeString(Number(nftData[6])),
              },
              claimType: hasNoBids ? 'reclaim' : 'claim'
            })
          }
        }
      } catch (error) {
        console.error(`Error fetching sale ${saleId}:`, error)
        // Continue with next sale if this one fails
      }
    }

    return NextResponse.json({ claimableAuctions })
  } catch (error) {
    console.error('Error fetching claimable auctions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch claimable auctions' },
      { status: 500 }
    )
  }
}