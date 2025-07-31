import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory storage for demo (in production, use IPFS/database)
const metadataStore = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    const name = formData.get('name') as string
    const description = formData.get('description') as string

    if (!image || !name) {
      return NextResponse.json(
        { error: 'Image and name are required' },
        { status: 400 }
      )
    }

    // In a real app, you would upload to IPFS here
    // For demo purposes, we'll create a mock IPFS hash
    const imageHash = `Qm${Math.random().toString(36).substring(2, 15)}`
    const metadataHash = `Qm${Math.random().toString(36).substring(2, 15)}`
    
    const metadata = {
      name,
      description,
      image: `https://ipfs.io/ipfs/${imageHash}`,
      attributes: []
    }
    
    // Store metadata (in production, this would be stored on IPFS)
    metadataStore.set(metadataHash, metadata)
    
    const tokenURI = `https://ipfs.io/ipfs/${metadataHash}`
    
    return NextResponse.json({ tokenURI })
  } catch (error) {
    console.error('Error uploading metadata:', error)
    return NextResponse.json(
      { error: 'Failed to upload metadata' },
      { status: 500 }
    )
  }
}