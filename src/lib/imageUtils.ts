/**
 * Image utility functions for handling NFT image URLs
 */

// Common IPFS gateways for fallback
const IPFS_GATEWAYS = [
    'https://ipfs.io/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
  ]
  
  /**
   * Validates and sanitizes image URLs, handles IPFS URLs and provides fallbacks
   * @param url - The raw image URL from NFT metadata
   * @returns A valid, accessible image URL or a fallback
   */
  export function getValidImageUrl(url: string | undefined | null): string {
    // Fallback image for invalid or missing URLs
    const fallbackImage = '/placeholder-nft.svg'
    
    // Return fallback if URL is empty or invalid
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return fallbackImage
    }
    
    const trimmedUrl = url.trim()
    
    // Handle IPFS URLs
    if (trimmedUrl.startsWith('ipfs://')) {
      const ipfsHash = trimmedUrl.replace('ipfs://', '')
      // Use the first IPFS gateway as default
      return `${IPFS_GATEWAYS[0]}${ipfsHash}`
    }
    
    // Handle already converted IPFS URLs
    if (trimmedUrl.includes('/ipfs/') || trimmedUrl.includes('ipfs.')) {
      return trimmedUrl
    }
    
    // Validate HTTP/HTTPS URLs
    try {
      const parsedUrl = new URL(trimmedUrl)
      
      // Only allow HTTP and HTTPS protocols
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return fallbackImage
      }
      
      // Return the valid URL
      return parsedUrl.toString()
    } catch (error) {
      // If URL parsing fails, return fallback
      console.warn('Invalid image URL:', trimmedUrl, error)
      return fallbackImage
    }
  }
  
  /**
   * Converts IPFS URL to use a specific gateway
   * @param ipfsUrl - IPFS URL (ipfs://hash or gateway URL)
   * @param gatewayIndex - Index of the gateway to use (default: 0)
   * @returns URL using the specified IPFS gateway
   */
  export function convertIpfsUrl(ipfsUrl: string, gatewayIndex: number = 0): string {
    if (!ipfsUrl) return '/placeholder-nft.svg'
    
    const gateway = IPFS_GATEWAYS[gatewayIndex] || IPFS_GATEWAYS[0]
    
    if (ipfsUrl.startsWith('ipfs://')) {
      const hash = ipfsUrl.replace('ipfs://', '')
      return `${gateway}${hash}`
    }
    
    // If it's already a gateway URL, extract hash and use new gateway
    const ipfsMatch = ipfsUrl.match(/\/ipfs\/([a-zA-Z0-9]+)/)
    if (ipfsMatch) {
      return `${gateway}${ipfsMatch[1]}`
    }
    
    return ipfsUrl
  }
  
  /**
   * Checks if a URL is an IPFS URL
   * @param url - URL to check
   * @returns True if the URL is an IPFS URL
   */
  export function isIpfsUrl(url: string): boolean {
    return url.startsWith('ipfs://') || url.includes('/ipfs/')
  }