import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory storage for demo (in production, use IPFS/database)
const metadataStore = new Map<string, unknown>()

// Function to validate if URL is a valid image
async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    const contentType = response.headers.get('content-type')
    return response.ok && contentType?.startsWith('image/') === true
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageUrl, name, description, location, eventDate, eventTime } = body

    if (!imageUrl || !name || !location || !eventDate || !eventTime) {
      return NextResponse.json(
        { error: 'Image URL, name, location, event date, and event time are required' },
        { status: 400 }
      )
    }

    // Validate the image URL
    const isValidImage = await validateImageUrl(imageUrl)
    
    // Use provided URL if valid, otherwise use a random placeholder
    const pictureUrl = isValidImage 
      ? imageUrl 
      : `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000)}`
    
    const metadataHash = `Qm${Math.random().toString(36).substring(2, 15)}`
    
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
      metadataUri: `https://api.example.com/metadata/${metadataHash}`,
      isOriginalUrl: isValidImage
    })
  } catch (error) {
    console.error('Error processing metadata:', error)
    return NextResponse.json(
      { error: 'Failed to process metadata' },
      { status: 500 }
    )
  }
}