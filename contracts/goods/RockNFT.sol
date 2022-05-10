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

    mapping(uint256 => address) public metaverseOwners;

    // for rock base on core team
    mapping(uint256 => address) public metaverseCoreTeamAddr;
    mapping(uint256 => uint256) public metaverseCoreTeamRocksSize;

    // for rock base on erc-721
    mapping(uint256 => address) public metaverseNFTColl;
    mapping(uint256 => uint256) public metaverseNFTCollRocksSize;
    mapping(uint256 => uint256) public metaverseNFTCollRockPrice;

    mapping(address => mapping(uint256 => bool)) minted;

    // for rock by public
    mapping(uint256 => uint256) public metaversePublicRocksSize;
    mapping(uint256 => uint256) public metaversePublicRockPrice;


    using SafeMath for uint256;

    address public parameterControlAdd;

    constructor(address admin, address operator, address _parameterAdd, string memory name, string memory symbol)
    ERC1155Tradable(name, symbol, "", admin, operator
    ) public {
        require(_parameterAdd != address(0x0), "ADD_INVALID");
        parameterControlAdd = _parameterAdd;
    }

    function changeNFTCollRockPrice(uint256 _metaverseId, uint256 _price) public {
        require(metaverseOwners[_metaverseId] == msgSender(), "INV_ADDR");
        metaverseNFTCollRockPrice[_metaverseId] = _price;
    }

    function changePublicRockPrice(uint256 _metaverseId, uint256 _price) public {
        require(metaverseOwners[_metaverseId] == msgSender(), "INV_ADDR");
        metaversePublicRockPrice[_metaverseId] = _price;
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
        require(bs.length >= start + 32, "OOR");
        uint256 x;
        assembly {
            x := mload(add(bs, add(0x20, start)))
        }
        return x;
    }

    function mintRock(
        uint256 _metaverseId,
        address _to,
        uint256 _rockIndex,
        string memory _uri,
        bytes memory _data)
    public payable
    {
        address _mOwner = metaverseOwners[_metaverseId];
        uint256 _mCollPrice = metaverseNFTCollRockPrice[_metaverseId];
        uint256 _mCollSize = metaverseNFTCollRocksSize[_metaverseId];
        uint256 _mPubPrice = metaversePublicRockPrice[_metaverseId];
        uint256 _mPubSize = metaversePublicRocksSize[_metaverseId];
        uint256 _mCoreSize = metaverseCoreTeamRocksSize[_metaverseId];

        require(_mOwner != address(0x0), "N_EXI_M");
        require(_rockIndex >= 1 && _rockIndex <= _mCoreSize + _mCollSize + _mPubSize, "ROCK_IDX_INV");
        uint256 _tokenId = _metaverseId * (10 ** 18) + _rockIndex;
        require(!_exists(_tokenId), "ALREADY_EXIST");

        if (_rockIndex <= _mCoreSize) {
            require(metaverseCoreTeamAddr[_metaverseId] == msgSender(), "CORE_TEAM");
        } else if (_mCoreSize < _rockIndex && _rockIndex <= _mCoreSize + _mCollSize) {
            // erc-721 check
            address _erc721Add = metaverseNFTColl[_metaverseId];
            require(_erc721Add != address(0x0));

            require(_data.length > 0, "MISS_ERC721_TOKEN");
            require(_mCollSize > 0, "OOS_");
            /* check erc-721 */
            ERC721 _erc721 = ERC721(_erc721Add);
            // get token erc721 id from _data
            uint256 _erc721Id = sliceUint(_data, 0);
            // check owner token id
            require(_erc721.ownerOf(_erc721Id) == msgSender(), "N_OWN_ERC721");
            // check token not minted 
            require(!minted[_erc721Add][_erc721Id], "MINTED");

            // marked this erc721 token id is minted ticket
            minted[_erc721Add][_erc721Id] = true;

            if (price_tokens[_tokenId] > 0) {
                require(msg.value >= price_tokens[_tokenId], "MISS_PRI_N");
            } else {
                require(msg.value >= _mCollPrice, "MISS_PRI_N");
            }
        } else {
            // rock as public: run when no rocks base on erc-721 or minted full rock base on erc-721 
            require(_mPubSize > 0, "OOS");
            if (price_tokens[_tokenId] > 0) {
                require(msg.value >= price_tokens[_tokenId], "MISS_PRI_P");
            } else {
                require(msg.value >= _mPubPrice, "MISS_PRI_P");
            }

        }
        creators[_tokenId] = operator;
        if (bytes(_uri).length > 0) {
            customUri[_tokenId] = _uri;
            emit URI(_uri, _tokenId);
        }
        _mint(_to, _tokenId, 1, _data);

        // check user mint fee
        if (price_tokens[_tokenId] > 0 || _mCollPrice > 0 || _mPubPrice > 0) {
            if (msg.value > 0) {
                ParameterControl _p = ParameterControl(parameterControlAdd);
                uint256 purchaseFeePercent = _p.getUInt256("ROCK_PUR_FEE");
                uint256 fee = msg.value * purchaseFeePercent / 10000;
                (bool success,) = _mOwner.call{value : msg.value - fee}("");
                require(success, "FAIL");
            }
        }

        emit MintEvent(_to, _tokenId, 1);
    }

    function initMetaverse(uint256 _metaverseId,
        address _coreTeamAddr,
        uint256 _rockIdsCoreTeamSize,
        address _erc721Addr,
        uint256 _priceNftColl,
        uint256 _rockIdsNFTCollsSize,
        uint256 _pricePublic,
        uint256 _rockIdsPublicSize
    )
    external payable
    {
        require(metaverseOwners[_metaverseId] == address(0x0), "E_M");
        //        require(_rockIdsCoreTeamSize <= _rockIdsNFTCollsSize, "INVALID_SIZE1");
        require(_rockIdsCoreTeamSize + _rockIdsNFTCollsSize + _rockIdsPublicSize < 10 ** 18, "INVALID_SIZE2");

        // get params
        ParameterControl _p = ParameterControl(parameterControlAdd);
        // get fee for imo
        uint256 imoFEE = _p.getUInt256("INIT_IMO_FEE");
        if (imoFEE > 0) {
            require(msg.value >= imoFEE * (_rockIdsCoreTeamSize + _rockIdsNFTCollsSize + _rockIdsPublicSize), "MISS_INI_FEE");
        }

        // metaverse owner
        metaverseOwners[_metaverseId] = msgSender();
        // rock base on core team
        metaverseCoreTeamAddr[_metaverseId] = _coreTeamAddr;
        if (_coreTeamAddr != address(0x0)) {
            require(_rockIdsCoreTeamSize > 0, "INV_CORE_TEAM");
        }
        metaverseCoreTeamRocksSize[_metaverseId] = _rockIdsCoreTeamSize;
        if (_rockIdsCoreTeamSize > 0) {
            require(_coreTeamAddr != address(0x0), "INV_CORE_TEAM");
        }
        // -- rock base on erc-721 nft collection
        metaverseNFTColl[_metaverseId] = _erc721Addr;
        if (_erc721Addr != address(0x0)) {
            require(_rockIdsNFTCollsSize > 0, "INV_COL");
            // set price
            metaverseNFTCollRockPrice[_metaverseId] = _priceNftColl;
            // set rocks list
            metaverseNFTCollRocksSize[_metaverseId] = _rockIdsNFTCollsSize;
        } else {
            require(_rockIdsNFTCollsSize == 0, "INV_COL");
        }
        // -- rock as public
        if (_rockIdsPublicSize > 0) {
            require(_pricePublic > 0, "MISS_PRI_P");
            // set price
            metaversePublicRockPrice[_metaverseId] = _pricePublic;
            // set rocks list
            metaversePublicRocksSize[_metaverseId] = _rockIdsPublicSize;
        }
    }
}
