// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Marketplace is ReentrancyGuard, Ownable {
    struct Sale {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 startingPrice;
        uint256 buyNowPrice;
        uint256 currentBid;
        address currentBidder;
        uint256 endTime;
        bool active;
    }

    mapping(uint256 => Sale) public sales;
    uint256 public nextSaleId = 1;
    
    uint256 public constant PLATFORM_FEE = 250; // 2.5%
    uint256 public constant MAX_ROYALTY = 1000; // 10%

    event NFTListed(
        uint256 indexed saleId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 startingPrice,
        uint256 buyNowPrice,
        uint256 endTime
    );

    event BidPlaced(
        uint256 indexed saleId,
        address indexed bidder,
        uint256 amount
    );

    event NFTSold(
        uint256 indexed saleId,
        address indexed buyer,
        uint256 amount
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    function listNFT(
        address nftContract,
        uint256 tokenId,
        uint256 startingPrice,
        uint256 buyNowPrice,
        uint256 duration
    ) external returns (uint256) {
        require(startingPrice > 0, "Starting price must be greater than 0");
        require(buyNowPrice >= startingPrice, "Buy now price must be >= starting price");
        require(duration > 0, "Duration must be greater than 0");

        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner of the NFT");
        require(nft.getApproved(tokenId) == address(this) || nft.isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");

        uint256 saleId = nextSaleId++;
        uint256 endTime = block.timestamp + duration;

        sales[saleId] = Sale({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            startingPrice: startingPrice,
            buyNowPrice: buyNowPrice,
            currentBid: 0,
            currentBidder: address(0),
            endTime: endTime,
            active: true
        });

        // Transfer NFT to marketplace
        nft.transferFrom(msg.sender, address(this), tokenId);

        emit NFTListed(saleId, msg.sender, nftContract, tokenId, startingPrice, buyNowPrice, endTime);
        
        return saleId;
    }

    function placeBid(uint256 saleId) external payable nonReentrant {
        Sale storage sale = sales[saleId];
        require(sale.active, "Sale not active");
        require(block.timestamp < sale.endTime, "Sale has ended");
        require(msg.value >= sale.startingPrice, "Bid below starting price");
        require(msg.value > sale.currentBid, "Bid must be higher than current bid");

        // Refund previous bidder
        if (sale.currentBidder != address(0)) {
            payable(sale.currentBidder).transfer(sale.currentBid);
        }

        sale.currentBid = msg.value;
        sale.currentBidder = msg.sender;

        emit BidPlaced(saleId, msg.sender, msg.value);
    }

    function buyNow(uint256 saleId) external payable nonReentrant {
        Sale storage sale = sales[saleId];
        require(sale.active, "Sale not active");
        require(block.timestamp < sale.endTime, "Sale has ended");
        require(msg.value >= sale.buyNowPrice, "Insufficient payment");

        _completeSale(saleId, msg.sender, sale.buyNowPrice);
    }

    function finalizeSale(uint256 saleId) external nonReentrant {
        Sale storage sale = sales[saleId];
        require(sale.active, "Sale not active");
        require(block.timestamp >= sale.endTime, "Sale has not ended");
        require(sale.currentBidder != address(0), "No bids placed");

        _completeSale(saleId, sale.currentBidder, sale.currentBid);
    }

    function _completeSale(uint256 saleId, address buyer, uint256 amount) internal {
        Sale storage sale = sales[saleId];
        
        // Mark sale as inactive
        sale.active = false;

        // Calculate fees
        uint256 platformFee = (amount * PLATFORM_FEE) / 10000;
        uint256 sellerAmount = amount - platformFee;

        // Transfer NFT to buyer
        IERC721(sale.nftContract).transferFrom(address(this), buyer, sale.tokenId);

        // Transfer payment to seller
        payable(sale.seller).transfer(sellerAmount);

        // Platform fee stays in contract for owner to withdraw
        
        // Refund any previous bidder if this was a buy now
        if (sale.currentBidder != address(0) && sale.currentBidder != buyer) {
            payable(sale.currentBidder).transfer(sale.currentBid);
        }

        emit NFTSold(saleId, buyer, amount);
    }

    function cancelSale(uint256 saleId) external {
        Sale storage sale = sales[saleId];
        require(sale.active, "Sale not active");
        require(sale.seller == msg.sender, "Not the seller");

        sale.active = false;

        // Return NFT to seller
        IERC721(sale.nftContract).transferFrom(address(this), sale.seller, sale.tokenId);

        // Refund current bidder if any
        if (sale.currentBidder != address(0)) {
            payable(sale.currentBidder).transfer(sale.currentBid);
        }
    }

    function getSale(uint256 saleId) external view returns (Sale memory) {
        return sales[saleId];
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }
} 