// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "../utils/ERC1155Tradable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../governance/ParameterControl.sol";

/*
 * TODO:
 * [] Use ERC1155 https://docs.openzeppelin.com/contracts/3.x/erc1155
 * [] 
 *
 */

contract RockNFT is ERC1155Tradable {
    event ParameterControlChanged (address previous, address new_);

    mapping(uint256 => address) metaverseOwners;

    using SafeMath for uint256;

    address public parameterControlAdd;

    constructor(address admin, address operator, address _parameterAdd, string memory name, string memory symbol)
    ERC1155Tradable(name, symbol, "", admin, operator
    ) public {
        require(_parameterAdd != address(0x0), "ADDRES_INVALID");
        parameterControlAdd = _parameterAdd;
    }

    function create(
        address _initialOwner,
        uint256 _id,
        uint256 _initialSupply,
        string memory _uri,
        bytes memory _data,
        uint256 _price,
        uint256 _max
    ) public operatorOnly override
    returns (uint256) {
        return 0;
    }

    function _createNft(
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

        creators[_id] = operator;

        if (bytes(_uri).length > 0) {
            ParameterControl _p = ParameterControl(parameterControlAdd);
            customUri[_id] = string(abi.encodePacked(_p.get("ROCK_URI"), _uri));
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
        bytes memory _data)
    public payable override {
        _quantity = 1;
        require(_exists(_id), "NONEXIST_TOKEN");
        if (price_tokens[_id] > 0) {
            require(msg.value >= price_tokens[_id] * _quantity, "MISS_PRICE");
        } else {
            require(_quantity <= 1, "MAX_QUANTITY");
        }
        if (max_supply_tokens[_id] != 0) {
            require(tokenSupply[_id].add(_quantity) <= max_supply_tokens[_id], "REACH_MAX");
        }
        safeTransferFrom(address(this), _to, _id, _quantity, _data);
        tokenSupply[_id] = tokenSupply[_id].add(_quantity);

        // check purchaseFee
        if (price_tokens[_id] > 0) {
            ParameterControl _p = ParameterControl(parameterControlAdd);
            uint256 purchaseFeePercent = _p.getUInt256("ROCK_PUR_FEE");
            uint256 fee = msg.value * purchaseFeePercent / 10000;
            (bool success,) = metaverseOwners[t].call{value : msg.value - fee}("");
            require(success, "FAIL");
        }

        emit MintEvent(_to, _id, _quantity);
    }

    function toUint256(bytes memory _bytes)
    internal
    pure
    returns (uint256 value) {
        assembly {
            value := mload(add(_bytes, 0x20))
        }
    }

    function createNFT(address recipient, uint256 initialSupply, string[] memory tokenIds, uint256 price, uint256 max_supply)
    external payable
    {
        require(max_supply >= initialSupply, "MAX_SUPPLY_INVALID");
        require(max_supply == tokenIds.length, "MAX_SUPPLY_INVALID");

        ParameterControl _p = ParameterControl(parameterControlAdd);
        uint256 publishFee = _p.getUInt256("ROCK_PUB_FEE");
        if (publishFee > 0) {
            require(msg.value >= publishFee, "MISS_PUBLISH_FEE");
        }

        for (uint256 i = 0; i < initialSupply; i++) {
            uint256 t = toUint256(bytes(tokenIds[i]));
            _createNft(recipient, t, 1, tokenIds[i], "0x", price, 1);
            metaverseOwners[t] = _msgSender();
        }
        for (uint256 i = initialSupply; i < max_supply; i++) {
            uint256 t = toUint256(bytes(tokenIds[i]));
            _createNft(address(this), t, 1, tokenIds[i], "0x", price, 1);
            metaverseOwners[t] = _msgSender();
        }
    }
}
