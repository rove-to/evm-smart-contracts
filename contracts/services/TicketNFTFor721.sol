// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "../utils/ERC1155Tradable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "../governance/ParameterControl.sol";
/*
 * [] Use ERC1155 https://docs.openzeppelin.com/contracts/3.x/erc1155
 * [] 
 *
 */

contract TicketNFTFor721 is ERC1155Tradable {
    event ParameterControlChanged (address previous, address new_);

    using Counters for Counters.Counter;
    using SafeMath for uint256;
    Counters.Counter private _tokenIds;
    uint256 public newItemId;
    address public parameterControlAdd;
    mapping(address => bool) whiteList;
    mapping(uint256 => address) whiteListToken;

    constructor(address admin, address operator, address _parameterAdd)
    ERC1155Tradable(
        "Rove Tickets for ERC721",
        "RTs",
        "", admin, operator
    ) public {
        require(_parameterAdd != address(0x0), "ADDRES_INVALID");
        parameterControlAdd = _parameterAdd;
    }

    function changeWhitelist(address _erc721, bool approved) external operatorOnly {
        require(_erc721 != address(0), "ADDRESS_INVALID");
        whiteList[_erc721] = approved;
    }

    function changeParameterControl(address _new) external {
        require(msg.sender == admin, "ADMIN_ONLY");
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "ADMIN_ONLY");
        require(_new != address(0x0), "ADDRESS_INVALID");

        address previousParameterControl = parameterControlAdd;
        parameterControlAdd = _new;
        emit ParameterControlChanged(previousParameterControl, parameterControlAdd);
    }

    function userMint(address _to,
        uint256 _id,
        uint256 _quantity,
        bytes memory _data
    ) public payable override {
        require(_exists(_id), "NONEXIST_TOKEN");
        require(_quantity == 1, "MAX_QUANTITY");
        if (price_tokens[_id] > 0) {
            require(msg.value >= price_tokens[_id] * _quantity, "MISS_PRICE");
        }
        if (max_supply_tokens[_id] != 0) {
            require(tokenSupply[_id].add(_quantity) <= max_supply_tokens[_id], "REACH_MAX");
        }
        // check whitelist erc721
        address _erc721Add = whiteListToken[_id];
        require(whiteList[_erc721Add], "APPROVED_ERC721");
        ERC721 _erc721 = ERC721(_erc721Add);
        require(_erc721.balanceOf(msgSender()) >= 1, "NOT_OWNER_ERC721");

        _mint(_to, _id, _quantity, _data);
        tokenSupply[_id] = tokenSupply[_id].add(_quantity);

        emit MintEvent(_to, _id, _quantity);
    }

    function publishTicket(address recipient, address erc721, uint256 initialSupply, string memory tokenURI, uint256 price, uint256 max)
    external
    returns (uint256)
    {
        require(!whiteList[erc721], "IS_EXISTEd");
        _tokenIds.increment();
        newItemId = _tokenIds.current();
        whiteList[erc721] = true;
        whiteListToken[newItemId] = erc721;
        create(recipient, newItemId, initialSupply, tokenURI, "0x", price, max);
        return newItemId;
    }
}
