import { NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import { CONTRACT_ADDRESSES } from '@/lib/config'
import { getValidImageUrl } from '@/lib/imageUtils'
import MARKETPLACE_ABI from '@/lib/Marketplace.json'
import NFT_ABI from '@/lib/BaseNFT.json'

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
})

export async function GET() {
  try {
    // Get the next sale ID to know how many sales exist
    const nextSaleId = await client.readContract({
      address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'nextSaleId',
    }) as bigint

    const totalSales = Number(nextSaleId) - 1 // nextSaleId is the next ID to be used
    
    if (totalSales < 1) {
      return NextResponse.json({ sales: [] })
    }

    // Fetch all sales and filter active ones
    const activeSales = []
    
    for (let saleId = 1; saleId <= totalSales; saleId++) {
      try {
        // Get sale data from marketplace contract
        const sale = await client.readContract({
          address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`,
          abi: MARKETPLACE_ABI,
          functionName: 'getSale',
          args: [BigInt(saleId)],
        }) as any

        // Only include active sales
        if (sale.active) {
          // Get NFT data
          const nftData = await client.readContract({
            address: CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`,
            abi: NFT_ABI,
            functionName: 'getNFTData',
            args: [sale.tokenId],
          }) as any

          // Validate and sanitize image URL
          const imageUrl = getValidImageUrl(nftData[0])

          activeSales.push({
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
              currentOwner: sale.seller, // Current owner is the seller
            }
          })
        }
      } catch (error) {
        console.error(`Error fetching sale ${saleId}:`, error)
        // Continue with next sale if this one fails
      }
    }

    return NextResponse.json({ sales: activeSales })
  } catch (error) {
    console.error('Error fetching active sales:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active sales' },
      { status: 500 }
    )
  }
}