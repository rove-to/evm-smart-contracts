pragma solidity ^0.8.0;

interface ITicketNFT {

        function mintTicket(address to, string memory tokenURI) external returns (uint256);
        function ownerOf(uint256 tokenId) external view returns (address owner);

}
