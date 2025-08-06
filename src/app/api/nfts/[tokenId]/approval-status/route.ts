import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import { CONTRACT_ADDRESSES } from '@/lib/config'
import BASE_NFT_ABI_FILE from '@/lib/BaseNFT.json'

const BASE_NFT_ABI = BASE_NFT_ABI_FILE.abi

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await context.params
    const url = new URL(request.url)
    const owner = url.searchParams.get('owner')
    const marketplace = url.searchParams.get('marketplace')
    
    if (!owner || !marketplace) {
      return NextResponse.json(
        { error: 'Missing owner or marketplace address' },
        { status: 400 }
      )
    }

    const tokenIdNum = parseInt(tokenId)
    if (isNaN(tokenIdNum) || tokenIdNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid token ID' },
        { status: 400 }
      )
    }

    console.log('Checking approval for:', {
      contract: CONTRACT_ADDRESSES[baseSepolia.id].nft,
      tokenId: tokenIdNum,
      marketplace
    })

    // Check if the marketplace is approved for this specific token
    const approvedAddress = await publicClient.readContract({
      address: CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`,
      abi: BASE_NFT_ABI,
      functionName: 'getApproved',
      args: [BigInt(tokenIdNum)],
    }) as string

    console.log('Approved address:', approvedAddress)

    const isApproved = approvedAddress.toLowerCase() === marketplace.toLowerCase()

    console.log('Is approved:', isApproved)

    return NextResponse.json({ isApproved })
  } catch (error) {
    console.error('Error checking approval status:', error)
    return NextResponse.json(
      { error: 'Failed to check approval status' },
      { status: 500 }
    )
  }
}