# Base NFT Marketplace - Hermes

A decentralized NFT marketplace built on the Base blockchain using Next.js, OnchainKit, and Solidity smart contracts.

## Features

- 🎨 **NFT Minting**: Create and mint ERC-721 NFTs with metadata storage
- 💰 **Marketplace**: List NFTs for sale with auction and buy-now functionality
- 👛 **Wallet Integration**: Connect with Coinbase Wallet, MetaMask, and other Base-compatible wallets
- 🔗 **Base Blockchain**: Fast and low-cost transactions on Base L2
- 💎 **Royalty System**: Built-in creator royalties on secondary sales
- 📱 **Responsive Design**: Mobile-friendly interface with Tailwind CSS

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **OnchainKit** - Coinbase's React components for onchain apps
- **Wagmi** - React hooks for Ethereum
- **Viem** - TypeScript interface for Ethereum

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **IPFS** - Decentralized metadata storage (demo implementation)

### Blockchain
- **Solidity** - Smart contract development
- **Foundry** - Fast, portable and modular toolkit for Ethereum development
- **OpenZeppelin** - Secure smart contract library
- **Base Sepolia** - Testnet for development
- **Base Mainnet** - Production deployment

## Smart Contracts

### BaseNFT.sol
- ERC-721 compliant NFT contract
- Metadata URI storage
- Creator royalty tracking
- Minting functionality

### Marketplace.sol
- NFT listing and auction system
- Bidding mechanism
- Buy-now functionality
- Automatic royalty distribution
- Platform fee collection

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- [Foundry](https://book.getfoundry.sh/getting-started/installation) - Ethereum development toolkit
- MetaMask or Coinbase Wallet
- Base Sepolia ETH for testing

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hermes
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your values:
   ```env
   PRIVATE_KEY=0xyour_private_key_with_0x_prefix
   BASESCAN_API_KEY=your_basescan_api_key
   ```
   
   Create `.env.local` for frontend:
   ```env
   NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_coinbase_developer_api_key
   NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id
   ```

4. **Install Foundry dependencies**
   ```bash
   forge install
   ```

5. **Compile smart contracts**
   ```bash
   npm run compile
   ```

6. **Deploy contracts to Base Sepolia**
   ```bash
   npm run deploy:sepolia
   ```

7. **Update contract addresses**
   After deployment, update `.env.local` with the deployed contract addresses shown in the deployment output:
   ```env
   NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x...
   NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=0x...
   ```

8. **Start the development server**
   ```bash
   npm run dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## API Endpoints

### NFTs
- `GET /api/nfts` - Get all NFTs
- `GET /api/nfts/[tokenId]` - Get specific NFT details
- `POST /api/upload-metadata` - Upload NFT metadata to IPFS

### Users
- `GET /api/users/[walletAddress]/nfts` - Get NFTs owned by user

## Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Smart Contracts

#### Base Sepolia (Testnet)
```bash
npm run deploy:sepolia
```

#### Base Mainnet (Production)
```bash
npm run deploy:mainnet
```

Contracts are automatically verified on BaseScan when using the `--verify` flag (included in npm scripts).

## Usage

### Creating an NFT
1. Connect your wallet
2. Navigate to "Create" page
3. Upload an image and add metadata
4. Sign the minting transaction
5. Your NFT will appear in "My NFTs"

### Buying/Selling NFTs
1. Browse the marketplace on the home page
2. Click on any NFT to view details
3. As an owner, you can list your NFT for sale
4. As a buyer, you can place bids or buy instantly

### Marketplace Features
- **Auction System**: Time-limited bidding
- **Buy Now**: Instant purchase at fixed price
- **Royalty Payments**: Automatic creator royalties
- **Platform Fees**: 2.5% marketplace fee

## Contract Addresses

### Base Sepolia Testnet
- NFT Contract: `TBD`
- Marketplace Contract: `TBD`

### Base Mainnet
- NFT Contract: `TBD`
- Marketplace Contract: `TBD`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Security

- Smart contracts use OpenZeppelin's audited libraries
- ReentrancyGuard protection on critical functions
- Input validation and access controls
- Proper handling of ETH transfers

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in this repository
- Join the Base Discord community
- Check the [Base documentation](https://docs.base.org)

## Roadmap

- [ ] Enhanced IPFS integration
- [ ] Advanced filtering and search
- [ ] NFT collections support
- [ ] Mobile app development
- [ ] Layer 2 scaling solutions
- [ ] Community governance features