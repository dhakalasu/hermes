import { formatEther } from 'viem'

// Mock ETH to USD exchange rate (in a real app, this would come from an API)
const ETH_TO_USD_RATE = 3400 // Example rate

/**
 * Converts ETH amount to USD and formats it
 * @param ethAmount - ETH amount in wei (BigInt)
 * @param showOriginal - Whether to show the original ETH amount alongside USD
 * @returns Formatted USD string
 */
export function formatPriceInUSD(ethAmount: bigint, showOriginal: boolean = false): string {
  const ethValue = parseFloat(formatEther(ethAmount))
  const usdValue = ethValue * ETH_TO_USD_RATE
  
  const formattedUSD = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usdValue)
  
  if (showOriginal) {
    return `${formattedUSD} (${formatEther(ethAmount)} ETH)`
  }
  
  return formattedUSD
}

/**
 * Formats a number as USD currency
 * @param amount - Amount in USD
 * @returns Formatted USD string
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Converts ETH to USD value
 * @param ethAmount - ETH amount in wei (BigInt)
 * @returns USD value as number
 */
export function ethToUSD(ethAmount: bigint): number {
  const ethValue = parseFloat(formatEther(ethAmount))
  return ethValue * ETH_TO_USD_RATE
}

/**
 * Converts USD to ETH value
 * @param usdAmount - Amount in USD
 * @returns ETH value as string (for parseEther)
 */
export function usdToETH(usdAmount: number): string {
  const ethValue = usdAmount / ETH_TO_USD_RATE
  return ethValue.toString()
}