// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IExperienceNFT {

        // Mints a new experience. The host must pay an experience hosting fee. 
        // Caller: Platform 
        function mintExperience(
                uint256 rockId,
                address host,
                string memory name,
                string memory experienceType,
                uint256 price,
                uint256 watchLaterPrice,
                string memory tokenURI
        ) external returns (uint256 experienceId);

        // Updates the ownership of multiple creators
        // Caller: Host
        function updateCreators(
                uint256 experienceId, 
                address[] memory creators, 
                uint256[] memory shares
        ) external;

        // Updates the ownership of one creator
        // Caller: Host
        function updateCreator(
                uint256 experienceId, 
                address creator, 
                uint256 shares
        ) external;

        // Gets ticket
        // Caller: Audience
        function getTicket(uint256 experienceId) external;

        // Ends an experience
        // Caller: Host
        function endExperience(uint256 experienceId) external;

        // Collects payment
        // Caller: Creator
        function collectPayment(uint256 experienceId) external;

        // Events
        event NewExperience(uint256 indexed experienceId, uint256 indexed rockId, uint256 price);
}
