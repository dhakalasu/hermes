// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {BaseNFT} from "../contracts/BaseNFT.sol";

contract Deploy is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying BaseNFT contract to Base Sepolia...");
        console.log("Deploying with account:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy BaseNFT contract
        console.log("Deploying BaseNFT...");
        BaseNFT baseNFT = new BaseNFT(deployer);
        console.log("BaseNFT deployed to:", address(baseNFT));

        vm.stopBroadcast();

        // Output deployment info
        console.log("\n=== Deployment Complete ===");
        console.log("BaseNFT Contract:", address(baseNFT));
        console.log("\nUpdate your .env.local file with this address:");
        console.log("NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=%s", address(baseNFT));
        
        console.log("\nContract will be automatically verified if --verify flag is used");
    }
}