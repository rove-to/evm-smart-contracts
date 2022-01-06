// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IParameterControl.sol";
import "./IRove.sol";
import "./IRockNFT.sol";

/**
 * @dev Implementation of the Metaverse element in Rove
 *
 * Each metaverse comes with the first 100 rocks.
 *
 * TODO:
 * [x] Mint a metaverse
 * [x] Minting gensis rocks
 * [x] Taxes
 * [x] Expenditure
 * [ ] Metaverse DAO
 *
 */

contract MetaverseNFT is AccessControl, ERC721URIStorage {

        struct Metaverse {
                string name;
                address founder;
                uint256[] rocks;
                uint256 treasury;
                Taxes taxes;
                Expenditure expenditure;
        }

        struct Taxes {
                uint256 salesTax;
                uint256 propertyTax;
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

        modifier onlyFounder(uint256 metaverseId) {
                require(_metaverses[metaverseId].founder == msg.sender, "MetaverseNFT: not the founder");
                _;
        }

        constructor(
                IParameterControl globalParameters,
                IRove rove
        ) 
                ERC721("Metaverse", "M") 
        {
                _globalParameters = globalParameters;
                _rove = rove;
        }

        function mintMetaverse(
                string memory name, 
                uint256 numberOfGenesisRocks,
                string memory tokenURI
        )
                external
                returns (uint256)
        {
                _rove.transferFrom(msg.sender, address(this), _globalParameters.get("METAVERSE_MINTING_FEE")); 
                _counter.increment();
                uint256 i = _counter.current();

                Metaverse storage m = _metaverses[i];
                m.name = name;
                m.founder = msg.sender;

                _mint(msg.sender, i);
                _mintGenesisRocks(i, numberOfGenesisRocks, tokenURI);
                _setTokenURI(i, tokenURI);

                return i;
        }

        // TODO: watch out for gas fee.  
        function _mintGenesisRocks(
                uint256 metaverseId, 
                uint256 numberOfGenesisRocks, 
                string memory tokenURI
        ) 
                internal 
        {
                for (uint256 i = 0; i < numberOfGenesisRocks; i++) {
                        uint256 rockId = _rockNFT.mintRock(msg.sender, metaverseId, tokenURI);
                        _metaverses[metaverseId].rocks.push(rockId);
                }
        }

        // @dev given 2 rock parents, breed a new child rock
        // TODO: should we let N rock parents where N > 2?
        function breedRock(
                uint256 metaverseId, 
                uint256 dadId, 
                uint256 momId, 
                string memory tokenURI
        ) 
                external 
                returns (uint256) 
        {
                _rove.transferFrom(msg.sender, address(this), _globalParameters.get("ROCK_BREEDING_FEE")); 
                uint256 childId = _rockNFT.breedRock(dadId, momId, tokenURI);
                _metaverses[metaverseId].rocks.push(childId);
                return childId;
        }

        function setSalesTax(uint256 metaversId, uint256 salesTax) external {
                _metaverses[metaversId].taxes.salesTax = salesTax;
        }

        function setPropertyTax(uint256 metaversId, uint256 propertyTax) external {
                _metaverses[metaversId].taxes.propertyTax = propertyTax;
        }

        function setKickstartReward(uint256 metaversId, uint256 kickstartReward) external {
                _metaverses[metaversId].expenditure.kickstartReward = kickstartReward;
        }
        
        function setCreatorReward(uint256 metaversId, uint256 creatorReward) external {
                _metaverses[metaversId].expenditure.creatorReward = creatorReward;
        }

        function setAudienceReward(uint256 metaversId, uint256 audienceReward) external {
                _metaverses[metaversId].expenditure.audienceReward = audienceReward;
        }

        function getSalesTax(uint256 metaversId) external view returns (uint256) {
                return _metaverses[metaversId].taxes.salesTax;
        }

        function getPropertyTax(uint256 metaversId) external view returns (uint256) {
                return _metaverses[metaversId].taxes.propertyTax;
        }

        function getKickstartReward(uint256 metaversId) external view returns (uint256) {
                return _metaverses[metaversId].expenditure.kickstartReward;
        }

        function getCreatorReward(uint256 metaversId) external view returns (uint256) {
                return _metaverses[metaversId].expenditure.creatorReward;
        }

        function getAudienceReward(uint256 metaversId) external view returns (uint256) {
                return _metaverses[metaversId].expenditure.audienceReward;
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
}
