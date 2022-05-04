// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../utils/ERC1155Tradable.sol";
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

    mapping(string => address) public metaverseOwners;

    // for rock base on erc-721
    mapping(string => address) public metaverseNFTColl;
    mapping(string => uint256) public metaverseRocksNFTColl;
    mapping(string => uint256) public metaversePriceNFTColl;
    mapping(address => mapping(uint256 => bool)) minted;

    // for rock by public
    mapping(string => uint256) public metaverseRocksPublic;
    mapping(string => uint256) public metaversePricePublic;


    using SafeMath for uint256;

    address public parameterControlAdd;

    constructor(address admin, address operator, address _parameterAdd, string memory name, string memory symbol)
    ERC1155Tradable(name, symbol, "", admin, operator
    ) public {
        require(_parameterAdd != address(0x0), "ADDRES_INVALID");
        parameterControlAdd = _parameterAdd;
        ParameterControl _p = ParameterControl(parameterControlAdd);
        setURI(_p.get("ROCK_URI"));
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

    function sliceUint(bytes memory bs, uint start)
    internal pure
    returns (uint256)
    {
        require(bs.length >= start + 32, "OUT_OF_RANGE");
        uint256 x;
        assembly {
            x := mload(add(bs, add(0x20, start)))
        }
        return x;
    }

    function mintRock(
        string memory _metaverseId,
        address _to,
        uint256 _id,
        bytes memory _data)
    public payable
    {
        require(!_exists(_id), "ALREADY_EXIST");

        address _erc721Add = metaverseNFTColl[_metaverseId];
        if (_erc721Add != address(0x0)) {
            require(metaverseRocksNFTColl[_metaverseId] > 0, "OUT_OF_STOCK_");
            /* check erc-721 */
            ERC721 _erc721 = ERC721(_erc721Add);
            // get token erc721 id from _data
            uint256 _erc721Id = sliceUint(_data, 0);
            // check owner token id
            require(_erc721.ownerOf(_erc721Id) == msgSender(), "NOT_OWNER_ERC721");
            // check token not minted 
            require(!minted[_erc721Add][_erc721Id], "MINTED");

            // marked this erc721 token id is minted ticket
            minted[_erc721Add][_erc721Id] = true;

            if (price_tokens[_id] > 0) {
                require(msg.value >= price_tokens[_id], "MISS_PRICE_NFTCOLL");
            } else {
                require(msg.value >= metaversePriceNFTColl[_metaverseId], "MISS_PRICE_NFTCOLL");
            }

            creators[_id] = operator;
            _mint(_to, _id, 1, _data);
            metaverseRocksNFTColl[_metaverseId]--;
        } else {
            // rock as public
            require(metaverseRocksPublic[_metaverseId] > 0, "OUT_OF_STOCK");
            if (price_tokens[_id] > 0) {
                require(msg.value >= price_tokens[_id], "MISS_PRICE_PUBLIC");
            } else {
                require(msg.value >= metaversePricePublic[_metaverseId], "MISS_PRICE_PUBLIC");
            }

            creators[_id] = operator;
            _mint(_to, _id, 1, _data);
            metaverseRocksPublic[_metaverseId]--;
        }

        // check user mint fee
        if (price_tokens[_id] > 0) {
            ParameterControl _p = ParameterControl(parameterControlAdd);
            uint256 purchaseFeePercent = _p.getUInt256("ROCK_PUR_FEE");
            uint256 fee = msg.value * purchaseFeePercent / 10000;
            (bool success,) = metaverseOwners[_metaverseId].call{value : msg.value - fee}("");
            require(success, "FAIL");
        }

        emit MintEvent(_to, _id, 1);
    }

    function initMetaverse(string memory metaverseId,
        address erc721Addr,
        uint256 priceNftColl,
        uint256 rockIdNFTCollsSize,
        uint256 pricePublic,
        uint256 rockIdsPublicSize
    )
    external payable
    {
        // get params
        ParameterControl _p = ParameterControl(parameterControlAdd);
        // get fee for imo
        uint256 imoFEE = _p.getUInt256("INIT_IMO_FEE");
        if (imoFEE > 0) {
            require(msg.value >= imoFEE * (rockIdNFTCollsSize * rockIdsPublicSize), "MISS_PUBLISH_FEE");
        }

        // metaverse owner
        require(metaverseOwners[metaverseId] == address(0x0), "EXIST_METAVERSE");
        metaverseOwners[metaverseId] = msgSender();

        // -- rock base on erc-721 nft collection
        metaverseNFTColl[metaverseId] = erc721Addr;
        if (erc721Addr != address(0x0)) {
            require(rockIdNFTCollsSize > 0, "INVALID_COLLECTION_");
            // set price
            metaversePriceNFTColl[metaverseId] = priceNftColl;
            // set rocks list
            metaverseRocksNFTColl[metaverseId] = rockIdNFTCollsSize;
        } else {
            require(rockIdNFTCollsSize == 0, "INVALID_COLLECTION");
        }
        // -- rock as public
        if (rockIdsPublicSize > 0) {
            require(pricePublic > 0, "MISS_PUBLIC_PRICE");
            // set price
            metaversePricePublic[metaverseId] = pricePublic;
            // set rocks list
            metaverseRocksPublic[metaverseId] = rockIdsPublicSize;
        }
    }
}
