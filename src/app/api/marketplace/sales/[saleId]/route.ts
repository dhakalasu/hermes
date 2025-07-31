import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import { CONTRACT_ADDRESSES } from '@/lib/config'
import MARKETPLACE_ABI from '@/lib/Marketplace.json'
import NFT_ABI from '@/lib/BaseNFT.json'

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
) {
  try {
    const { saleId: saleIdParam } = await params
    const saleId = parseInt(saleIdParam)
    
    if (isNaN(saleId) || saleId < 1) {
      return NextResponse.json({ error: 'Invalid sale ID' }, { status: 400 })
    }

    // Get sale data from marketplace contract
    const sale = await client.readContract({
      address: CONTRACT_ADDRESSES[baseSepolia.id].marketplace as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'getSale',
      args: [BigInt(saleId)],
    }) as any

    if (!sale.active) {
      return NextResponse.json({ error: 'Sale not active' }, { status: 404 })
    }

    // Get NFT data
    const nftData = await client.readContract({
      address: CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`,
      abi: NFT_ABI,
      functionName: 'getNFTData',
      args: [sale.tokenId],
    }) as any

    return NextResponse.json({
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
        picture: nftData[0],
        location: nftData[1],
        datetime: nftData[2].toString(),
        consumed: nftData[3],
        originalOwner: nftData[4],
        currentOwner: nftData[5],
      }
    })
  } catch (error) {
    console.error('Error fetching sale:', error)
    return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
  }
}