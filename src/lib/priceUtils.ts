// Cache for ETH price to avoid too many API calls
let cachedEthPrice: number | null = null
let lastFetchTime: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Fetches current ETH price from a public API
 */
export async function getEthPrice(): Promise<number> {
  const now = Date.now()
  
  // Return cached price if it's still fresh
  if (cachedEthPrice && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedEthPrice
  }
  
  try {
    // Using CoinGecko API as fallback (free tier)
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
    const data = await response.json()
    
    if (data.ethereum?.usd) {
      cachedEthPrice = data.ethereum.usd
      lastFetchTime = now
      return cachedEthPrice
    }
    
    throw new Error('Invalid response from price API')
  } catch (error) {
    console.error('Failed to fetch ETH price:', error)
    
    // Fallback to a reasonable default if cache is empty
    if (!cachedEthPrice) {
      cachedEthPrice = 3000 // Fallback price
    }
    
    return cachedEthPrice
  }
}

/**
 * Converts ETH wei amount to USD
 */
export async function ethToUsd(weiAmount: string | bigint): Promise<number> {
  const ethPrice = await getEthPrice()
  const ethAmount = weiToEth(weiAmount)
  return ethAmount * ethPrice
}

/**
 * Converts USD amount to ETH wei
 */
export async function usdToEth(usdAmount: number): Promise<bigint> {
  const ethPrice = await getEthPrice()
  const ethAmount = usdAmount / ethPrice
  return ethToWei(ethAmount)
}

/**
 * Parses USD string input and converts to ETH wei
 */
export async function parseUsdToEth(usdString: string): Promise<bigint> {
  const usdAmount = parseFloat(usdString.replace(/[^0-9.-]/g, ''))
  if (isNaN(usdAmount)) {
    throw new Error('Invalid USD amount')
  }
  return await usdToEth(usdAmount)
}

/**
 * Formats USD amounts for display
 */
export function formatUsd(amount: number | string): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(value)) {
    return '$0.00'
  }
  
  // Format as currency
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Formats ETH amounts for display
 */
export function formatEth(amount: number | string): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(value)) {
    return '0 ETH'
  }
  
  // Show more decimals for small amounts
  const decimals = value < 0.001 ? 6 : value < 0.1 ? 4 : 3
  
  return `${value.toFixed(decimals)} ETH`
}

/**
 * Converts wei to ETH
 */
export function weiToEth(wei: string | bigint): number {
  const weiAmount = typeof wei === 'string' ? BigInt(wei) : wei
  
  // Handle zero case
  if (weiAmount === 0n) {
    return 0
  }
  
  // Convert using BigInt arithmetic to preserve precision
  // Split into integer and fractional parts to avoid precision loss
  const weiPerEth = BigInt('1000000000000000000') // 1e18
  const ethInteger = weiAmount / weiPerEth
  const weiRemainder = weiAmount % weiPerEth
  
  // Convert to decimal
  const ethDecimal = Number(ethInteger) + Number(weiRemainder) / 1e18
  
  return ethDecimal
}

/**
 * Converts ETH to wei
 */
export function ethToWei(eth: number | string): bigint {
  const ethAmount = typeof eth === 'string' ? parseFloat(eth) : eth
  return BigInt(Math.round(ethAmount * 1e18))
}

/**
 * Formats a percentage
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}