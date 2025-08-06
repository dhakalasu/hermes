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
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
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

async function fetchNFTData(tokenId: number) {
  try {
    const contractAddress = CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`
    
    const [nftData, owner] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: NFT_ABI,
        functionName: 'getNFTData',
        args: [BigInt(tokenId)],
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: NFT_ABI,
        functionName: 'ownerOf',
        args: [BigInt(tokenId)],
      }),
    ])

    const [picture, location, datetime, consumed, originalOwner, currentOwner, eventType] = nftData
    
    // Validate and sanitize image URL
    const imageUrl = getValidImageUrl(picture)
    
    const getEventTypeString = (eventType: number): string => {
      switch (eventType) {
        case 0: return 'food'
        case 1: return 'sports'
        case 2: return 'events'
        case 3: return 'other'
        default: return 'other'
      }
    }

    const eventTypeString = getEventTypeString(Number(eventType))
    
    return {
      id: tokenId.toString(),
      tokenId: tokenId.toString(),
      name: `Event at ${location}`,
      description: `Event ticket for ${location} - ${new Date(Number(datetime) * 1000).toLocaleDateString()}`,
      image: imageUrl,
      owner: owner.toLowerCase(),
      creator: originalOwner.toLowerCase(),
      consumed,
      location,
      datetime: Number(datetime),
      eventType: eventTypeString,
    }
  } catch (error) {
    console.error(`Error fetching NFT ${tokenId}:`, error)
    return null
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ walletAddress: string }> }
) {
  try {
    const { walletAddress } = await context.params
    const address = walletAddress.toLowerCase()
    const contractAddress = CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`
    
    // Get total supply of NFTs
    const totalSupply = await publicClient.readContract({
      address: contractAddress,
      abi: NFT_ABI,
      functionName: 'totalSupply',
    })

    if (totalSupply === 0n) {
      return NextResponse.json({ nfts: [] })
    }

    // Check original ownership for each NFT and fetch data for originally owned ones
    const originalOwnerNFTs = []
    
    for (let tokenId = 1; tokenId <= Number(totalSupply); tokenId++) {
      try {
        // Get NFT data to check original owner
        const nftData = await publicClient.readContract({
          address: contractAddress,
          abi: NFT_ABI,
          functionName: 'getNFTData',
          args: [BigInt(tokenId)],
        })
        
        const [, , , , originalOwner] = nftData
        
        if (originalOwner.toLowerCase() === address) {
          const fullNftData = await fetchNFTData(tokenId)
          if (fullNftData) {
            originalOwnerNFTs.push(fullNftData)
          }
        }
      } catch (error) {
        // Skip tokens that don't exist or have errors
        continue
      }
    }

    return NextResponse.json({ nfts: originalOwnerNFTs })
  } catch (error) {
    console.error('Error fetching original owner NFTs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch original owner NFTs from blockchain' },
      { status: 500 }
    )
  }
}