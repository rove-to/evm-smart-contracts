// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract NameNFT is AccessControl, ERC721 {

        struct Name {
                uint256 rock;
        }

        using Counters for Counters.Counter;
        Counters.Counter private _counter;
        mapping(uint256 => Name) private _names;
        mapping(string => bool) taken;

        constructor() ERC721("Name", "N") {}

        function mintName(address rover, string memory name)
                public
                onlyRole(DEFAULT_ADMIN_ROLE)
                returns (uint256)
        {
                require(!taken[name]);

                _counter.increment();

                uint256 i = _counter.current();
                _names[i] = Name(0);
                _mint(rover, i);
                taken[name] = true;

                return i;
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
