'use client'

import { useAccount, useDisconnect, useConnect, useBalance, useSwitchChain } from 'wagmi'
import { useState, useRef, useEffect } from 'react'
import { useEthToUsd } from '@/hooks/useUsdConversion'
import { baseSepolia } from 'viem/chains'

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function ConnectWalletButton() {
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const { connect, connectors, isPending } = useConnect()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Check if user is on the correct network
  const isWrongNetwork = isConnected && chain?.id !== baseSepolia.id

  // Get ETH balance (only fetch if on correct network)
  const { data: balance } = useBalance({
    address: address,
    query: {
      enabled: !!address && !isWrongNetwork,
    },
  })

  // Convert ETH balance to USD
  const { usdAmount, loading: usdLoading } = useEthToUsd(balance?.value || null)

  const handleSwitchNetwork = async () => {
    try {
      await switchChain({ chainId: baseSepolia.id })
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const copyToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setIsDropdownOpen(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="flex justify-end">
        <button
          onClick={() => connect({ connector: connectors[0] })}
          disabled={isPending}
          className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white px-6 py-2 rounded-[var(--radius-sm)] font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Connecting...' : 'Connect Wallet'}
        </button>
      </div>
    )
  }

  return (
    <div className="relative flex items-center space-x-3 justify-end" ref={dropdownRef}>
      {/* Wrong Network Warning */}
      {isWrongNetwork && (
        <div className="hidden sm:flex items-center space-x-2 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-[var(--radius-sm)] px-3 py-2">
          <svg className="w-4 h-4 text-[var(--error)]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-[var(--error)]">Wrong Network</span>
        </div>
      )}

      {/* USD Balance Display */}
      {!isWrongNetwork && (
        <div className="hidden sm:flex items-center space-x-2 bg-[var(--surface-container)] border border-[var(--surface-variant)] rounded-[var(--radius-sm)] px-3 py-2">
          <svg className="w-4 h-4 text-[var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-[var(--on-surface)]">
            {usdLoading ? (
              <span className="text-[var(--on-surface-variant)]">Loading...</span>
            ) : usdAmount !== null ? (
              `$${usdAmount.toFixed(2)}`
            ) : (
              <span className="text-[var(--on-surface-variant)]">$0.00</span>
            )}
          </span>
        </div>
      )}

      {/* Wallet Button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-2 bg-[var(--surface-container)] hover:bg-[var(--surface-container-highest)] border border-[var(--surface-variant)] rounded-[var(--radius-sm)] px-4 py-2 text-sm font-medium text-[var(--on-surface)] transition-colors"
      >
        <div className="w-6 h-6 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        <span className="font-mono">{truncateAddress(address!)}</span>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--surface)] border border-[var(--surface-variant)] rounded-[var(--radius-md)] shadow-lg z-50 overflow-hidden">
          <div className="p-4 border-b border-[var(--surface-variant)]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-[var(--on-surface)]">Connected</div>
                <div className={`text-xs ${isWrongNetwork ? 'text-[var(--error)]' : 'text-[var(--on-surface-variant)]'}`}>
                  {isWrongNetwork ? (chain?.name || 'Unknown Network') : 'Base Sepolia'}
                </div>
              </div>
            </div>
            
            {/* Balance Info or Network Warning */}
            {isWrongNetwork ? (
              <div className="mt-3 pt-3 border-t border-[var(--surface-variant)]">
                <div className="bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-[var(--radius-sm)] p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-4 h-4 text-[var(--error)]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-[var(--error)]">Wrong Network</span>
                  </div>
                  <p className="text-xs text-[var(--on-surface-variant)] mb-3">
                    Please switch to Base Sepolia to use this app and view your balance.
                  </p>
                  <button
                    onClick={handleSwitchNetwork}
                    disabled={isSwitching}
                    className="w-full bg-[var(--error)] text-white py-2 px-3 rounded-[var(--radius-sm)] text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--error)]/90 transition-colors"
                  >
                    {isSwitching ? 'Switching...' : 'Switch to Base Sepolia'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-[var(--surface-variant)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--on-surface-variant)] uppercase tracking-wide">Balance</span>
                  <div className="text-right">
                    <div className="text-sm font-medium text-[var(--on-surface)]">
                      {usdLoading ? (
                        <span className="text-[var(--on-surface-variant)]">Loading...</span>
                      ) : usdAmount !== null ? (
                        `$${usdAmount.toFixed(2)}`
                      ) : (
                        <span className="text-[var(--on-surface-variant)]">$0.00</span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--on-surface-variant)] font-mono">
                      {balance ? `${parseFloat(balance.formatted).toFixed(4)} ETH` : '0.0000 ETH'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-2">
            <button
              onClick={copyToClipboard}
              className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-[var(--on-surface)] hover:bg-[var(--surface-container)] rounded-[var(--radius-sm)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <div className="flex-1 text-left">
                <div className="font-medium">Copy Address</div>
                <div className="text-xs text-[var(--on-surface-variant)] font-mono">{truncateAddress(address!)}</div>
              </div>
            </button>
            
            <button
              onClick={() => {
                disconnect()
                setIsDropdownOpen(false)
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-[var(--error)] hover:bg-[var(--error)]/10 rounded-[var(--radius-sm)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}