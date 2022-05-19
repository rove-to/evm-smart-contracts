// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "../utils/ERC1155TradableForRock.sol";
import "../governance/ParameterControl.sol";

/*
 * TODO:
 * [] Use ERC1155 https://docs.openzeppelin.com/contracts/3.x/erc1155
 * [] 
 *
 */
// Rock NFT for NFT Holder
contract RockNFTCollectionHolder is ERC1155TradableForRock {
    event ParameterControlChanged (address previous, address new_);
    event AddZone(uint256 _metaverseId, uint256 _zoneIndex);
    event InitMetaverse(uint256 _metaverseId);
    event EChangeZonePrice(uint256 _metaverseId, uint256 _zoneIndex, uint256 _price);
    event EChangeMetaverseOwner(uint256 _metaverseId, address _add);

    mapping(uint256 => address) public metaverseOwners;

    mapping(uint256 => mapping(uint256 => SharedStructs.zone)) public metaverseZones;
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) minted;


    using SafeMath for uint256;

    address public parameterControlAdd;

    constructor(address admin, address operator, address _parameterAdd, string memory name, string memory symbol)
    ERC1155TradableForRock(name, symbol, "", admin, operator
    ) public {
        require(_parameterAdd != address(0x0), "INV_ADD");
        parameterControlAdd = _parameterAdd;
    }

    function changeZonePrice(uint256 _metaverseId, uint256 _zoneIndex, uint256 _price) public {
        require(metaverseOwners[_metaverseId] == msgSender(), "I_A");
        require(metaverseZones[_metaverseId][_zoneIndex].rockIndexTo > 0, "I_Z");
        require(metaverseZones[_metaverseId][_zoneIndex].typeZone == 2 || metaverseZones[_metaverseId][_zoneIndex].typeZone == 3, "I_Z");
        metaverseZones[_metaverseId][_zoneIndex].price = _price;
        emit EChangeZonePrice(_metaverseId, _zoneIndex, _price);
    }

    function changeMetaverseOwner(uint256 _metaverseId, address _add) public {
        require(metaverseOwners[_metaverseId] == msgSender(), "I_A");
        require(_add != address(0x0), "I_A");
        metaverseOwners[_metaverseId] = _add;
        emit EChangeMetaverseOwner(_metaverseId, _add);
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
        uint256 _zoneIndex,
        uint256 _rockIndex,
        string memory _uri,
        bytes memory _data)
    public payable
    {
        address _mOwner = metaverseOwners[_metaverseId];
        require(_mOwner != address(0x0), "N_E_M");

        SharedStructs.zone memory _zone = metaverseZones[_metaverseId][_zoneIndex];

        require(_rockIndex >= _zone.rockIndexFrom && _rockIndex <= _zone.rockIndexTo, "I_R_I");
        uint256 _tokenId = (_metaverseId * (10 ** 9) + _zoneIndex) * (10 ** 9) + _rockIndex;
        require(!_exists(_tokenId), "E_T");

        require(_zone.rockIndexTo > 0, "I_S");
        if (_zone.typeZone == 2) {
            // erc-721 check
            address _erc721Add = _zone.collAddr;
            require(_erc721Add != address(0x0));

            require(_data.length > 0, "M_721_T");
            /* check erc-721 */
            ERC721 _erc721 = ERC721(_erc721Add);
            // get token erc721 id from _data
            uint256 _erc721Id = sliceUint(_data, 0);
            // check owner token id
            require(_erc721.ownerOf(_erc721Id) == msgSender(), "N_O_721");
            // check token not minted 
            require(!minted[_metaverseId][_erc721Add][_erc721Id], "M");

            // marked this erc721 token id is minted ticket
            minted[_metaverseId][_erc721Add][_erc721Id] = true;

            require(msg.value >= _zone.price, "M_P_N");
        } else if (_zone.typeZone == 3) {
            require(msg.value >= _zone.price, "M_P_P");
        }
        creators[_tokenId] = operator;
        if (bytes(_uri).length > 0) {
            customUri[_tokenId] = _uri;
            emit URI(_uri, _tokenId);
        }
        _mint(_to, _tokenId, 1, _data);

        // check user mint fee
        if (_zone.price > 0) {
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

    function checkZone(SharedStructs.zone memory _zone) internal returns (bool) {
        if (_zone.typeZone != 2 || _zone.typeZone != 3) {
            return false;
        }
        if (_zone.zoneIndex >= 10 ** 9 || _zone.rockIndexFrom >= 10 ** 9 || _zone.rockIndexTo >= 10 ** 9) {
            return false;
        }
        if (_zone.rockIndexTo > 0) {
            if (_zone.typeZone == 2) {
                if (_zone.collAddr == address(0x0)) {
                    return false;
                }

            } else if (_zone.typeZone == 3) {
                if (_zone.price == 0) {
                    return false;
                }
            }
            if (_zone.rockIndexFrom > _zone.rockIndexTo || _zone.rockIndexFrom == 0) {
                return false;
            }
            return true;
        } else {
            return false;
        }
    }

    function addZone(
        uint256 _metaverseId,
        SharedStructs.zone memory _zone)
    external payable {
        require(metaverseOwners[_metaverseId] != address(0x0), "N_E_M");
        require(metaverseZones[_metaverseId][_zone.zoneIndex].rockIndexTo <= 0, "E_Z");
        require(metaverseOwners[_metaverseId] == msgSender(), "I_A");
        require(checkZone(_zone), "I_ZONE");
        require(_zone.typeZone == 2 && _zone.typeZone == 3, "INV_TYPE");

        // get params
        ParameterControl _p = ParameterControl(parameterControlAdd);
        // get fee for imo
        uint256 imoFEE = _p.getUInt256("INIT_IMO_FEE");
        if (imoFEE > 0) {
            require(msg.value >= imoFEE * (_zone.rockIndexTo - _zone.rockIndexFrom + 1), "MISS_INI_FEE");
        }

        metaverseZones[_metaverseId][_zone.zoneIndex] = _zone;

        emit AddZone(_metaverseId, _zone.zoneIndex);
    }

    function initMetaverse(
        uint256 _metaverseId,
        SharedStructs.zone memory _zone2
    )
    external payable
    {
        require(metaverseOwners[_metaverseId] == address(0x0), "E_M");
        require(_zone2.typeZone == 2, "I_Z2");
        require(_zone2.price == 0, "I_Z2");
        require(checkZone(_zone2), "I_Z2");

        // get params
        ParameterControl _p = ParameterControl(parameterControlAdd);

        uint256 size = _p.getUInt256("INIT_IMO_NFT_HOLDER_SIZE");
        _zone2.rockIndexFrom = 1;
        if (size > 0) {
            _zone2.rockIndexTo = size;
        } else {
            _zone2.rockIndexTo = 100;
            // default size init
        }
        uint256 totalRockSize = _zone2.rockIndexTo - _zone2.rockIndexFrom + 1;
        require(totalRockSize > 0, "I_Z2");

        // get fee for imo
        uint256 imoFEE = _p.getUInt256("INIT_IMO_FEE");
        if (imoFEE > 0) {
            require(msg.value >= imoFEE * totalRockSize, "I_F");
        }


        metaverseOwners[_metaverseId] = operator;
        metaverseZones[_metaverseId][_zone2.zoneIndex] = _zone2;

        emit InitMetaverse(_metaverseId);
    }
}