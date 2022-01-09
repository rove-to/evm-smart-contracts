// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMetaverseNFT {

        struct Revenue {
                uint256 breedingFee;
                uint256 salesTaxRate;
                uint256 propertyTaxRate;
        }

        struct Expenditure {
                uint256 kickstartReward;
                uint256 creatorReward;
                uint256 audienceReward;
        }

        // Mints a new metaverse. Rover must pay minting fee.
        // Caller: Platform
        function mintMetaverse(
                address founder,
                uint256[] memory rentalFees,
                string[] memory rockTokenURIs,
                string memory tokenURI
        ) external returns (uint256 metaverseId);

        // Breeds a new rock. Rover must pay a breeding fee.
        // Caller: Platform
        function breedRock(
                uint256 metaverseId, 
                address owner,
                uint256 dadId,
                uint256 momId,
                uint256 rentalFee,
                string memory tokenURI
        ) external returns (uint256 childId);

        // Returns true if the rock owes property tax
        // Caller: Experience contract
        function owePropertyTax(
                uint256 rockId
        ) external view returns (bool);

        // Getters
        // function getRocks(uint256 metaversId) external view returns (uint256[] memory);
        // function getSalesTaxRate(uint256 metaversId) external view returns (uint256);
        // function getPropertyTaxRate(uint256 metaversId) external view returns (uint256);
        // function getKickstartReward(uint256 metaversId) external view returns (uint256);
        // function getCreatorReward(uint256 metaversId) external view returns (uint256);
        // function getAudienceReward(uint256 metaversId) external view returns (uint256);
        // function getBreedingFee(uint256 metaversId) external view returns (uint256);
        function getRevenue(uint256 metaverseId) external view returns(Revenue memory);
        function getExpenditure(uint256 metaverseId) external view returns(Expenditure memory);
        function getMetaerse(uint256 metaverseId) external view returns(Expenditure memory);


        // // Setters
        // function setSalesTaxRate(uint256 metaversId, uint256 salesTaxRate) external;
        // function setPropertyTaxRate(uint256 metaversId, uint256 propertyTaxRate) external;
        // function setKickstartReward(uint256 metaversId, uint256 kickstartReward) external;
        // function setCreatorReward(uint256 metaversId, uint256 creatorReward) external; 
        // function setAudienceReward(uint256 metaversId, uint256 audienceReward) external;
        // function setBreedingFee(uint256 metaversId, uint256 breedingFee) external; 
        function setRevenue(uint256 metaverseId, Revenue memory revenue) external;
        function setExpenditure(uint256 metaverseId, Expenditure memory expenditure) external;

        // Events
        event NewMetaverse(address owner, uint256 metaverseId, uint256[] rocks, uint256[] rentalFees, string[] rockTokenURIs, string tokenURI);
        event Breed(address owner, uint256 dadId, uint256 momId, uint256 rockId, uint256 metaverseId, uint256 rentalFee);
}
