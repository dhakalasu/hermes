import { NextRequest, NextResponse } from 'next/server'

// Mock NFT data for demo purposes
const mockNFTsData: Record<string, any> = {
  '1': {
    id: '1',
    tokenId: '1',
    name: 'Digital Sunrise',
    description: 'A beautiful digital artwork capturing the essence of a perfect sunrise over the mountains. This piece represents hope, new beginnings, and the endless possibilities that each day brings.',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    owner: '0x1234567890123456789012345678901234567890',
    creator: '0x1234567890123456789012345678901234567890',
    royalty: 250, // 2.5%
    sale: {
      id: '1',
      startingPrice: '500000000000000000', // 0.5 ETH
      buyNowPrice: '1000000000000000000', // 1 ETH
      currentBid: '750000000000000000', // 0.75 ETH
      currentBidder: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      endTime: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
      active: true
    }
  },
  '2': {
    id: '2',
    tokenId: '2',
    name: 'Abstract Dreams',
    description: 'An abstract composition exploring the boundaries between reality and imagination. This artwork invites viewers to lose themselves in a world of vibrant colors and flowing forms.',
    image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    owner: '0x2345678901234567890123456789012345678901',
    creator: '0x2345678901234567890123456789012345678901',
    royalty: 500, // 5%
  },
  '3': {
    id: '3',
    tokenId: '3',
    name: 'Cosmic Journey',
    description: 'A mesmerizing journey through the cosmos, featuring vibrant colors and ethereal forms. This piece captures the wonder and mystery of space exploration.',
    image: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    owner: '0x3456789012345678901234567890123456789012',
    creator: '0x3456789012345678901234567890123456789012',
    royalty: 300, // 3%
    sale: {
      id: '2',
      startingPrice: '200000000000000000', // 0.2 ETH
      buyNowPrice: '500000000000000000', // 0.5 ETH
      currentBid: '0',
      currentBidder: '0x0000000000000000000000000000000000000000',
      endTime: Math.floor(Date.now() / 1000) + 172800, // 48 hours from now
      active: true
    }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const tokenId = params.tokenId
    
    // In production, you would:
    // 1. Query your database for NFT metadata by tokenId
    // 2. Check blockchain for current ownership
    // 3. Check marketplace contract for active sales
    // 4. Combine the data and return it
    
    const nft = mockNFTsData[tokenId]
    
    if (!nft) {
      return NextResponse.json(
        { error: 'NFT not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(nft)
  } catch (error) {
    console.error('Error fetching NFT:', error)
    return NextResponse.json(
      { error: 'Failed to fetch NFT' },
      { status: 500 }
    )
  }
}