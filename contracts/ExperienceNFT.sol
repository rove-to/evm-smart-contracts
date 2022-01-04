// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; 

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./ITicketNFT.sol";
import "./IRockNFT.sol";
import "./IProtocolParameters.sol";
import "./IPebble.sol";

/*
 * TODO:
 * [x] Minting
 * [x] Buy ticket
 * [x] Split payment
 * [ ] Rock tax
 *
 */

contract ExperienceNFT is AccessControl, ERC721URIStorage {

        struct Experience {
                address host;
                DAO creators;
                string name;
                uint256 price;
                uint256 watchLaterPrice;
                State state;
                uint256 revenue;
        }

        // Every experience is a "mini" DAO of creators. 
        struct DAO {
                uint256 totalShares;
                mapping(address => uint256) shares;
        }

        enum State {
                MINTED,
                STARTED,
                ENDED
        }

        using Counters for Counters.Counter;
        Counters.Counter private _counter;

        mapping(uint256 => Experience) private _experiences;

        ITicketNFT private _ticketNFT;
        IRockNFT private _rockNFT;
        IProtocolParameters private _protocol;
        IPebble _pebble;

        modifier onlyHost(uint256 experienceId) {
                require(_experiences[experienceId].host == msg.sender, "ExperienceNFT: not the host");
                _;
        }

        modifier onlyCreator(uint256 experienceId) {
                require(_experiences[experienceId].creators.shares[msg.sender] > 0, "ExperienceNFT: not a creator");
                _;
        }

        constructor(
                ITicketNFT ticketNFT, 
                IRockNFT rockNFT, 
                IProtocolParameters protocol,
                IPebble pebble
        ) 
                ERC721("Experience", "E") 
        {
                _ticketNFT = ticketNFT;
                _rockNFT = rockNFT;
                _protocol = protocol;
                _pebble = pebble;
        }

        function mintExperience(
                uint256 rockId,
                string memory name,
                string memory experienceType,
                uint256 price,
                uint256 watchLaterPrice,
                string memory tokenURI
        )
                external
                returns (uint256)
        {
                address host = msg.sender;

                // the host must either own or rent the rock
                require(_rockNFT.hasAccess(host, rockId));

                // pay hosting fees
                uint256 hostingFee = _protocol.getHostingFee(experienceType);
                if (hostingFee > 0) 
                        _pebble.transferFrom(host, address(this), hostingFee);

                // mint the experience
                _counter.increment();
                uint256 i = _counter.current();
                Experience storage e = _experiences[i]; 
                e.host = host;
                e.name = name;
                e.price = price;
                e.watchLaterPrice = watchLaterPrice;
                e.state = State.MINTED;
                _mint(host, i);
                _setTokenURI(i, tokenURI);

                return i;
        }

        function updateCreators(
                uint256 experienceId, 
                address[] memory creators, 
                uint256[] memory shares
        ) 
                external 
                onlyHost(experienceId)
        {
                require(creators.length == shares.length, "ExperienceNFT: creators & shares length mismatch");
                require(creators.length > 0, "ExperienceNFT: no creators");

                for (uint256 i = 0; i < creators.length; i++) 
                        updateCreator(experienceId, creators[i], shares[i]);
        }

        function updateCreator(
                uint256 experienceId, 
                address creator, 
                uint256 shares
        ) 
                public 
                onlyHost(experienceId)
        {
                require(creator != address(0), "ExperienceNFT: creator address is 0");
                require(shares > 0, "ExperienceNFT: shares are 0");

                DAO storage creators = _experiences[experienceId].creators;

                // update new shares for the creator
                creators.totalShares = creators.totalShares - creators.shares[creator] + shares;
                creators.shares[creator] = shares;
        }

        /*
         * @dev use pull payment instead of push (safer)
         */
        function collectPayment(
                uint256 experienceId
        ) 
                external 
                onlyCreator(experienceId)
        {
                require(_experiences[experienceId].state == State.ENDED);

                DAO storage creators = _experiences[experienceId].creators;
                address creator = msg.sender;

                uint256 percentage = creators.shares[creator] / creators.totalShares;
                uint256 amount = _experiences[experienceId].revenue * percentage;
                
                require(amount > 0, "ExperienceNFT: no payment due to creator");

                _pebble.transfer(creator, amount);
        }

        function getTicket(uint256 experienceId) external {
                Experience storage e = _experiences[experienceId];

                if (e.price > 0) { 
                        _pebble.transferFrom(msg.sender, address(this), e.price); 
                        e.revenue += e.price;
                }

                _ticketNFT.mintTicket(msg.sender, tokenURI(experienceId));
        }

        function hasTicket(uint256 ticketId) external view returns (bool) {
                return _ticketNFT.ownerOf(ticketId) == msg.sender;
        }

        function endExperience(
                uint256 experienceId 
        ) 
                external 
                onlyHost(experienceId)
        {
                _experiences[experienceId].state = State.ENDED;
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
