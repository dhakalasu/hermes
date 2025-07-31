// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./BaseNFT.sol";

contract Marketplace is ReentrancyGuard, Ownable {
    struct Sale {
        uint256 tokenId;
        address nftContract;
        address seller;
        uint256 startingPrice;
        uint256 buyNowPrice;
        uint256 currentBid;
        address currentBidder;
        uint256 endTime;
        bool active;
        bool completed;
    }
    
    mapping(uint256 => Sale) public sales;
    mapping(uint256 => mapping(address => uint256)) public pendingWithdrawals;
    
    uint256 private _saleIdCounter = 1;
    uint256 public platformFee = 250; // 2.5% in basis points
    
    event SaleListed(
        uint256 indexed saleId,
        uint256 indexed tokenId,
        address indexed nftContract,
        address seller,
        uint256 startingPrice,
        uint256 buyNowPrice,
        uint256 endTime
    );
    
    event BidPlaced(
        uint256 indexed saleId,
        address indexed bidder,
        uint256 amount
    );
    
    event SaleCompleted(
        uint256 indexed saleId,
        address indexed buyer,
        uint256 finalPrice
    );
    
    event SaleCancelled(uint256 indexed saleId);
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    function listNFT(
        address nftContract,
        uint256 tokenId,
        uint256 startingPrice,
        uint256 buyNowPrice,
        uint256 duration
    ) external nonReentrant returns (uint256) {
        require(startingPrice > 0, "Starting price must be greater than 0");
        require(buyNowPrice >= startingPrice, "Buy now price must be >= starting price");
        require(duration >= 3600, "Duration must be at least 1 hour");
        require(duration <= 2629746, "Duration cannot exceed 30 days");
        
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "You don't own this NFT");
        require(nft.isApprovedForAll(msg.sender, address(this)) || 
                nft.getApproved(tokenId) == address(this), "Marketplace not approved");
        
        uint256 saleId = _saleIdCounter++;
        uint256 endTime = block.timestamp + duration;
        
        sales[saleId] = Sale({
            tokenId: tokenId,
            nftContract: nftContract,
            seller: msg.sender,
            startingPrice: startingPrice,
            buyNowPrice: buyNowPrice,
            currentBid: 0,
            currentBidder: address(0),
            endTime: endTime,
            active: true,
            completed: false
        });
        
        emit SaleListed(saleId, tokenId, nftContract, msg.sender, startingPrice, buyNowPrice, endTime);
        
        return saleId;
    }
    
    function placeBid(uint256 saleId) external payable nonReentrant {
        Sale storage sale = sales[saleId];
        require(sale.active, "Sale not active");
        require(block.timestamp < sale.endTime, "Auction has ended");
        require(msg.sender != sale.seller, "Seller cannot bid on own item");
        require(msg.value >= sale.startingPrice, "Bid below starting price");
        require(msg.value > sale.currentBid, "Bid too low");
        
        // Return previous bid to previous bidder
        if (sale.currentBidder != address(0)) {
            pendingWithdrawals[saleId][sale.currentBidder] += sale.currentBid;
        }
        
        sale.currentBid = msg.value;
        sale.currentBidder = msg.sender;
        
        emit BidPlaced(saleId, msg.sender, msg.value);
    }
    
    function buyNow(uint256 saleId) external payable nonReentrant {
        Sale storage sale = sales[saleId];
        require(sale.active, "Sale not active");
        require(block.timestamp < sale.endTime, "Auction has ended");
        require(msg.sender != sale.seller, "Seller cannot buy own item");
        require(msg.value >= sale.buyNowPrice, "Insufficient payment");
        
        // Return current bid to current bidder if exists
        if (sale.currentBidder != address(0)) {
            pendingWithdrawals[saleId][sale.currentBidder] += sale.currentBid;
        }
        
        _completeSale(saleId, msg.sender, msg.value);
    }
    
    function finalizeSale(uint256 saleId) external nonReentrant {
        Sale storage sale = sales[saleId];
        require(sale.active, "Sale not active");
        require(block.timestamp >= sale.endTime, "Auction still active");
        require(sale.currentBidder != address(0), "No bids placed");
        
        _completeSale(saleId, sale.currentBidder, sale.currentBid);
    }
    
    function _completeSale(uint256 saleId, address buyer, uint256 finalPrice) internal {
        Sale storage sale = sales[saleId];
        
        sale.active = false;
        sale.completed = true;
        
        // Transfer NFT to buyer
        IERC721(sale.nftContract).transferFrom(sale.seller, buyer, sale.tokenId);
        
        // Calculate fees and payments
        uint256 platformFeeAmount = (finalPrice * platformFee) / 10000;
        uint256 royaltyAmount = 0;
        uint256 sellerAmount = finalPrice - platformFeeAmount;
        
        // Handle royalties if this is a BaseNFT
        if (sale.nftContract != address(0)) {
            try BaseNFT(sale.nftContract).getRoyalty(sale.tokenId) returns (uint256 royalty) {
                if (royalty > 0) {
                    address creator = BaseNFT(sale.nftContract).getCreator(sale.tokenId);
                    if (creator != sale.seller) {
                        royaltyAmount = (finalPrice * royalty) / 10000;
                        sellerAmount -= royaltyAmount;
                        
                        (bool royaltySuccess, ) = creator.call{value: royaltyAmount}("");
                        require(royaltySuccess, "Royalty transfer failed");
                    }
                }
            } catch {
                // Not a BaseNFT or getRoyalty failed, skip royalty
            }
        }
        
        // Transfer payments
        (bool sellerSuccess, ) = sale.seller.call{value: sellerAmount}("");
        require(sellerSuccess, "Seller payment failed");
        
        // Platform fee stays in contract for owner withdrawal
        
        emit SaleCompleted(saleId, buyer, finalPrice);
    }
    
    function cancelSale(uint256 saleId) external nonReentrant {
        Sale storage sale = sales[saleId];
        require(sale.active, "Sale not active");
        require(msg.sender == sale.seller, "Only seller can cancel");
        require(sale.currentBidder == address(0), "Cannot cancel with active bids");
        
        sale.active = false;
        
        emit SaleCancelled(saleId);
    }
    
    function withdraw(uint256 saleId) external nonReentrant {
        uint256 amount = pendingWithdrawals[saleId][msg.sender];
        require(amount > 0, "No funds to withdraw");
        
        pendingWithdrawals[saleId][msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
    }
    
    function withdrawPlatformFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Fee withdrawal failed");
    }
    
    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Platform fee cannot exceed 10%");
        platformFee = newFee;
    }
    
    function getSale(uint256 saleId) external view returns (Sale memory) {
        return sales[saleId];
    }
    
    function getTotalSales() external view returns (uint256) {
        return _saleIdCounter - 1;
    }
}