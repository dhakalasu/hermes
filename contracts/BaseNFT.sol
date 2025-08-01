// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BaseNFT is ERC721, Ownable, ReentrancyGuard {
    uint256 private _tokenIdCounter;
    
    struct NFTData {
        string picture;        // URL to the picture
        string location;       // Event/NFT location
        uint256 datetime;      // Unix timestamp of event
        bool consumed;         // Whether NFT has been consumed
        address originalOwner; // Who originally minted it
    }
    
    mapping(uint256 => NFTData) public nftData;
    
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string picture,
        string location,
        uint256 datetime
    );
    
    event NFTConsumed(
        uint256 indexed tokenId,
        address indexed consumer
    );
    
    constructor(
        address initialOwner
    ) ERC721("Hermes Event NFT", "HENFT") Ownable(initialOwner) {
        _tokenIdCounter = 1;
    }
    
    function mint(
        string memory picture,
        string memory location,
        uint256 datetime
    ) public nonReentrant returns (uint256) {
        require(bytes(picture).length > 0, "Picture URL cannot be empty");
        require(bytes(location).length > 0, "Location cannot be empty");
        require(datetime > 0, "Datetime must be set");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(msg.sender, tokenId);
        
        nftData[tokenId] = NFTData({
            picture: picture,
            location: location,
            datetime: datetime,
            consumed: false,
            originalOwner: msg.sender
        });
        
        emit NFTMinted(tokenId, msg.sender, picture, location, datetime);
        
        return tokenId;
    }
    
    function consume(uint256 tokenId) public nonReentrant {
        require(_exists(tokenId), "Token does not exist");
        require(!nftData[tokenId].consumed, "Token already consumed");
        require(
            msg.sender == ownerOf(tokenId),
            "Only current owner can consume this NFT"
        );
        
        nftData[tokenId].consumed = true;
        
        emit NFTConsumed(tokenId, msg.sender);
    }
    
    function getNFTData(uint256 tokenId) public view returns (
        string memory picture,
        string memory location,
        uint256 datetime,
        bool consumed,
        address originalOwner,
        address currentOwner
    ) {
        require(_exists(tokenId), "Token does not exist");
        NFTData memory data = nftData[tokenId];
        return (
            data.picture,
            data.location,
            data.datetime,
            data.consumed,
            data.originalOwner,
            ownerOf(tokenId)
        );
    }
    
    function isConsumed(uint256 tokenId) public view returns (bool) {
        require(_exists(tokenId), "Token does not exist");
        return nftData[tokenId].consumed;
    }
    
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter - 1;
    }
    
    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokenId > 0 && tokenId < _tokenIdCounter;
    }
}