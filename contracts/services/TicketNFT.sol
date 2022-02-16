// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract TicketNFT is AccessControl, ERC721URIStorage {

        struct Ticket {
                uint256 experience;
                uint256 number;
        }

        using Counters for Counters.Counter;
        Counters.Counter private _counter;
        mapping(uint256 => Ticket) private _tickets;

        constructor() ERC721("Ticket", "T") {}

        function mintTicket(address rover, string memory tokenURI)
                public
                onlyRole(DEFAULT_ADMIN_ROLE)
                returns (uint256)
        {
                _counter.increment();

                uint256 i = _counter.current();
                _tickets[i] = Ticket(0, 0);
                _mint(rover, i);
                _setTokenURI(i, tokenURI);

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
