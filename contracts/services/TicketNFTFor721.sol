// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "../utils/ERC1155Tradable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../governance/ParameterControl.sol";
/*
 * [] Use ERC1155 https://docs.openzeppelin.com/contracts/3.x/erc1155
 * [] 
 *
 */

contract TicketNFTFor721 is ERC1155Tradable {
    event ParameterControlChanged (address previous, address new_);

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    uint256 public newItemId;
    address public parameterControlAdd;
    mapping(address => bool) whiteList;
    mapping(uint256 => address) whiteListToken;
    mapping(address => mapping(uint256 => bool)) minted;

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

    function userMint(address _to,
        uint256 _id,
        uint256 _quantity,
        bytes memory _data
    ) public payable override {
        require(_exists(_id), "NONEXIST_TOKEN");
        require(_quantity == 1, "MAX_QUANTITY");
        if (price_tokens[_id] > 0) {
            require(msg.value >= price_tokens[_id], "MISS_PRICE");
        }
        if (max_supply_tokens[_id] != 0) {
            require(tokenSupply[_id] + 1 <= max_supply_tokens[_id], "REACH_MAX");
        }

        /* check erc-721 */
        // check whitelist erc721
        address _erc721Add = whiteListToken[_id];
        require(whiteList[_erc721Add], "APPROVED_ERC721");
        ERC721 _erc721 = ERC721(_erc721Add);
        // get token erc721 id from _data
        uint256 _erc721Id = sliceUint(_data, 0);
        // check owner token id
        require(_erc721.ownerOf(_erc721Id) == msgSender(), "NOT_OWNER_ERC721");
        // check token not minted 
        require(!minted[_erc721Add][_erc721Id], "MINTED");

        // marked this erc721 token id is minted ticket
        minted[_erc721Add][_erc721Id] = true;

        _mint(_to, _id, 1, _data);
        tokenSupply[_id] = tokenSupply[_id] + 1;

        // check purchaseFee
        if (price_tokens[_id] > 0) {
            ParameterControl _p = ParameterControl(parameterControlAdd);
            uint256 purchaseFeePercent = _p.getUInt256("TICKET_721_PUR_FEE");
            uint256 fee = msg.value * purchaseFeePercent / 10000;
            (bool success,) = creators[_id].call{value : msg.value - fee}("");
            require(success, "FAIL");
        }
        
        emit MintEvent(_to, _id, 1);
    }

    function publishTicket(address recipient, address erc721, uint256 initialSupply, string memory tokenURI, uint256 price, uint256 max)
    external payable
    returns (uint256)
    {
        ParameterControl _p = ParameterControl(parameterControlAdd);
        uint256 publishFee = _p.getUInt256("TICKET_721_PUB_FEE");
        if (publishFee > 0) {
            require(msg.value >= publishFee, "MISS_PUBLISH_FEE");
        }
        
        ERC721 _erc721Token = ERC721(erc721);
        require(_erc721Token.supportsInterface(type(IERC721).interfaceId), "NOT_ERC721");
        require(!whiteList[erc721], "IS_EXISTEd");
        _tokenIds.increment();
        newItemId = _tokenIds.current();
        // marked whitelist for this erc721 contract
        whiteList[erc721] = true;
        // marked token id ticket for erc721 contract
        whiteListToken[newItemId] = erc721;
        // create token ticket
        create(recipient, newItemId, initialSupply, tokenURI, "0x", price, max);
        return newItemId;
    }
}
