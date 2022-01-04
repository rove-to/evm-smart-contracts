// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IProtocolParameters.sol";
import "./IPebble.sol";
import "./IRockNFT.sol";

/*
 * TODO:
 * [x] Minting world
 * [ ] Minting rocks
 * [ ] World DAO
 *
 */

contract WorldNFT is AccessControl, ERC721URIStorage {

        struct World {
                string name;
                address owner;
                uint256[] rocks;
                uint256 salesTax;
                uint256 treasuryBalance;
        }

        using Counters for Counters.Counter;
        Counters.Counter private _counter;

        IProtocolParameters _protocol;
        IPebble _pebble;
        IRockNFT _rockNFT;

        mapping(uint256 => World) private _worlds;

        modifier onlyOwner(uint256 worldId) {
                require(_worlds[worldId].owner == msg.sender, "WorldNFT: not the owner");
                _;
        }

        constructor(
                IProtocolParameters protocol,
                IPebble pebble
        ) 
                ERC721("World", "W") 
        {
                _protocol = protocol;
                _pebble = pebble;
        }

        function mintWorld(string memory name, string memory tokenURI)
                external
                returns (uint256)
        {
                _pebble.transferFrom(msg.sender, address(this), _protocol.getWorldMintingFee()); 

                _counter.increment();
                uint256 i = _counter.current();

                World storage w = _worlds[i];
                w.name = name;
                w.owner = msg.sender;

                _mint(msg.sender, i);
                _setTokenURI(i, tokenURI);

                return i;
        }

        function mintRock(address rover, uint256 worldId, string memory tokenURI) 
                external
                onlyOwner(worldId)
                returns (uint256)
        {
                uint256 rockId = _rockNFT.mintRock(rover, worldId, tokenURI);
                _worlds[worldId].rocks.push(rockId);
                return rockId;
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
