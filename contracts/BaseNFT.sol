// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BaseNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _tokenIdCounter;
    
    mapping(uint256 => address) public creators;
    mapping(uint256 => uint256) public royalties; // Basis points (10000 = 100%)
    
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed owner,
        string tokenURI,
        uint256 royalty
    );
    
    constructor(
        address initialOwner
    ) ERC721("Base NFT Marketplace", "BNFT") Ownable(initialOwner) {
        _tokenIdCounter = 1;
    }
    
    function mint(
        address to,
        string memory tokenURI,
        uint256 royaltyBasisPoints
    ) public nonReentrant returns (uint256) {
        require(royaltyBasisPoints <= 1000, "Royalty cannot exceed 10%");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        creators[tokenId] = to;
        royalties[tokenId] = royaltyBasisPoints;
        
        emit NFTMinted(tokenId, to, to, tokenURI, royaltyBasisPoints);
        
        return tokenId;
    }
    
    function getCreator(uint256 tokenId) public view returns (address) {
        return creators[tokenId];
    }
    
    function getRoyalty(uint256 tokenId) public view returns (uint256) {
        return royalties[tokenId];
    }
    
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter - 1;
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}