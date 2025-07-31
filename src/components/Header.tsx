'use client'

import Link from 'next/link'
import { ConnectWalletButton } from './ConnectWallet'

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-blue-600">
              Base Marketplace
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            <Link href="/" className="text-gray-900 hover:text-blue-600 px-3 py-2 text-sm font-medium">
              Explore
            </Link>
            <Link href="/mint" className="text-gray-900 hover:text-blue-600 px-3 py-2 text-sm font-medium">
              Create
            </Link>
            <Link href="/my-nfts" className="text-gray-900 hover:text-blue-600 px-3 py-2 text-sm font-medium">
              My NFTs
            </Link>
          </nav>
          
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  )
}