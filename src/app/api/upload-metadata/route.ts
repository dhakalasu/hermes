import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory storage for demo (in production, use IPFS/database)
const metadataStore = new Map<string, unknown>()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const location = formData.get('location') as string
    const eventDate = formData.get('eventDate') as string
    const eventTime = formData.get('eventTime') as string

    if (!image || !name || !location || !eventDate || !eventTime) {
      return NextResponse.json(
        { error: 'Image, name, location, event date, and event time are required' },
        { status: 400 }
      )
    }

    // In a real app, you would upload to IPFS here
    // For demo purposes, we'll create a mock IPFS hash for the image
    const imageHash = `Qm${Math.random().toString(36).substring(2, 15)}`
    const metadataHash = `Qm${Math.random().toString(36).substring(2, 15)}`
    
    // Direct image URL for the smart contract
    const pictureUrl = `https://ipfs.io/ipfs/${imageHash}`
    
    const metadata = {
      name,
      description,
      image: pictureUrl,
      location,
      eventDate,
      eventTime,
      attributes: [
        {
          trait_type: "Event Type",
          value: "Reservation/Ticket"
        },
        {
          trait_type: "Location",
          value: location
        },
        {
          trait_type: "Event Date",
          value: eventDate
        },
        {
          trait_type: "Event Time", 
          value: eventTime
        }
      ]
    }
    
    // Store metadata (in production, this would be stored on IPFS)
    metadataStore.set(metadataHash, metadata)
    
    // Return the picture URL for the smart contract
    return NextResponse.json({ 
      pictureUrl,
      metadata,
      metadataUri: `https://ipfs.io/ipfs/${metadataHash}`
    })
  } catch (error) {
    console.error('Error uploading metadata:', error)
    return NextResponse.json(
      { error: 'Failed to upload metadata' },
      { status: 500 }
    )
  }
}