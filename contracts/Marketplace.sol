// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./BaseNFT.sol";

interface AggregatorV3Interface {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 price,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

contract Marketplace is ReentrancyGuard, Ownable {
    BaseNFT public immutable baseNFT;
    AggregatorV3Interface public immutable ethUsdPriceFeed;
    
    struct Sale {
        address seller;
        uint256 tokenId;
        uint256 listPriceUsd; // Price in USD (8 decimals)
        uint256 buyNowPriceUsd; // Buy now price in USD (8 decimals)
        uint256 currentBidUsd; // Current bid in USD (8 decimals)
        address currentBidder;
        uint256 endTime;
        bool active;
    }

    mapping(uint256 => Sale) public sales;
    uint256 public nextSaleId = 1;

    event NFTListed(
        uint256 indexed saleId,
        address indexed seller,
        uint256 indexed tokenId,
        uint256 listPriceUsd,
        uint256 buyNowPriceUsd,
        uint256 endTime
    );

    event BidPlaced(
        uint256 indexed saleId,
        address indexed bidder,
        uint256 bidUsd,
        uint256 ethAmount
    );

    event NFTSold(
        uint256 indexed saleId,
        address indexed buyer,
        uint256 priceUsd,
        uint256 ethAmount
    );

    constructor(
        address initialOwner,
        address _baseNFT,
        address _ethUsdPriceFeed
    ) Ownable(initialOwner) {
        baseNFT = BaseNFT(_baseNFT);
        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);
    }

    function getEthPrice() public view returns (uint256) {
        (, int256 price,,,) = ethUsdPriceFeed.latestRoundData();
        require(price > 0, "Invalid price feed");
        return uint256(price);
    }
    
    function usdToEth(uint256 usdAmount) public view returns (uint256) {
        uint256 ethPrice = getEthPrice();
        return (usdAmount * 1e18) / ethPrice;
    }
    
    function ethToUsd(uint256 ethAmount) public view returns (uint256) {
        uint256 ethPrice = getEthPrice();
        return (ethAmount * ethPrice) / 1e18;
    }

    function listNFT(
        uint256 tokenId,
        uint256 listPriceUsd,
        uint256 buyNowPriceUsd,
        uint256 duration
    ) external returns (uint256) {
        require(listPriceUsd > 0, "List price must be greater than 0");
        require(buyNowPriceUsd >= listPriceUsd, "Buy now price must be >= list price");
        require(duration > 0, "Duration must be greater than 0");
        require(!baseNFT.isConsumed(tokenId), "Cannot list consumed NFT");

        require(baseNFT.ownerOf(tokenId) == msg.sender, "Not the owner of the NFT");
        require(
            baseNFT.getApproved(tokenId) == address(this) || 
            baseNFT.isApprovedForAll(msg.sender, address(this)), 
            "Marketplace not approved"
        );

        uint256 saleId = nextSaleId++;
        uint256 endTime = block.timestamp + duration;

        sales[saleId] = Sale({
            seller: msg.sender,
            tokenId: tokenId,
            listPriceUsd: listPriceUsd,
            buyNowPriceUsd: buyNowPriceUsd,
            currentBidUsd: 0,
            currentBidder: address(0),
            endTime: endTime,
            active: true
        });

        baseNFT.transferFrom(msg.sender, address(this), tokenId);

        emit NFTListed(saleId, msg.sender, tokenId, listPriceUsd, buyNowPriceUsd, endTime);
        
        return saleId;
    }

    function placeBid(uint256 saleId) external payable nonReentrant {
        Sale storage sale = sales[saleId];
        require(sale.active, "Sale not active");
        require(block.timestamp < sale.endTime, "Sale has ended");
        require(!baseNFT.isConsumed(sale.tokenId), "NFT has been consumed");

        uint256 bidUsd = ethToUsd(msg.value);
        require(bidUsd >= sale.listPriceUsd, "Bid below list price");
        require(bidUsd > sale.currentBidUsd, "Bid must be higher than current bid");

        // Refund previous bidder
        if (sale.currentBidder != address(0)) {
            uint256 refundEth = usdToEth(sale.currentBidUsd);
            payable(sale.currentBidder).transfer(refundEth);
        }

        sale.currentBidUsd = bidUsd;
        sale.currentBidder = msg.sender;

        emit BidPlaced(saleId, msg.sender, bidUsd, msg.value);
    }

    function buyNow(uint256 saleId) external payable nonReentrant {
        Sale storage sale = sales[saleId];
        require(sale.active, "Sale not active");
        require(block.timestamp < sale.endTime, "Sale has ended");
        require(!baseNFT.isConsumed(sale.tokenId), "NFT has been consumed");

        uint256 requiredEth = usdToEth(sale.buyNowPriceUsd);
        require(msg.value >= requiredEth, "Insufficient payment");

        _completeSale(saleId, msg.sender, sale.buyNowPriceUsd, msg.value);
    }

    function finalizeSale(uint256 saleId) external nonReentrant {
        Sale storage sale = sales[saleId];
        require(sale.active, "Sale not active");
        require(block.timestamp >= sale.endTime, "Sale has not ended");
        require(sale.currentBidder != address(0), "No bids placed");
        require(!baseNFT.isConsumed(sale.tokenId), "NFT has been consumed");

        uint256 ethAmount = usdToEth(sale.currentBidUsd);
        _completeSale(saleId, sale.currentBidder, sale.currentBidUsd, ethAmount);
    }

    function _completeSale(uint256 saleId, address buyer, uint256 priceUsd, uint256 ethAmount) internal {
        Sale storage sale = sales[saleId];
        
        sale.active = false;

        baseNFT.transferFrom(address(this), buyer, sale.tokenId);

        payable(sale.seller).transfer(ethAmount);
        
        // Refund any previous bidder if this was a buy now
        if (sale.currentBidder != address(0) && sale.currentBidder != buyer) {
            uint256 refundEth = usdToEth(sale.currentBidUsd);
            payable(sale.currentBidder).transfer(refundEth);
        }

        emit NFTSold(saleId, buyer, priceUsd, ethAmount);
    }

    function cancelSale(uint256 saleId) external {
        Sale storage sale = sales[saleId];
        require(sale.active, "Sale not active");
        require(sale.seller == msg.sender, "Not the seller");

        sale.active = false;

        baseNFT.transferFrom(address(this), sale.seller, sale.tokenId);

        // Refund current bidder if any
        if (sale.currentBidder != address(0)) {
            uint256 refundEth = usdToEth(sale.currentBidUsd);
            payable(sale.currentBidder).transfer(refundEth);
        }
    }

    function getSale(uint256 saleId) external view returns (Sale memory) {
        return sales[saleId];
    }
    
    function getCurrentPrice(uint256 saleId) external view returns (uint256 usdPrice, uint256 ethPrice) {
        Sale storage sale = sales[saleId];
        require(sale.active, "Sale not active");
        
        uint256 currentUsdPrice = sale.currentBidUsd > 0 ? sale.currentBidUsd : sale.listPriceUsd;
        return (currentUsdPrice, usdToEth(currentUsdPrice));
    }
    
    function getRequiredEthForBuyNow(uint256 saleId) external view returns (uint256) {
        Sale storage sale = sales[saleId];
        require(sale.active, "Sale not active");
        return usdToEth(sale.buyNowPriceUsd);
    }
} 