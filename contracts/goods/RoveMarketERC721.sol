// SPDX-License-Identifier: MIT

pragma solidity 0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";

import "../governance/ParameterControl.sol";

contract RoveMarketPlaceERC721 is ReentrancyGuard, AccessControl {
    using Counters for Counters.Counter;
    Counters.Counter private _offeringNonces;

    event OfferingPlaced(bytes32 indexed offeringId, address indexed hostContract, address indexed offerer, uint tokenId, uint price, string uri);
    event OfferingClosed(bytes32 indexed offeringId, address indexed buyer);
    event BalanceWithdrawn (address indexed beneficiary, uint amount);
    event OperatorChanged (address previousOperator, address newOperator);
    event ParameterControlChanged (address previousOperator, address newOperator);
    event ApprovalForAll(address owner, address operator, bool approved);

    address public operator; // is a mutil sig address when deploy
    address public roveToken; // require using this erc-20 token in this market
    address public parameterControl;

    mapping(address => mapping(address => uint)) private _balances;

    struct benefit {
        uint256 benefitPercentCreator;
        uint256 benefitCreator;
        uint256 benefitPercentOperator;
        uint256 benefitOperator;
    }

    struct offering {
        address offerer;
        address hostContract;
        uint tokenId;
        uint price;
        bool closed;
        address erc_20_token;
    }

    struct closeOfferingData {
        address buyer;
        uint price;
        uint originPrice;
        uint256 balanceBuyer;
        uint256 approvalToken;
        address erc20Token;
    }

    mapping(bytes32 => offering) offeringRegistry;
    bytes32[] private _arrayOffering;

    constructor (address operator_, address roveToken_, address parameterControl_) {
        console.log("Deploy Rove market place operator %s, rove token %s", operator_, roveToken_);
        operator = operator_;
        _setupRole(DEFAULT_ADMIN_ROLE, operator);
        if (operator != _msgSender()) {
            _revokeRole(DEFAULT_ADMIN_ROLE, _msgSender());
        }
        roveToken = roveToken_;
        parameterControl = parameterControl_;
    }

    function arrayOffering() external view returns (bytes32[] memory) {
        return _arrayOffering;
    }

    function toHex16(bytes16 data) internal pure returns (bytes32 result) {
        result = bytes32(data) & 0xFFFFFFFFFFFFFFFF000000000000000000000000000000000000000000000000 |
        (bytes32(data) & 0x0000000000000000FFFFFFFFFFFFFFFF00000000000000000000000000000000) >> 64;
        result = result & 0xFFFFFFFF000000000000000000000000FFFFFFFF000000000000000000000000 |
        (result & 0x00000000FFFFFFFF000000000000000000000000FFFFFFFF0000000000000000) >> 32;
        result = result & 0xFFFF000000000000FFFF000000000000FFFF000000000000FFFF000000000000 |
        (result & 0x0000FFFF000000000000FFFF000000000000FFFF000000000000FFFF00000000) >> 16;
        result = result & 0xFF000000FF000000FF000000FF000000FF000000FF000000FF000000FF000000 |
        (result & 0x00FF000000FF000000FF000000FF000000FF000000FF000000FF000000FF0000) >> 8;
        result = (result & 0xF000F000F000F000F000F000F000F000F000F000F000F000F000F000F000F000) >> 4 |
        (result & 0x0F000F000F000F000F000F000F000F000F000F000F000F000F000F000F000F00) >> 8;
        result = bytes32(0x3030303030303030303030303030303030303030303030303030303030303030 +
        uint256(result) +
            (uint256(result) + 0x0606060606060606060606060606060606060606060606060606060606060606 >> 4 &
            0x0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F) * 7);
    }

    function toHex(bytes32 data) private pure returns (string memory) {
        return string(abi.encodePacked("0x", toHex16(bytes16(data)), toHex16(bytes16(data << 128))));
    }

    // NFTs's owner place offering
    function placeOffering(address _hostContract, uint _tokenId, address _erc_20_token, uint _price) external nonReentrant {
        // owner nft is sender
        address nftOwner = msg.sender;
        // require(msg.sender == _operator, "Only operator dApp can create offerings");

        // get hostContract of erc-721
        ERC721 hostContract = ERC721(_hostContract);
        require(hostContract.ownerOf(_tokenId) == nftOwner, "Invalid NFT owner");
        // check approval of erc-721 on this contract
        //        bool approval = hostContract.isApprovedForAll(nftOwner, address(this));
        //        require(approval == true, "this contract address is not approved");

        // create offering nonce by counter
        _offeringNonces.increment();
        uint256 newItemId = _offeringNonces.current();
        console.log("create offering nonce by counter: ", newItemId);

        // init offering id
        bytes32 offeringId = keccak256(abi.encodePacked(newItemId, _hostContract, _tokenId));
        // create offering by id
        offeringRegistry[offeringId].offerer = nftOwner;
        offeringRegistry[offeringId].hostContract = _hostContract;
        offeringRegistry[offeringId].tokenId = _tokenId;
        offeringRegistry[offeringId].price = _price;
        if (_erc_20_token != address(0x0)) {
            offeringRegistry[offeringId].erc_20_token = _erc_20_token;
        } else {
            offeringRegistry[offeringId].erc_20_token = roveToken;
        }
        console.log("init offeringId: %s", toHex(offeringId));

        string memory uri = hostContract.tokenURI(_tokenId);
        _arrayOffering.push(offeringId);
        emit OfferingPlaced(offeringId, _hostContract, nftOwner, _tokenId, _price, uri);
    }

    function closeOffering(bytes32 _offeringId) external nonReentrant {
        // buyer is sender
        ERC20 token = ERC20(offeringRegistry[_offeringId].erc_20_token);

        closeOfferingData memory _closeOfferingData = closeOfferingData(
            msg.sender,
            offeringRegistry[_offeringId].price,
            offeringRegistry[_offeringId].price,
            token.balanceOf(msg.sender),
            token.allowance(msg.sender, address(this)),
            offeringRegistry[_offeringId].erc_20_token
        );

        console.log("get price of offering: %s", _closeOfferingData.price);
        console.log("get balance erc-20 token of buyer %s: %s", _closeOfferingData.buyer, _closeOfferingData.balanceBuyer);
        uint256 approvalToken = token.allowance(_closeOfferingData.buyer, address(this));

        // get offer
        address hostContractOffering = offeringRegistry[_offeringId].hostContract;
        ERC721 hostContract = ERC721(hostContractOffering);
        uint tokenID = offeringRegistry[_offeringId].tokenId;
        address offerer = offeringRegistry[_offeringId].offerer;
        //        bool approval = hostContract.isApprovedForAll(offerer, address(this));

        // check require
        // check approval of erc-1155 on this contract
        //        require(approval == true, "this contract address is not approved");
        require(approvalToken >= _closeOfferingData.price, "this contract address is not approved for spending erc-20");
        require(hostContract.ownerOf(tokenID) == offerer, "Invalid NFT owner");
        require(_closeOfferingData.balanceBuyer >= _closeOfferingData.price, "Not enough funds erc-20 to buy");
        require(!offeringRegistry[_offeringId].closed, "Offering is closed");

        // transfer erc-721
        console.log("prepare safeTransferFrom offerer %s by this address %s", offerer, address(this));
        // only transfer one in this version
        hostContract.safeTransferFrom(offerer, _closeOfferingData.buyer, tokenID);
        console.log("safeTransferFrom erc-721 %s, tokenID %s from %s to buyer %s",
            hostContractOffering,
            tokenID,
            offerer
        //            buyer
        );

        // logic for 
        // benefit of operator here
        ParameterControl parameterController = ParameterControl(parameterControl);
        benefit memory _benefit = benefit(0, 0, 0, 0);
        _benefit.benefitPercentOperator = parameterController.getUInt256("MARKET_BENEFIT");
        if (_benefit.benefitPercentOperator > 0) {
            _benefit.benefitOperator = _closeOfferingData.originPrice / 100 * _benefit.benefitPercentOperator;
            _closeOfferingData.price -= _benefit.benefitOperator;
            console.log("market operator profit %s", _benefit.benefitOperator);
            // update balance(on market) of operator
            _balances[operator][_closeOfferingData.erc20Token] += _benefit.benefitOperator;
        }

        // tranfer erc-20 token to this market contract
        console.log("tranfer erc-20 token %s to this market contract %s with amount: %s", _closeOfferingData.buyer, address(this), _closeOfferingData.originPrice);
        bool success = token.transferFrom(_closeOfferingData.buyer, address(this), _closeOfferingData.originPrice);
        require(success == true, "transfer erc-20 failure");

        // update balance(on market) of offerer
        console.log("update balance of offerer: %s +%s", offerer, _closeOfferingData.price);
        _balances[offerer][_closeOfferingData.erc20Token] += _closeOfferingData.price;

        // close offering
        offeringRegistry[_offeringId].closed = true;
        console.log("close offering: ", toHex(_offeringId));

        emit OfferingClosed(_offeringId, _closeOfferingData.buyer);
    }

    function withdrawBalance(address _erc_20_token) external nonReentrant {
        address withdrawer = msg.sender;
        // check require: balance of sender in market place > 0
        console.log("balance of sender: ", _balances[withdrawer][_erc_20_token]);
        require(_balances[withdrawer][_erc_20_token] > 0, "You don't have any balance to withdraw");

        ERC20 token = ERC20(_erc_20_token);
        uint256 balance = token.balanceOf(address(this));
        console.log("balance of market place: ", balance);
        // check require balance of this market contract > sender's withdraw
        require(balance >= _balances[withdrawer][_erc_20_token], "Not enough balance for withdraw");


        // tranfer erc-20 token from this market contract to sender
        uint amount = _balances[withdrawer][_erc_20_token];
        //payable(withdrawer).transfer(amount);
        console.log("tranfer erc-20 %s from this market contract %s to sender %s", roveToken, address(this), withdrawer);
        bool success = token.transfer(withdrawer, amount);
        require(success == true, "transfer erc-20 failure");

        // reset balance
        _balances[withdrawer][_erc_20_token] = 0;
        //        roveToken.approve(withdrawer, _balances[withdrawer]);

        emit BalanceWithdrawn(withdrawer, amount);
    }

    function changeOperator(address _newOperator) external {
        require(msg.sender == operator, "only the operator can change the current operator");
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not a operator");
        require(_newOperator != address(0x0), "new operator is zero address");

        address previousOperator = operator;
        operator = _newOperator;
        _setupRole(DEFAULT_ADMIN_ROLE, operator);
        _revokeRole(DEFAULT_ADMIN_ROLE, previousOperator);
        emit OperatorChanged(previousOperator, operator);
    }

    function changeParameterControl(address _new) external {
        require(msg.sender == operator, "only the operator can change the current _parameterControl");
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "only the operator can change the current _parameterControl");
        require(_new != address(0x0), "new parametercontrol is zero address");

        address previousParameterControl = parameterControl;
        parameterControl = _new;
        emit ParameterControlChanged(previousParameterControl, parameterControl);
    }

    function viewOfferingNFT(bytes32 _offeringId) external view returns (address, uint, uint, bool){
        return (offeringRegistry[_offeringId].hostContract, offeringRegistry[_offeringId].tokenId, offeringRegistry[_offeringId].price, offeringRegistry[_offeringId].closed);
    }

    function viewBalances(address _address, address _erc_20_token) external view returns (uint) {
        return (_balances[_address][_erc_20_token]);
    }

    function operatorCloseOffering(bytes32 _offeringId) external {
        require(msg.sender == operator, "Only operator dApp can close offerings");
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not a operator");
        offeringRegistry[_offeringId].closed = true;
        emit OfferingClosed(_offeringId, address(0));
    }
}