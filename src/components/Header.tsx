'use client'

import Link from 'next/link'
import { ConnectWalletButton } from './ConnectWallet'

export function Header() {
  return (
    <header className="bg-[var(--surface)] border-b border-[var(--surface-variant)] backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-semibold text-[var(--primary)] tracking-tight">
              Base Marketplace
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center space-x-1">
            <Link href="/" className="text-[var(--on-surface)] hover:text-[var(--primary)] hover:bg-[var(--surface-container)] px-4 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-all duration-200">
              Explore
            </Link>
            <Link href="/marketplace" className="text-[var(--on-surface)] hover:text-[var(--primary)] hover:bg-[var(--surface-container)] px-4 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-all duration-200">
              Marketplace
            </Link>
            <Link href="/mint" className="text-[var(--on-surface)] hover:text-[var(--primary)] hover:bg-[var(--surface-container)] px-4 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-all duration-200">
              Create
            </Link>
            <Link href="/my-nfts" className="text-[var(--on-surface)] hover:text-[var(--primary)] hover:bg-[var(--surface-container)] px-4 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-all duration-200">
              My NFTs
            </Link>
            <Link href="/consume" className="text-[var(--on-surface)] hover:text-[var(--primary)] hover:bg-[var(--surface-container)] px-4 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-all duration-200">
              Consume
            </Link>
          </nav>
          
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  )
}