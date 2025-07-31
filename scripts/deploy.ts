import { ethers } from "hardhat";

async function main() {
  console.log("Deploying contracts to Base Sepolia...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy BaseNFT contract
  console.log("Deploying BaseNFT...");
  const BaseNFT = await ethers.getContractFactory("BaseNFT");
  const baseNFT = await BaseNFT.deploy(deployer.address);
  await baseNFT.waitForDeployment();
  const baseNFTAddress = await baseNFT.getAddress();
  console.log("BaseNFT deployed to:", baseNFTAddress);

  // Deploy Marketplace contract
  console.log("Deploying Marketplace...");
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(deployer.address);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("Marketplace deployed to:", marketplaceAddress);

  // Verification info
  console.log("\n=== Deployment Complete ===");
  console.log("BaseNFT Contract:", baseNFTAddress);
  console.log("Marketplace Contract:", marketplaceAddress);
  console.log("\nUpdate your .env.local file with these addresses:");
  console.log(`NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=${baseNFTAddress}`);
  console.log(`NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=${marketplaceAddress}`);
  
  console.log("\nTo verify contracts on BaseScan, run:");
  console.log(`npx hardhat verify --network baseSepolia ${baseNFTAddress} "${deployer.address}"`);
  console.log(`npx hardhat verify --network baseSepolia ${marketplaceAddress} "${deployer.address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });