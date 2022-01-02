pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract RockNFT is AccessControl, ERC721URIStorage {

        struct Rock {
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
        mapping(uint256 => Rock) private _rocks;
        mapping(uint256 => Lease) private _leases;

        constructor() ERC721("Rock", "R") {}

        function mintRock(address rover, string memory tokenURI)
                public
                onlyRole(DEFAULT_ADMIN_ROLE)
                returns (uint256)
        {
                _counter.increment();

                uint256 i = _counter.current();
                _rocks[i] = Rock(0, 0, 0, 0, 0);
                _mint(rover, i);
                _setTokenURI(i, tokenURI);

                return i;
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
