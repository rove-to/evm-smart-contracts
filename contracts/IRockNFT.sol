// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRockNFT {

        function mintRock(address to, uint256 metaverseId, string memory tokenURI) external returns (uint256);
        function hasAccess(address rover, uint256 rockId) external view returns (bool);
        function breedRock(uint256 dadId, uint256 momId, string memory tokenURI) external returns (uint256);
}
