// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; 

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./ITicketNFT.sol";
import "./IRockNFT.sol";
import "./IParameterControl.sol";
import "./IRove.sol";
import "./IMetaverseNFT.sol";

/*
 * TODO:
 * [x] Minting
 * [x] Buy ticket
 * [x] Split payment
 * [ ] 
 *
 */

contract ExperienceNFT is AccessControl, ERC721URIStorage {

        struct Experience {
                address host;
                DAO creators;
                uint256 price;
                uint256 watchLaterPrice;
                uint256 revenue;
                uint256 start;
                uint256 end;
                uint256 ticketLeft;
                string ticketUrl;
        }

        // Every experience is a "mini" DAO of creators. 
        struct DAO {
                uint256 totalShares;
                mapping(address => uint256) shares;
        }

        using Counters for Counters.Counter;
        Counters.Counter private _counter;

        mapping(uint256 => Experience) private _experiences;

        ITicketNFT private _ticketNFT;
        IRockNFT private _rockNFT;
        IMetaverseNFT _metaverseNFT;
        IParameterControl private _globalParameters;
        IRove _rove;
        uint constant AMPLIFY = 10000;

        modifier onlyHost(uint256 experienceId) {
                require(_experiences[experienceId].host == msg.sender, "ExperienceNFT: not the host");
                _;
        }

        modifier onlyCreator(uint256 experienceId) {
                require(_experiences[experienceId].creators.shares[msg.sender] > 0, "ExperienceNFT: not a creator");
                _;
        }

        event UpdateCreators(uint256 experienceId, address[] creators, uint256[] shares);
        event NewExperience(uint256 experienceId, uint256 start, uint256 end, string tokenURI);
        event CollectPayment(uint256 experienceId, address creator, uint256 amount);
        event NewTicket(uint256, address, string);

        constructor(
                ITicketNFT ticketNFT, 
                IRockNFT rockNFT, 
                IMetaverseNFT metaverseNFT,
                IParameterControl globalParameters,
                IRove rove
        ) 
                ERC721("Experience", "E") 
        {
                _ticketNFT = ticketNFT;
                _rockNFT = rockNFT;
                _metaverseNFT = metaverseNFT;
                _globalParameters = globalParameters;
                _rove = rove;
        }

        function mintExperience(
                uint256 rockId,
                address host,
                uint256 price,
                uint256 watchLaterPrice,
                uint256 start,
                uint256 end,
                uint256 totalTickets,
                string memory ticketUrl,
                string memory tokenURI
        )
                external
                returns (uint256)
        {
                // the rock must not owe any property tax
                require(!_metaverseNFT.owePropertyTax(rockId));

                // the host must either own or rent the rock
                // require(_rockNFT.hasAccess(_msgSender(), rockId));
                // mint the experience
                _counter.increment();
                uint256 i = _counter.current();
                _rockNFT.addTimeSlot(start, end, rockId);
                // pay rental fees
                address rockOwner = _rockNFT.ownerOf(rockId);
                require(rockOwner != address(0), "ExperienceNFT: this rock is not exist or burned");
                if (rockOwner != host) {
                        uint256 rentalFee = _rockNFT.getRentalFee(rockId);
                        if (rentalFee > 0) 
                                _rove.transferFrom(host, rockOwner, rentalFee);
                }
                Experience storage e = _experiences[i]; 
                e.host = host;
                e.price = price;
                e.watchLaterPrice = watchLaterPrice;
                e.ticketUrl = ticketUrl;
                e.ticketLeft = totalTickets;

                _mint(host, i);
                _setTokenURI(i, tokenURI);

                emit NewExperience(i, start, end, tokenURI);
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

                DAO storage _creators = _experiences[experienceId].creators;
                for (uint256 i = 0; i < creators.length; i++) {
                        require(creators[i] != address(0), "ExperienceNFT: creator address is 0");
                        require(shares[i] > 0, "ExperienceNFT: shares are 0");

                        // update new shares for the creator
                        _creators.totalShares = _creators.totalShares + shares[i] - _creators.shares[creators[i]];
                        _creators.shares[creators[i]] = shares[i];
                }

                emit UpdateCreators(experienceId, creators, shares);
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
                Experience storage e = _experiences[experienceId];
                require(block.timestamp > e.end, "ExperienceNFT: the event not ended yet");

                address creator = msg.sender;
                
                uint256 percentage = e.creators.shares[creator] * AMPLIFY / e.creators.totalShares;
                uint256 amount = e.revenue * percentage / AMPLIFY;
                
                require(amount > 0, "ExperienceNFT: no payment due to creator");

                _rove.transfer(creator, amount);

                emit CollectPayment(experienceId, creator, amount);
        }

        function getTicket(uint256 experienceId) external {
                Experience storage e = _experiences[experienceId];
                require(e.start > 0, "ExperienceNFT: this event is not exist" );
                require(block.timestamp < e.end, "ExperienceNFT: the event is ended" );
                require(e.ticketLeft > 0, "ExperienceNFT: ticket ran out of stock" );
                e.ticketLeft -= 1;
                address buyer = _msgSender();

                if (e.price > 0) { 
                        _rove.transferFrom(buyer, address(this), e.price); 
                        e.revenue += e.price;
                }

                _ticketNFT.mintTicket(buyer, e.ticketUrl);

                emit NewTicket(experienceId, buyer, e.ticketUrl);
        }

        // todo: 
        // function endExperience(
        //         uint256 experienceId 
        // ) 
        //         external 
        //         onlyHost(experienceId)
        // {
        //         _experiences[experienceId].state = State.ENDED;
        // }

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
