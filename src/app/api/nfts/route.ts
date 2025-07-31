import { NextResponse } from 'next/server'
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
      { "internalType": "address", "name": "originalOwner", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

async function fetchNFTFromBlockchain(tokenId: number) {
  try {
    const contractAddress = CONTRACT_ADDRESSES[baseSepolia.id].nft as `0x${string}`
    
    // Fetch NFT data and owner in parallel
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

    const [picture, location, datetime, consumed, originalOwner] = nftData
    
    // Validate and sanitize image URL
    const imageUrl = getValidImageUrl(picture)
    
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
    }
  } catch (error) {
    console.error(`Error fetching NFT ${tokenId}:`, error)
    return null
  }
}

export async function GET() {
  try {
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

    // Fetch all NFTs (token IDs start from 1)
    const nftPromises = []
    for (let i = 1; i <= Number(totalSupply); i++) {
      nftPromises.push(fetchNFTFromBlockchain(i))
    }

    const nfts = await Promise.all(nftPromises)
    
    // Filter out any failed fetches and return valid NFTs
    const validNFTs = nfts.filter(nft => nft !== null)

    return NextResponse.json({ nfts: validNFTs })
  } catch (error) {
    console.error('Error fetching NFTs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch NFTs from blockchain' },
      { status: 500 }
    )
  }
}