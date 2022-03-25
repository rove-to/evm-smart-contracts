// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

/*
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../governance/IParameterControl.sol";
import "../monetary/IRove.sol";
import "../goods/IRockNFT.sol";

*/
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
 *//*


contract MetaverseNFT is AccessControl, ERC721URIStorage {

        struct Metaverse {
                string name;
                address founder;
                uint256[] rocks;
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
        mapping(uint256 => uint256) propertyTaxes; // outstanding property taxes (rockId, tax)

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
                address founder,
                string memory name, 
                uint256 numberOfGenesisRocks,
                string memory tokenURI
        )
                external
                returns (uint256)
        {
                _rove.transferFrom(founder, address(this), _globalParameters.getUInt256("METAVERSE_MINTING_FEE")); 
                _counter.increment();
                uint256 i = _counter.current();

                Metaverse storage m = _metaverses[i];
                m.name = name;
                m.founder = founder;

                _mint(founder, i);
                _mintGenesisRocks(i, founder, numberOfGenesisRocks, tokenURI);
                _setTokenURI(i, tokenURI);

                return i;
        }

        // TODO: watch out for gas fee.  
        // TODO: what's the tokenURI here?
        function _mintGenesisRocks(
                uint256 metaverseId, 
                address owner,
                uint256 numberOfGenesisRocks, 
                string memory tokenURI
        ) 
                internal 
        {
                uint256 fee = 0;
                for (uint256 i = 0; i < numberOfGenesisRocks; i++) {
                        uint256 rockId = _rockNFT.mintRock(metaverseId, owner, fee, tokenURI);
                        _metaverses[metaverseId].rocks.push(rockId);
                }
        }

        // @dev given 2 rock parents, breed a new child rock
        // TODO: should we let N rock parents where N > 2?
        function breedRock(
                uint256 metaverseId, 
                address owner,
                uint256 dadId, 
                uint256 momId, 
                string memory tokenURI
        ) 
                external 
                returns (uint256) 
        {
                uint256 platformGlobalFee = _globalParameters.getUInt256("ROCK_BREEDING_FEE");
                uint256 metaverseLocalFee = _metaverses[metaverseId].revenue.breedingFee;
                uint256 rentalFee = 0;
                _rove.transferFrom(owner, address(this), platformGlobalFee + metaverseLocalFee);
                _metaverses[metaverseId].treasury += metaverseLocalFee;

                uint256 childId = _rockNFT.breedRock(metaverseId, owner, dadId, momId, rentalFee, tokenURI);
                _metaverses[metaverseId].rocks.push(childId);

                return childId;
        }

        function owePropertyTax(uint256 rockId) external view returns (bool) {
                return propertyTaxes[rockId] > 0;
        }

        function setBreedingFee(uint256 metaversId, uint256 breedingFee) external {
                _metaverses[metaversId].revenue.breedingFee = breedingFee;
        }

        function setSalesTaxRate(uint256 metaversId, uint256 salesTaxRate) external {
                _metaverses[metaversId].revenue.salesTaxRate = salesTaxRate;
        }

        function setPropertyTaxRate(uint256 metaversId, uint256 propertyTaxRate) external {
                _metaverses[metaversId].revenue.propertyTaxRate = propertyTaxRate;
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

        function getBreedingFee(uint256 metaversId) external view returns (uint256) {
                return _metaverses[metaversId].revenue.breedingFee;
        }

        function getSalesTaxRate(uint256 metaversId) external view returns (uint256) {
                return _metaverses[metaversId].revenue.salesTaxRate;
        }

        function getPropertyTaxRate(uint256 metaversId) external view returns (uint256) {
                return _metaverses[metaversId].revenue.propertyTaxRate;
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
*/
