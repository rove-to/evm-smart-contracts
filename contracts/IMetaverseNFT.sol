// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMetaverseNFT {

        // Mints a new metaverse. Rover must pay minting fee.
        // Caller: Platform
        function mintMetaverse(
                address founder,
                string memory name, 
                uint256 numberOfGenesisRocks, 
                string memory tokenURI
        ) external returns (uint256 metaverseId);

        // Breeds a new rock. Rover must pay a breeding fee.
        // Caller: Platform
        function breedRock(
                uint256 metaverseId, 
                address owner,
                uint256 dadId,
                uint256 momId,
                string memory tokenURI
        ) external returns (uint256 childId);

        // Getters
        function getRocks(uint256 metaversId) external view returns (uint256[] memory);
        function getSalesTax(uint256 metaversId) external view returns (uint256);
        function getPropertyTax(uint256 metaversId) external view returns (uint256);
        function getKickstartReward(uint256 metaversId) external view returns (uint256);
        function getCreatorReward(uint256 metaversId) external view returns (uint256);
        function getAudienceReward(uint256 metaversId) external view returns (uint256);
        function getBreedingFee(uint256 metaversId) external view returns (uint256);

        // Setters
        function setSalesTax(uint256 metaversId, uint256 salesTax) external;
        function setPropertyTax(uint256 metaversId, uint256 propertyTax) external;
        function setKickstartReward(uint256 metaversId, uint256 kickstartReward) external;
        function setCreatorReward(uint256 metaversId, uint256 creatorReward) external; 
        function setAudienceReward(uint256 metaversId, uint256 audienceReward) external;
        function setBreedingFee(uint256 metaversId, uint256 breedingFee) external; 

        // Events
        event NewMetaverse(uint256 indexed metaverseId, string indexed name, uint256 numberOfGenesisRocks);
        event NewRock(uint256 indexed rockId, uint256 indexed metaverseId, address indexed owner);
}
