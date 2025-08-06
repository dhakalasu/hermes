import { getBaseScanAddressUrl, truncateAddress } from '@/lib/addressUtils'

/**
 * Component for displaying a clickable address link to BaseScan
 */
interface AddressLinkProps {
  address: string
  className?: string
  truncate?: boolean
  children?: React.ReactNode
}

export function AddressLink({ 
  address, 
  className = "", 
  truncate = true, 
  children 
}: AddressLinkProps) {
  const displayText = children || (truncate ? truncateAddress(address) : address)
  
  return (
    <a
      href={getBaseScanAddressUrl(address)}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-[var(--primary)] hover:text-[var(--primary)]/80 underline transition-colors ${className}`}
      title={`View on BaseScan: ${address}`}
    >
      {displayText}
    </a>
  )
}