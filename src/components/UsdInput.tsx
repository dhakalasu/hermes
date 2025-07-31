import { useState, useEffect, useRef } from 'react'
import { useUsdConversion } from '@/hooks/useUsdConversion'

interface UsdInputProps {
  value: string
  onChange: (usdValue: string, ethValue: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
  min?: string
  step?: string
}

export function UsdInput({
  value,
  onChange,
  placeholder = "Enter amount in USD",
  className = "",
  disabled = false,
  required = false,
  min = "0",
  step = "0.01"
}: UsdInputProps) {
  const [ethEquivalent, setEthEquivalent] = useState<string>('')
  const [localValue, setLocalValue] = useState(value)
  const { convertUsdToEth, ethPrice } = useUsdConversion()
  const timeoutRef = useRef<any>(null)

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Convert USD to ETH with debouncing
  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout for conversion
    timeoutRef.current = setTimeout(async () => {
      if (!localValue || !ethPrice || parseFloat(localValue) <= 0) {
        const newEthEquivalent = ''
        setEthEquivalent(newEthEquivalent)
        onChange(localValue, newEthEquivalent)
        return
      }

      try {
        const ethWei = await convertUsdToEth(parseFloat(localValue))
        const ethAmount = (Number(ethWei) / 1e18).toString()
        setEthEquivalent(ethAmount)
        onChange(localValue, ethAmount)
      } catch (error) {
        console.error('Error converting USD to ETH:', error)
        const newEthEquivalent = ''
        setEthEquivalent(newEthEquivalent)
        onChange(localValue, newEthEquivalent)
      }
    }, 300) // 300ms debounce

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [localValue, ethPrice, convertUsdToEth, onChange])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    // Don't call onChange here - let the debounced useEffect handle it
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <span className="text-[var(--on-surface-variant)] text-sm">$</span>
        </div>
        <input
          type="number"
          value={localValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`block w-full pl-8 pr-4 py-3 border border-[var(--surface-variant)] bg-[var(--surface)] rounded-[var(--radius-sm)] text-[var(--on-surface)] placeholder-[var(--on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-colors ${className}`}
          disabled={disabled}
          required={required}
          min={min}
          step={step}
        />
      </div>
      
      {ethEquivalent && ethPrice && (
        <div className="text-xs text-[var(--on-surface-variant)] flex justify-between">
          <span>≈ {parseFloat(ethEquivalent).toFixed(6)} ETH</span>
          <span>1 ETH = ${ethPrice.toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}

interface UsdInputWithLabelProps extends UsdInputProps {
  label: string
  labelClassName?: string
}

export function UsdInputWithLabel({
  label,
  labelClassName = '',
  ...props
}: UsdInputWithLabelProps) {
  return (
    <div className="space-y-2">
      <label className={`block text-sm font-medium text-[var(--on-surface)] ${labelClassName}`}>
        {label}
      </label>
      <UsdInput {...props} />
    </div>
  )
} 