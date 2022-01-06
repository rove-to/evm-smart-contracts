// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRockNFT {

        // Getters
        function getCapacity(uint256 rockId) external view returns (uint256);
        function getCoordinateX(uint256 rockId) external view returns (uint256);
        function getCoordinateY(uint256 rockId) external view returns (uint256);
        function getComplexity(uint256 rockId) external view returns (uint256);

        // Setters
        function setCapacity(uint256 rockId, uint256 capacity) external;
        function setCoordinateX(uint256 rockId, uint256 x) external;
        function setCoordinateY(uint256 rockId, uint256 y) external;
        function setComplexity(uint256 rockId, uint256 complexity) external;
        
        // Checks if a rover owns a rock or is renting a rock
        // Caller: Experience contract
        function hasAccess(address rover, uint256 rockId) external view returns (bool);

        // Mints a new rock with random attributes
        // Caller: Metaverse contract
        function mintRock(
                uint256 metaverseId, 
                address owner, 
                string memory tokenURI
        ) external returns (uint256 rockId);

        // Breeds a new rock from its parents
        // Caller: Metaverse contract
        function breedRock(
                uint256 metaverseId, 
                address owner, 
                uint256 dadId, 
                uint256 momId, 
                string memory tokenURI
        ) external returns (uint256 childId);
}
