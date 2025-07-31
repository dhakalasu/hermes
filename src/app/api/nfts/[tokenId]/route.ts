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
      { "internalType": "address", "name": "originalOwner", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const tokenId = params.tokenId
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

      const [picture, location, datetime, consumed, originalOwner] = nftData
      
      // Validate and sanitize image URL
      const imageUrl = getValidImageUrl(picture)
      
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