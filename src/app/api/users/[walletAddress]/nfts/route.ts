import { NextRequest, NextResponse } from 'next/server'

// Mock user NFT data for demo purposes
const mockUserNFTs: Record<string, any[]> = {
  '0x1234567890123456789012345678901234567890': [
    {
      id: '1',
      tokenId: '1',
      name: 'Digital Sunrise',
      description: 'A beautiful digital artwork capturing the essence of a perfect sunrise over the mountains.',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      owner: '0x1234567890123456789012345678901234567890',
      creator: '0x1234567890123456789012345678901234567890',
      price: '1000000000000000000', // 1 ETH in wei
      saleId: '1',
      endTime: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
    }
  ],
  '0x2345678901234567890123456789012345678901': [
    {
      id: '2',
      tokenId: '2',
      name: 'Abstract Dreams',
      description: 'An abstract composition exploring the boundaries between reality and imagination.',
      image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      owner: '0x2345678901234567890123456789012345678901',
      creator: '0x2345678901234567890123456789012345678901',
    }
  ],
  '0x3456789012345678901234567890123456789012': [
    {
      id: '3',
      tokenId: '3',
      name: 'Cosmic Journey',
      description: 'A mesmerizing journey through the cosmos, featuring vibrant colors and ethereal forms.',
      image: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      owner: '0x3456789012345678901234567890123456789012',
      creator: '0x3456789012345678901234567890123456789012',
      price: '500000000000000000', // 0.5 ETH in wei
      saleId: '2',
      endTime: Math.floor(Date.now() / 1000) + 172800, // 48 hours from now
    }
  ]
}

export async function GET(
  request: NextRequest,
  { params }: { params: { walletAddress: string } }
) {
  try {
    const walletAddress = params.walletAddress.toLowerCase()
    
    // In production, you would:
    // 1. Query the NFT contract for all tokens owned by this address
    // 2. Get metadata for each token from your database/IPFS
    // 3. Check marketplace contract for any active sales
    // 4. Return the combined data

    const userNFTs = mockUserNFTs[walletAddress] || []

    return NextResponse.json({ nfts: userNFTs })
  } catch (error) {
    console.error('Error fetching user NFTs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user NFTs' },
      { status: 500 }
    )
  }
}