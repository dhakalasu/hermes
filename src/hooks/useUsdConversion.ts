import { useState, useEffect, useCallback } from 'react'
import { getEthPrice, ethToUsd, usdToEth, formatUsd, parseUsdToEth } from '@/lib/priceUtils'

export function useUsdConversion() {
  const [ethPrice, setEthPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch ETH price on mount and set up periodic updates
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const price = await getEthPrice()
        setEthPrice(price)
      } catch (error) {
        console.error('Failed to fetch ETH price:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPrice()
    
    // Update price every 5 minutes
    const interval = setInterval(fetchPrice, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  // Convert ETH wei to USD
  const convertEthToUsd = useCallback(async (weiAmount: string | bigint): Promise<number> => {
    return await ethToUsd(weiAmount)
  }, [])

  // Convert USD to ETH wei
  const convertUsdToEth = useCallback(async (usdAmount: number): Promise<bigint> => {
    return await usdToEth(usdAmount)
  }, [])

  // Format USD amount
  const formatUsdAmount = useCallback((amount: number): string => {
    return formatUsd(amount)
  }, [])

  // Parse USD input to ETH
  const parseUsdInput = useCallback(async (usdString: string): Promise<bigint> => {
    return await parseUsdToEth(usdString)
  }, [])

  return {
    ethPrice,
    loading,
    convertEthToUsd,
    convertUsdToEth,
    formatUsdAmount,
    parseUsdInput,
  }
}

// Hook for converting a specific ETH amount to USD (with automatic updates)
export function useEthToUsd(weiAmount: string | bigint | null) {
  const [usdAmount, setUsdAmount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const { ethPrice } = useUsdConversion()

  useEffect(() => {
    if (!weiAmount || !ethPrice) {
      setLoading(false)
      return
    }

    const convertAmount = async () => {
      try {
        const usd = await ethToUsd(weiAmount)
        setUsdAmount(usd)
      } catch (error) {
        console.error('Error converting ETH to USD:', error)
        setUsdAmount(null)
      } finally {
        setLoading(false)
      }
    }

    convertAmount()
  }, [weiAmount, ethPrice])

  return { usdAmount, loading, ethPrice }
} 