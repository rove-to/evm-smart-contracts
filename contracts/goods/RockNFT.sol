// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "../utils/ERC1155Tradable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../governance/ParameterControl.sol";
import "hardhat/console.sol";

/*
 * TODO:
 * [] Use ERC1155 https://docs.openzeppelin.com/contracts/3.x/erc1155
 * [] 
 *
 */

contract RockNFT is ERC1155Tradable {
    event ParameterControlChanged (address previous, address new_);
    event PreCreateEvent (address _initialOwner, uint256 _id, uint256 _initialSupply, string _uri, address _operator);

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
        string memory _uri,
        bytes memory _data,
        uint256 _price
    ) internal returns (uint256) {
        require(!_exists(_id), "ALREADY_EXIST");
        creators[_id] = operator;

        if (bytes(_uri).length > 0) {
            ParameterControl _p = ParameterControl(parameterControlAdd);
            customUri[_id] = string(abi.encodePacked(_p.get("ROCK_URI"), _uri, "/json"));
            emit URI(_uri, _id);
        }

        _mint(_initialOwner, _id, 1, _data);

        tokenSupply[_id] = 1;

        price_tokens[_id] = _price;
        max_supply_tokens[_id] = 1;

        metaverseOwners[_id] = _msgSender();

        emit CreateEvent(_initialOwner, _id, 1, _uri, operator);
        return _id;
    }

    function _prepareCreateNft(
        address _initialOwner,
        uint256 _id,
        string memory _uri,
        bytes memory _data,
        uint256 _price
    ) internal returns (uint256) {
        require(!_exists(_id), "ALREADY_EXIST");
        creators[_id] = operator;

        if (bytes(_uri).length > 0) {
            ParameterControl _p = ParameterControl(parameterControlAdd);
            customUri[_id] = string(abi.encodePacked(_p.get("ROCK_URI"), _uri, "/json"));
            emit URI(_uri, _id);
        }

        tokenSupply[_id] = 1;

        price_tokens[_id] = _price;
        max_supply_tokens[_id] = 1;

        metaverseOwners[_id] = _msgSender();
        
        emit PreCreateEvent(_initialOwner, _id, 1, _uri, operator);
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
        _mint(_to, _id, _quantity, _data);

        // check purchaseFee
        if (price_tokens[_id] > 0) {
            ParameterControl _p = ParameterControl(parameterControlAdd);
            uint256 purchaseFeePercent = _p.getUInt256("ROCK_PUR_FEE");
            uint256 fee = msg.value * purchaseFeePercent / 10000;
            (bool success,) = metaverseOwners[_id].call{value : msg.value - fee}("");
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

    function createNFT(address recipient, uint256 initialSupply, uint256[] memory tokenIds, string[] memory tokenIdUris, uint256 price)
    external payable
    {
        require(tokenIds.length > 0, "INVALID_INIT");
        require(tokenIds.length >= initialSupply, "INIT_SUPPLY_INVALID");
        require(tokenIds.length == tokenIdUris.length, "TOKEN_IDS_INVALID");

        ParameterControl _p = ParameterControl(parameterControlAdd);
        uint256 imoFEE = _p.getUInt256("INIT_IMO_FEE");
        if (imoFEE > 0) {
            require(msg.value >= imoFEE * tokenIds.length, "MISS_PUBLISH_FEE");
        }

        for (uint256 i = 0; i < initialSupply; i++) {
            _createNft(recipient, tokenIds[i], tokenIdUris[i], "0x", price);
        }
        for (uint256 i = initialSupply; i < tokenIds.length; i++) {
            _prepareCreateNft(recipient, tokenIds[i], tokenIdUris[i], "0x", price);
        }
    }
}
