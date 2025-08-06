/**
 * Utility functions for handling addresses and blockchain explorer links
 */

/**
 * Generate a BaseScan Sepolia URL for an address
 */
export function getBaseScanAddressUrl(address: string): string {
  return `https://sepolia.basescan.org/address/${address}`
}

/**
 * Generate a BaseScan Sepolia URL for a transaction
 */
export function getBaseScanTxUrl(txHash: string): string {
  return `https://sepolia.basescan.org/tx/${txHash}`
}

/**
 * Truncate an address for display (show first 6 and last 4 characters)
 */
export function truncateAddress(address: string): string {
  if (address.length <= 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

