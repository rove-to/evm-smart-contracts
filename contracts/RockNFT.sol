// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IParameterControl.sol";
import "./IPebble.sol";

/*
 * TODO:
 * [x] Minting
 * [x] Mint rock from 2 rocks? Aka. Breed a new rock.
 * [ ] Mint in batch?
 * [ ] Rock attributes
 * [ ] Lease
 * [ ] Rock tax
 *
 */

contract RockNFT is AccessControl, ERC721URIStorage {

        struct Rock {
                uint256 metaverseId;
                uint256 size;
                uint256 x;
                uint256 y;
                uint256 gravity;
                uint256 color;
        }

        struct Lease {
                address renter;
                uint256 from;
                uint256 to;
                uint256 base;
                uint256 revenueShare;
        }

        using Counters for Counters.Counter;
        Counters.Counter private _counter;

        IParameterControl _globalParameters;
        IPebble _pebble;

        mapping(uint256 => Rock) private _rocks;
        mapping(uint256 => Lease) private _leases;

        constructor(
                IPebble pebble,
                IParameterControl globalParameters
        ) 
                ERC721("Rock", "R") 
        {
                _pebble = pebble;
                _globalParameters = globalParameters;
        }

        function mintRock(address rover, uint256 metaverseId, string memory tokenURI)
                external
                onlyRole(DEFAULT_ADMIN_ROLE)
                returns (uint256)
        {
                _counter.increment();

                uint256 i = _counter.current();
                _rocks[i] = Rock(metaverseId, 0, 0, 0, 0, 0);
                _mint(rover, i);
                _setTokenURI(i, tokenURI);

                return i;
        }

        // @dev given 2 rock parents, breed a new child rock
        // TODO: should we let N rock parents where N > 2?
        function breedRock(uint256 dadId, uint256 momId, string memory tokenURI)
               external 
               returns (uint256) 
        {
                _pebble.transferFrom(msg.sender, address(this), _globalParameters.get("RockMintingFee")); 

                _counter.increment();
                uint256 i = _counter.current();

                Rock storage child = _rocks[i];
                Rock memory dad = _rocks[dadId];
                Rock memory mom = _rocks[momId];

                child.size = _breed(dad.size, mom.size, "size");
                child.x = _breed(dad.x, mom.x, "x");
                child.y = _breed(dad.y, mom.y, "y");
                child.gravity = _breed(dad.gravity, mom.gravity, "gravity");
                child.color = _breed(dad.color, mom.color, "color");

                _mint(msg.sender, i);
                _setTokenURI(i, tokenURI);

                return i;
        }

        // @dev a child is an offspring of mom and dad
        // TODO: move these parameters to Global Parameter contract so they can be adjusted via DAO
        function _breed(uint256 dad, uint256 mom, string memory attribute) internal view returns (uint256) {

                uint256 offspring = _random(100, attribute, dad + mom);
                uint256 child;

                if (offspring < 50) {
                        // 50% chance the child a combination of mom and dad
                        uint256 dadWeight = _random(100, attribute, dad);
                        uint256 momWeight = _random(100, attribute, mom);
                        child = (dad * dadWeight + mom * momWeight) / (dadWeight + momWeight);
                } else if (offspring < 75) {
                        // 25% chance the child is exactly like dad
                        child = dad;
                } else {
                        // 25% chance the child is exactly like mom
                        child = mom;
                }

                uint256 mutation = _random(100, attribute, dad * mom);
                if (mutation < 5) {
                        // there is a 5% chance of having a 10% decrease mutation
                        child = child * 90 / 100;
                } else if (mutation < 10) {
                        // there is a 5% chance of having a 10% increase mutation
                        child = child * 110 / 100;
                }

                return child;
        }

        // @dev generate a random number between 0 and [range]
        function _random(
                uint256 range, 
                string memory attribute, 
                uint256 value
        ) 
                internal 
                view 
                returns (uint256) 
        {
                bytes memory package = abi.encodePacked(block.difficulty, block.timestamp, attribute, value);
                uint256 randomHash = uint(keccak256(package));
                return randomHash % range;
        }

        function hasAccess(address rover, uint256 rockId) external view returns (bool) {
                return (ownerOf(rockId) == rover) || (_leases[rockId].renter == rover);
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
