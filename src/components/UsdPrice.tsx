import { useEthToUsd } from '@/hooks/useUsdConversion'
import { formatUsd } from '@/lib/priceUtils'

interface UsdPriceProps {
  weiAmount: string | bigint
  className?: string
  showLoader?: boolean
  fallbackToEth?: boolean
}

export function UsdPrice({ weiAmount, className = '', showLoader = true, fallbackToEth = true }: UsdPriceProps) {
  const { usdAmount, loading } = useEthToUsd(weiAmount)

  if (loading && showLoader) {
    return (
      <span className={`inline-block bg-[var(--surface-variant)] rounded animate-pulse ${className}`}>
        $---
      </span>
    )
  }

  if (usdAmount === null) {
    if (fallbackToEth) {
      // Fallback to ETH display if conversion fails
      return (
        <span className={className}>
          {(Number(weiAmount) / 1e18).toFixed(4)} ETH
        </span>
      )
    }
    return <span className={className}>$---</span>
  }

  return (
    <span className={className}>
      {formatUsd(usdAmount)}
    </span>
  )
}

interface UsdPriceWithLabelProps extends UsdPriceProps {
  label: string
  labelClassName?: string
}

export function UsdPriceWithLabel({ 
  weiAmount, 
  label, 
  className = '', 
  labelClassName = '',
  ...props 
}: UsdPriceWithLabelProps) {
  return (
    <div className="space-y-1">
      <span className={`text-[var(--on-surface-variant)] text-xs uppercase tracking-wide ${labelClassName}`}>
        {label}
      </span>
      <UsdPrice weiAmount={weiAmount} className={className} {...props} />
    </div>
  )
} 