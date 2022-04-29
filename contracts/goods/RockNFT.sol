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

    mapping(uint256 => address) public metaverseOwners;

    using SafeMath for uint256;

    address public parameterControlAdd;
    string public baseUri;

    constructor(address admin, address operator, address _parameterAdd, string memory name, string memory symbol)
    ERC1155Tradable(name, symbol, "", admin, operator
    ) public {
        require(_parameterAdd != address(0x0), "ADDRES_INVALID");
        parameterControlAdd = _parameterAdd;
        ParameterControl _p = ParameterControl(parameterControlAdd);
        string memory _baseUri = _p.get("ROCK_URI");
        setURI(_baseUri);
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

    function mint(
        address _to,
        uint256 _id,
        uint256 _quantity,
        bytes memory _data
    ) public override creatorOnly(_id) {

    }

    function _createNft(
        address _initialOwner,
        uint256 _id,
        string memory _uri,
        bytes memory _data,
        uint256 _price
    ) internal returns (uint256) {
        require(!_exists(_id), "ALREADY_EXIST");
        uint _supply = 1;

        creators[_id] = operator;
        _mint(_initialOwner, _id, _supply, _data);

        price_tokens[_id] = _price;
        metaverseOwners[_id] = _msgSender();

        emit CreateEvent(_initialOwner, _id, _supply, _uri, operator);
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
        uint _supply = 1;

        price_tokens[_id] = _price;
        metaverseOwners[_id] = _msgSender();

        emit PreCreateEvent(_initialOwner, _id, _supply, _uri, operator);
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

        creators[_id] = operator;
        _mint(_to, _id, _quantity, _data);

        // check user mint fee
        if (price_tokens[_id] > 0) {
            ParameterControl _p = ParameterControl(parameterControlAdd);
            uint256 purchaseFeePercent = _p.getUInt256("ROCK_PUR_FEE");
            uint256 fee = msg.value * purchaseFeePercent / 10000;
            (bool success,) = metaverseOwners[_id].call{value : msg.value - fee}("");
            require(success, "FAIL");
        }

        emit MintEvent(_to, _id, _quantity);
    }

    function createNFT(address recipient, uint256 initialRock, uint256[] memory rockIds, string[] memory rockURIs, uint256[] memory rockPrices)
    external payable
    {
        console.log("blockGasLimit", block.gaslimit);
        require(rockIds.length > 0, "INVALID_INIT");
        require(rockIds.length >= initialRock, "INIT_SUPPLY_INVALID");
        require(rockIds.length == rockURIs.length, "TOKEN_IDS_INVALID");

        // get params
        ParameterControl _p = ParameterControl(parameterControlAdd);
        // get fee for imo
        uint256 imoFEE = _p.getUInt256("INIT_IMO_FEE");
        if (imoFEE > 0) {
            require(msg.value >= imoFEE * rockIds.length, "MISS_PUBLISH_FEE");
        }

        // get base uri
        for (uint256 i = 0; i < initialRock; i++) {
            console.log(i, gasleft());
            _createNft(recipient, rockIds[i], rockURIs[i], "0x", rockPrices[i]);
        }
        for (uint256 i = initialRock; i < rockIds.length; i++) {
            console.log(i, gasleft());
            _prepareCreateNft(recipient, rockIds[i], rockURIs[i], "0x", rockPrices[i]);
        }
    }
}
