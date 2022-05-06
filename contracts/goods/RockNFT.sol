// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "../utils/ERC1155Tradable.sol";
import "../governance/ParameterControl.sol";

/*
 * TODO:
 * [] Use ERC1155 https://docs.openzeppelin.com/contracts/3.x/erc1155
 * [] 
 *
 */

contract RockNFT is ERC1155Tradable {
    event ParameterControlChanged (address previous, address new_);

    mapping(string => address) public metaverseOwners;

    // for rock by public
    mapping(string => uint256) public metaversePublicRocksSize;
    mapping(string => uint256) public metaversePublicRockPrice;


    using SafeMath for uint256;

    address public parameterControlAdd;

    constructor(address admin, address operator, address _parameterAdd, string memory name, string memory symbol)
    ERC1155Tradable(name, symbol, "", admin, operator
    ) public {
        require(_parameterAdd != address(0x0), "ADD_INVALID");
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

    function mint(
        address _to,
        uint256 _id,
        uint256 _quantity,
        bytes memory _data
    ) public override creatorOnly(_id) {

    }

    function userMint(address _to,
        uint256 _id,
        uint256 _quantity,
        bytes memory _data)
    public payable override {

    }

    function mintRock(
        string memory _metaverseId,
        address _to,
        uint256 _id,
        string memory _uri,
        bytes memory _data)
    public payable
    {
        require(metaverseOwners[_metaverseId] != address(0x0), "N_EXI_M");
        require(!_exists(_id), "ALREADY_EXIST");

        // rock as public: run when no rocks base on erc-721 or minted full rock base on erc-721 
        require(metaversePublicRocksSize[_metaverseId] > 0, "OOS");
        if (price_tokens[_id] > 0) {
            require(msg.value >= price_tokens[_id], "MISS_PRI_P");
        } else {
            require(msg.value >= metaversePublicRockPrice[_metaverseId], "MISS_PRI_P");
        }

        metaversePublicRocksSize[_metaverseId]--;
        creators[_id] = operator;
        if (bytes(_uri).length > 0) {
            customUri[_id] = _uri;
            emit URI(_uri, _id);
        }
        _mint(_to, _id, 1, _data);

        // check user mint fee
        if (price_tokens[_id] > 0 || metaversePublicRockPrice[_metaverseId] > 0) {
            ParameterControl _p = ParameterControl(parameterControlAdd);
            uint256 purchaseFeePercent = _p.getUInt256("ROCK_PUR_FEE");
            uint256 fee = msg.value * purchaseFeePercent / 10000;
            (bool success,) = metaverseOwners[_metaverseId].call{value : msg.value - fee}("");
            require(success, "FAIL");
        }

        emit MintEvent(_to, _id, 1);
    }

    function initMetaverse(string memory metaverseId,
        uint256 pricePublic,
        uint256 rockIdsPublicSize
    )
    external payable
    {
        require(metaverseOwners[metaverseId] == address(0x0), "E_M");

        // get params
        ParameterControl _p = ParameterControl(parameterControlAdd);
        // get fee for imo
        uint256 imoFEE = _p.getUInt256("INIT_IMO_FEE");
        if (imoFEE > 0) {
            require(msg.value >= imoFEE * rockIdsPublicSize, "MISS_INI_FEE");
        }

        // -- rock as public
        if (rockIdsPublicSize > 0) {
            require(pricePublic > 0, "MISS_PRI_P");
            // set price
            metaversePublicRockPrice[metaverseId] = pricePublic;
            // set rocks list
            metaversePublicRocksSize[metaverseId] = rockIdsPublicSize;
        }
    }
}
