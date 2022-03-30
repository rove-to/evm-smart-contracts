// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "../utils/ERC1155Tradable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "../governance/ParameterControl.sol";
/*
 * [] Use ERC1155 https://docs.openzeppelin.com/contracts/3.x/erc1155
 * [] 
 *
 */

contract Ticket is ERC1155Tradable {
    event ParameterControlChanged (address previous, address new_);

    using Counters for Counters.Counter;
    using SafeMath for uint256;
    Counters.Counter private _tokenIds;
    uint256 public newItemId;
    address public parameterControlAdd;

    constructor(address admin, address operator, address _parameterAdd)
    ERC1155Tradable(
        "Rove Tickets",
        "RTs",
        "", admin, operator
    ) public {
        require(_parameterAdd != address(0x0), "ADDRES_INVALID");
        parameterControlAdd = _parameterAdd;
    }

    function changeParameterControl(address _new) external {
        require(msg.sender == admin, "ADMIN_ONLY");
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "ADMIN_ONLY");
        require(_new != address(0x0), "ADDRESS_INVALID");

        address previousParameterControl = parameterControlAdd;
        parameterControlAdd = _new;
        emit ParameterControlChanged(previousParameterControl, parameterControlAdd);
    }

    function _createTicket(
        address _initialOwner,
        uint256 _id,
        uint256 _initialSupply,
        string memory _uri,
        bytes memory _data,
        uint256 _price,
        uint256 _max
    ) internal returns (uint256) {
        require(!_exists(_id), "ALREADY_EXIST");
        if (_max > 0) {
            require(_initialSupply <= _max, "REACH_MAX");
        }

        creators[_id] = _msgSender();

        if (bytes(_uri).length > 0) {
            customUri[_id] = _uri;
            emit URI(_uri, _id);
        }

        _mint(_initialOwner, _id, _initialSupply, _data);

        tokenSupply[_id] = _initialSupply;

        price_tokens[_id] = _price;
        max_supply_tokens[_id] = _max;

        emit CreateEvent(_initialOwner, _id, _initialSupply, _uri, operator);
        return _id;
    }

    function userMint(address _to,
        uint256 _id,
        uint256 _quantity,
        bytes memory _data
    ) public payable override {
        require(_exists(_id), "NONEXIST_TOKEN");
        if (price_tokens[_id] > 0) {
            require(msg.value >= price_tokens[_id] * _quantity, "MISS_PRICE");
        } else {
            require(_quantity <= 1, "MAX_QUANTITY");
        }
        if (max_supply_tokens[_id] != 0) {
            require(tokenSupply[_id].add(_quantity) <= max_supply_tokens[_id], "REACH_MAX");
        }
        _mint(_to, _id, _quantity, _data);
        tokenSupply[_id] = tokenSupply[_id].add(_quantity);

        // check purchaseFee
        if (price_tokens[_id] > 0) {
            ParameterControl _p = ParameterControl(parameterControlAdd);
            uint256 purchaseFeePercent = _p.getUInt256("TICKET_PUR_FEE");
            uint256 fee = msg.value * purchaseFeePercent / 10000;
            (bool success,) = creators[_id].call{value : msg.value - fee}("");
            require(success, "FAIL");
        }

        emit MintEvent(_to, _id, _quantity);
    }

    function publishTicket(address recipient, uint256 initialSupply, string memory tokenURI, uint256 price, uint256 max)
    external payable
    returns (uint256)
    {
        ParameterControl _p = ParameterControl(parameterControlAdd);
        uint256 publishFee = _p.getUInt256("TICKET_PUB_FEE");
        if (publishFee > 0) {
            require(msg.value >= publishFee, "MISS_PUBLISH_FEE");
        }

        _tokenIds.increment();
        newItemId = _tokenIds.current();
        _createTicket(recipient, newItemId, initialSupply, tokenURI, "0x", price, max);

        return newItemId;
    }
}
