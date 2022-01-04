// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IParameterControl.sol";
import "./IPebble.sol";
import "./IRockNFT.sol";

/**
 * @dev Implementation of the Metaverse element in Rove
 *
 * TODO:
 * [x] Minting metaverse
 * [ ] Minting rocks
 * [ ] Metaverse DAO
 *
 */

contract MetaverseNFT is AccessControl, ERC721URIStorage {

        struct Metaverse {
                string name;
                address owner;
                uint256[] rocks;
                uint256 salesTax;
                uint256 treasuryBalance;
        }

        using Counters for Counters.Counter;
        Counters.Counter private _counter;

        IParameterControl _parameterControl;
        IPebble _pebble;
        IRockNFT _rockNFT;

        mapping(uint256 => Metaverse) private _metaverses;

        modifier onlyOwner(uint256 metaverseId) {
                require(_metaverses[metaverseId].owner == msg.sender, "MetaverseNFT: not the owner");
                _;
        }

        constructor(
                IParameterControl parameterControl,
                IPebble pebble
        ) 
                ERC721("Metaverse", "W") 
        {
                _parameterControl = parameterControl;
                _pebble = pebble;
        }

        function mintMetaverse(string memory name, string memory tokenURI)
                external
                returns (uint256)
        {
                _pebble.transferFrom(msg.sender, address(this), _parameterControl.get("metaverseMintingFee")); 

                _counter.increment();
                uint256 i = _counter.current();

                Metaverse storage w = _metaverses[i];
                w.name = name;
                w.owner = msg.sender;

                _mint(msg.sender, i);
                _setTokenURI(i, tokenURI);

                return i;
        }

        function mintRock(address rover, uint256 metaverseId, string memory tokenURI) 
                external
                onlyOwner(metaverseId)
                returns (uint256)
        {
                uint256 rockId = _rockNFT.mintRock(rover, metaverseId, tokenURI);
                _metaverses[metaverseId].rocks.push(rockId);
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
