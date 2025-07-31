// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {BaseNFT} from "../contracts/BaseNFT.sol";
import {Marketplace} from "../contracts/Marketplace.sol";

contract Deploy is Script {
    // Base Sepolia ETH/USD price feed address (Chainlink)
    address constant ETH_USD_PRICE_FEED = 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts to Base Sepolia...");
        console.log("Deploying with account:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying BaseNFT...");
        BaseNFT baseNFT = new BaseNFT(deployer);
        console.log("BaseNFT deployed to:", address(baseNFT));

        console.log("Deploying Marketplace...");
        Marketplace marketplace = new Marketplace(
            deployer,
            address(baseNFT),
            ETH_USD_PRICE_FEED
        );
        console.log("Marketplace deployed to:", address(marketplace));

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("BaseNFT Contract:", address(baseNFT));
        console.log("Marketplace Contract:", address(marketplace));
        console.log("ETH/USD Price Feed:", ETH_USD_PRICE_FEED);
        console.log("\nUpdate your .env.local file with these addresses:");
        console.log("NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=%s", address(baseNFT));
        console.log("NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=%s", address(marketplace));
        
        console.log("\nContracts will be automatically verified if --verify flag is used");
    }
}