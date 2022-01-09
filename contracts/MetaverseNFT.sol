// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IParameterControl.sol";
import "./IRove.sol";
import "./IRockNFT.sol";
import "./utils/constants.sol";
/**
 * @dev Implementation of the Metaverse element in Rove
 *
 * Each metaverse comes with the first 100 rocks.
 *
 * TODO:
 * [x] Mint a metaverse
 * [x] Minting gensis rocks
 * [x] Revenue
 * [x] Expenditure
 * [ ] Metaverse DAO
 *
 */

contract MetaverseNFT is AccessControl, ERC721URIStorage, Constant {

        struct Metaverse {
                uint256 treasury;
                Revenue revenue;
                Expenditure expenditure;
        }

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

        using Counters for Counters.Counter;
        Counters.Counter private _counter;

        IParameterControl _globalParameters;
        IRove _rove;
        IRockNFT _rockNFT;

        mapping(uint256 => Metaverse) private _metaverses;
        mapping(uint256 => uint256) private _propertyTaxes; // outstanding property taxes (rockId, tax)

        modifier onlyOwner(uint256 metaverseId) {
                require(ownerOf(metaverseId) == msg.sender, "MetaverseNFT: not the founder");
                _;
        }

        event NewMetaverse(address owner, uint256 metaverseId, uint256[] rocks, uint256[] rentalFees, string[] rockTokenURIs, string tokenURI);
        event Breed(address owner, uint256 dadId, uint256 momId, uint256 rockId, uint256 metaverseId, uint256 rentalFee);

        constructor(
                IParameterControl globalParameters,
                IRove rove,
                IRockNFT rock
        ) 
                ERC721("Metaverse", "M") 
        {
                _globalParameters = globalParameters;
                _rove = rove;
                _rockNFT = rock;
        }

        function mintMetaverse(
                address founder,
                uint256[] memory rentalFees,
                string[] memory rockTokenURIs,
                Revenue memory revenue,
                Expenditure memory expenditure,
                string memory tokenURI
        )
                external
                returns (uint256)
        {
                require(rentalFees.length == rockTokenURIs.length, "MetaverseNFT: input rentalFees and tokeURI are not match");
                require(rentalFees.length > 1, "MetaverseNFT: at least 2 genesis rocks created");
                _rove.transferFrom(founder, address(this), _globalParameters.get(METAVERSE_MINTING_FEE)); 
                _counter.increment();
                uint256 i = _counter.current();

                Metaverse storage m = _metaverses[i];
                m.revenue = revenue;
                m.expenditure = expenditure;

                _mint(founder, i);
                _setTokenURI(i, tokenURI);
                uint[] memory rocks = new uint256[](rentalFees.length);
                rocks = _mintGenesisRocks(i, founder, rentalFees.length, rentalFees, rockTokenURIs);

                emit NewMetaverse(founder, i, rocks, rentalFees, rockTokenURIs, tokenURI);
                return i;
        }

        function _mintGenesisRocks(
                uint256 metaverseId, 
                address owner, 
                uint256 numberOfGenesisRocks,
                uint256[] memory rentalFees,
                string[] memory rockTokenURIs
        ) 
                internal 
                returns (uint256[] memory)
        {
                uint256[] memory rocks = new uint256[](numberOfGenesisRocks);
                for (uint256 i = 0; i < numberOfGenesisRocks; i++) {
                        rocks[i] = _rockNFT.mintRock(metaverseId, owner, rentalFees[i], rockTokenURIs[i]);
                }

                return rocks;
        }

        // @dev given 2 rock parents, breed a new child rock
        // TODO: should we let N rock parents where N > 2?
        function breedRock(
                uint256 metaverseId, 
                uint256 dadId, 
                uint256 momId, 
                uint256 rentalFee,
                string memory tokenURI
        ) 
                external 
                returns (uint256) 
        {
                address owner = msg.sender;
                uint256 platformGlobalFee = _globalParameters.get(ROCK_BREEDING_FEE);
                uint256 metaverseLocalFee = _metaverses[metaverseId].revenue.breedingFee;

                _rove.transferFrom(owner, address(this), platformGlobalFee + metaverseLocalFee);
                _metaverses[metaverseId].treasury += metaverseLocalFee;

                uint256 childId = _rockNFT.breedRock(metaverseId, owner, dadId, momId, rentalFee, tokenURI);

                emit Breed(owner, dadId, momId, childId, metaverseId, rentalFee);
                return childId;
        }

        function owePropertyTax(uint256 rockId) external view returns (bool) {
                return _propertyTaxes[rockId] > 0;
        }

        function setRevenue(uint256 metaverseId, Revenue memory revenue) external onlyOwner(metaverseId) {
                _metaverses[metaverseId].revenue = revenue;
        }

        function getRevenue(uint256 metaverseId) external view returns(Revenue memory) {
                return _metaverses[metaverseId].revenue;
        }

        function setExpenditure(uint256 metaverseId, Expenditure memory expenditure) external onlyOwner(metaverseId) {
                _metaverses[metaverseId].expenditure = expenditure;
        }                

        function getExpenditure(uint256 metaverseId) external view returns(Expenditure memory) {
                return _metaverses[metaverseId].expenditure;
        }

        function supportsInterface(bytes4 interfaceId) 
                public 
                view 
                virtual 
                override(AccessControl, ERC721) 
                returns (bool) 
        { 
                return 
                        interfaceId == type(IERC721).interfaceId || 
                        interfaceId == type(IERC721Metadata).interfaceId || 
                        super.supportsInterface(interfaceId);
        }

        // function setBreedingFee(uint256 metaversId, uint256 breedingFee) external {
        //         _metaverses[metaversId].revenue.breedingFee = breedingFee;
        // }

        // function setSalesTaxRate(uint256 metaversId, uint256 salesTaxRate) external {
        //         _metaverses[metaversId].revenue.salesTaxRate = salesTaxRate;
        // }

        // function setPropertyTaxRate(uint256 metaversId, uint256 propertyTaxRate) external {
        //         _metaverses[metaversId].revenue.propertyTaxRate = propertyTaxRate;
        // }

        // function setKickstartReward(uint256 metaversId, uint256 kickstartReward) external {
        //         _metaverses[metaversId].expenditure.kickstartReward = kickstartReward;
        // }
        
        // function setCreatorReward(uint256 metaversId, uint256 creatorReward) external {
        //         _metaverses[metaversId].expenditure.creatorReward = creatorReward;
        // }

        // function setAudienceReward(uint256 metaversId, uint256 audienceReward) external {
        //         _metaverses[metaversId].expenditure.audienceReward = audienceReward;
        // }

        // function getBreedingFee(uint256 metaversId) external view returns (uint256) {
        //         return _metaverses[metaversId].revenue.breedingFee;
        // }

        // function getSalesTaxRate(uint256 metaversId) external view returns (uint256) {
        //         return _metaverses[metaversId].revenue.salesTaxRate;
        // }

        // function getPropertyTaxRate(uint256 metaversId) external view returns (uint256) {
        //         return _metaverses[metaversId].revenue.propertyTaxRate;
        // }

        // function getKickstartReward(uint256 metaversId) external view returns (uint256) {
        //         return _metaverses[metaversId].expenditure.kickstartReward;
        // }

        // function getCreatorReward(uint256 metaversId) external view returns (uint256) {
        //         return _metaverses[metaversId].expenditure.creatorReward;
        // }

        // function getAudienceReward(uint256 metaversId) external view returns (uint256) {
        //         return _metaverses[metaversId].expenditure.audienceReward;
        // }
}
