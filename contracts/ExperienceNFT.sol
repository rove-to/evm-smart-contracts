// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; 

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IParameterControl.sol";
import "./TicketNFT.sol";
import "./utils/constants.sol";

interface IRockNFT_ {
        function addTimeSlot(uint256 start, uint256 end, uint256 rockId) external;
        function ownerOf(uint256 rockId) external view returns (address);
        function getMetaverseId(uint256 rockId) external view returns (uint256); 
        function getRentalFee(uint256 rockId) external view returns (uint256);
}

interface IRove_ {
        function transferFrom(address sender, address recipient, uint amount) external;
        function transfer(address recipient, uint amount) external;
}

interface IMetaverseNFT_ {
        struct Revenue {
                uint256 breedingFee;
                uint256 salesTaxRate;
                uint256 propertyTaxRate;
        }

        struct Metaverse {
                address metaverseDAO;
                Revenue revenue;
        }
        function getMetaverseNFT(uint256 metaverseId) external view returns(Metaverse memory);
}

/*
 * TODO:
 * [x] Minting
 * [x] Buy ticket
 * [x] Split payment
 * [ ] 
 *
 */

contract ExperienceNFT is AccessControl, ERC721URIStorage, Constant {

        struct Experience {
                uint256 rockId;
                DAO creators;
                uint256 price;
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

        TicketNFT private _ticketNFT;
        IRockNFT_ private _rockNFT;
        IMetaverseNFT_ _metaverseNFT;
        IParameterControl private _globalParameters;
        IRove_ _rove;

        modifier onlyHost(uint256 experienceId) {
                require(ownerOf(experienceId) == _msgSender(), "ExperienceNFT: not the host");
                _;
        }

        modifier onlyCreator(uint256 experienceId) {
                require(_experiences[experienceId].creators.shares[_msgSender()] > 0, "ExperienceNFT: not a creator");
                _;
        }

        event UpdateCreators(uint256 experienceId, address[] creators, uint256[] shares);
        event NewExperience(uint256 experienceId, uint256 start, uint256 end, string tokenURI);
        event CollectPayment(uint256 experienceId, address creator, uint256 amount);
        event NewTicket(uint256 experienceId, address buyer, string tokenURI);
        event UpdateTicketPrice(uint256 experienceId, uint256 price);
        event TicketNFTCreated(address);

        constructor(
                address rockNFT, 
                address metaverseNFT,
                IParameterControl globalParameters,
                address rove
        ) 
                ERC721("Experience", "E") 
        {
                _ticketNFT = new TicketNFT(address(this));
                _rockNFT = IRockNFT_(rockNFT);
                _metaverseNFT = IMetaverseNFT_(metaverseNFT);
                _globalParameters = globalParameters;
                _rove = IRove_(rove);

                emit TicketNFTCreated(address(_ticketNFT));
        }

        function mintExperience(
                uint256 rockId,
                uint256 price,
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
                // require(!_metaverseNFT.owePropertyTax(rockId));

                // pay rental fees
                address host = _msgSender();
                proccessMintExperience(rockId, start, end, host);

                // mint the experience
                _counter.increment();
                uint256 i = _counter.current();
                _rockNFT.addTimeSlot(start, end, rockId);
                Experience storage e = _experiences[i]; 
                e.price = price;
                e.ticketUrl = ticketUrl;
                e.ticketLeft = totalTickets;
                e.rockId = rockId;

                _mint(host, i);
                _setTokenURI(i, tokenURI);

                emit NewExperience(i, start, end, tokenURI);
                return i;
        }

        function proccessMintExperience(
                uint256 rockId,
                uint256 start,
                uint256 end,
                address host
        ) internal {
                address rockOwner = _rockNFT.ownerOf(rockId);
                IMetaverseNFT_.Metaverse memory metaverse;
                require(rockOwner != address(0), "ExperienceNFT: this rock is not exist or burned");
                if (rockOwner != host) {
                        uint256 rockTimeCostPerUnit = _globalParameters.get(ROCK_TIME_COST_UNIT);
                        uint256 timeRange = end - start;
                        uint256 rentalFee = _rockNFT.getRentalFee(rockId) * (timeRange / rockTimeCostPerUnit + timeRange % rockTimeCostPerUnit > 0 ? 1 : 0);
                        if (rentalFee > 0) 
                                metaverse = _metaverseNFT.getMetaverseNFT(_rockNFT.getMetaverseId(rockId));
                                (uint256 globalTax, uint256 metaverseTax) = payTaxes(HOSTING_FEE, metaverse.revenue.salesTaxRate, rentalFee, metaverse.metaverseDAO);
                                rentalFee = rentalFee - globalTax - metaverseTax;
                                _rove.transferFrom(host, rockOwner, rentalFee);
                }
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
                require(block.timestamp < _experiences[experienceId].end, "ExperienceNFT: the event is ended" );

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

                address creator = _msgSender();
                uint256 amount = e.creators.shares[creator] * e.revenue / e.creators.totalShares;
                require(amount > 0, "ExperienceNFT: no payment due to creator");
                IMetaverseNFT_.Metaverse memory metaverse = _metaverseNFT.getMetaverseNFT(_rockNFT.getMetaverseId(_experiences[experienceId].rockId));
                (uint256 globalTax, uint256 metaverseTax) = payTaxes(GLOBAL_SALES_TAX, metaverse.revenue.salesTaxRate, amount, metaverse.metaverseDAO);
                amount = amount - globalTax - metaverseTax;

                e.creators.shares[creator] = 0;
                _rove.transfer(creator, amount);

                emit CollectPayment(experienceId, creator, amount);
        }

        function payTaxes(string memory global, uint256 metversePercent, uint256 amount, address metaverseDAO) internal returns(uint256 globalTax, uint256 metaverseTax) {
                globalTax = amount * _globalParameters.get(global) / MAX_PERCENT;
                if (globalTax > 0) {
                        _rove.transfer(address(uint160(_globalParameters.get(GLOBAL_ROVE_DAO))), globalTax);
                }
                metaverseTax = amount * metversePercent / MAX_PERCENT;
                if (metaverseTax > 0) {
                        _rove.transfer(metaverseDAO, metaverseTax);
                }
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

        function setPrice(uint256 experienceId, uint256 price) external onlyHost(experienceId) {
                require(block.timestamp < _experiences[experienceId].end, "ExperienceNFT: the event is ended" );
                _experiences[experienceId].price = price;

                emit UpdateTicketPrice(experienceId, price);
        }

        function getTicketNFT() external view returns (address) {
                return address(_ticketNFT);
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
