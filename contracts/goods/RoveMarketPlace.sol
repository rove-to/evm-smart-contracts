// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";

import "../utils/ERC1155Tradable.sol";
import "../governance/ParameterControl.sol";

contract RoveMarketPlace {
    using SafeMath for uint;
    using Counters for Counters.Counter;
    Counters.Counter private _offeringNonces;

    event OfferingPlaced(bytes32 indexed offeringId, address indexed hostContract, address indexed offerer, uint tokenId, uint price, string uri);
    event OfferingClosed(bytes32 indexed offeringId, address indexed buyer);
    event BalanceWithdrawn (address indexed beneficiary, uint amount);
    event OperatorChanged (address previousOperator, address newOperator);
    event ParameterControlChanged (address previousOperator, address newOperator);
    event ApprovalForAll(address owner, address operator, bool approved);

    address private _operator;
    address private _roveToken; // require using this erc-20 token in this market
    address private _parameterControl;

    mapping(address => uint) private _balances;

    struct offering {
        address offerer;
        address hostContract;
        uint tokenId;
        uint price;
        bool closed;
    }

    mapping(bytes32 => offering) offeringRegistry;
    bytes32[] private _arrayOffering;

    constructor (address operator_, address roveToken_, address parameterControl_) {
        console.log("Deploy Rove market place operator %s, rove token %s", operator_, roveToken_);
        _operator = operator_;
        _roveToken = roveToken_;
        _parameterControl = parameterControl_;
    }

    function operator() public view returns (address) {
        return _operator;
    }

    function parameterControl() public view returns (address) {
        return _parameterControl;
    }

    function roveToken() public view returns (address) {
        return _roveToken;
    }

    function arrayOffering() public view returns (bytes32[] memory) {
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
    function placeOffering(address _hostContract, uint _tokenId, uint _price) external {
        // owner nft is sender
        address nftOwner = msg.sender;
        // require(msg.sender == _operator, "Only operator dApp can create offerings");

        // get hostContract of erc-1155
        ERC1155Tradable hostContract = ERC1155Tradable(_hostContract);
        uint256 nftBalance = hostContract.balanceOf(nftOwner, _tokenId);
        console.log("nftOwner balance: ", nftBalance);
        require(nftBalance > 1, "NFT owner not enough balance");
        // check approval of erc-1155 on this contract
        bool approval = hostContract.isApprovedForAll(nftOwner, address(this));
        require(approval == true, "this contract address is not approved");

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
        console.log("init offeringId: %s", toHex(offeringId));

        string memory uri = hostContract.uri(_tokenId);
        _arrayOffering.push(offeringId);
        emit OfferingPlaced(offeringId, _hostContract, nftOwner, _tokenId, _price, uri);
    }

    function closeOffering(bytes32 _offeringId) external payable {
        // buyer is sender
        address buyer = msg.sender;

        ERC20 token = ERC20(_roveToken);
        uint price = offeringRegistry[_offeringId].price;
        console.log("get price of offering: %s", price);
        uint256 balance = token.balanceOf(buyer);
        console.log("get balance erc-20 token of buyer %s: %s", buyer, balance);
        uint256 approvalToken = token.allowance(buyer, address(this));

        // get offer
        address hostContractOffering = offeringRegistry[_offeringId].hostContract;
        ERC1155Tradable hostContract = ERC1155Tradable(hostContractOffering);
        uint tokenID = offeringRegistry[_offeringId].tokenId;
        address offerer = offeringRegistry[_offeringId].offerer;

        // check require
        require(approvalToken == price, "this contract address is not approved for spending erc-20");
        require(hostContract.balanceOf(offerer, tokenID) >= 1, "Not enough token erc-1155 to sell");
        require(balance >= price, "Not enough funds erc-20 to buy");
        require(offeringRegistry[_offeringId].closed != true, "Offering is closed");

        // transfer erc-1155
        console.log("prepare safeTransferFrom offerer %s by this address %s", offerer, address(this));
        // only transfer one in this version
        hostContract.safeTransferFrom(offerer, buyer, tokenID, 1, "0x");
        console.log("safeTransferFrom erc-1155 %s, tokenID %s from %s to buyer %s",
            hostContractOffering,
            tokenID,
            offerer
        //            buyer
        );

        // logic for 
        // profit of operator here
        /*uint256 originPrice = price;
        ParameterControl parameterController = ParameterControl(_parameterControl);
        uint256 _profitPercent = parameterController.getUInt256("MARKET_PROFIT");
        uint256 _profit = 0;
        if (_profitPercent > 0) {
            _profit = originPrice.div(100).mul(_profitPercent);
            price -= _profit;
            console.log("market operator profit %s", _profit);
            // update balance(on market) of operator
            _balances[_operator] += _profit;
        }
        // profit of minter nfts here
        _profitPercent = parameterController.getUInt256("CREATOR_PROFIT");
        _profit = 0;
        if (_profitPercent > 0) {
            _profit = originPrice.div(100).mul(_profitPercent);
            price -= _profit;
            console.log("creator profit %s", _profit);
            // update balance(on market) of creator erc-1155
            address creator = hostContract.getCreator(tokenID);
            _balances[creator] += _profit;
        }*/

        // tranfer erc-20 token to this market contract
        console.log("tranfer erc-20 token %s to this market contract %s with amount: %s", buyer, address(this), price);
        token.transferFrom(buyer, address(this), price);

        // update balance(on market) of offerer
        console.log("update balance of offerer: %s +%s", offerer, price);
        _balances[offerer] += price;

        // close offering
        offeringRegistry[_offeringId].closed = true;
        console.log("close offering: ", toHex(_offeringId));

        emit OfferingClosed(_offeringId, buyer);
    }

    function withdrawBalance() external {
        address withdrawer = msg.sender;
        // check require: balance of sender in market place > 0
        console.log("balance of sender: ", _balances[withdrawer]);
        require(_balances[withdrawer] > 0, "You don't have any balance to withdraw");

        ERC20 token = ERC20(_roveToken);
        uint256 balance = token.balanceOf(address(this));
        console.log("balance of market place: ", balance);
        // check require balance of this market contract > sender's withdraw
        require(balance >= _balances[withdrawer], "Not enough balance for withdraw");


        // tranfer erc-20 token from this market contract to sender
        uint amount = _balances[withdrawer];
        //payable(withdrawer).transfer(amount);
        console.log("tranfer erc-20 %s from this market contract %s to sender %s", _roveToken, address(this), withdrawer);
        token.transfer(withdrawer, amount);

        // reset balance
        _balances[withdrawer] = 0;
        //        roveToken.approve(withdrawer, _balances[withdrawer]);

        emit BalanceWithdrawn(withdrawer, amount);
    }

    function changeOperator(address _newOperator) external {
        require(msg.sender == _operator, "only the operator can change the current operator");
        address previousOperator = _operator;
        _operator = _newOperator;
        emit OperatorChanged(previousOperator, _operator);
    }

    function changeParameterControl(address _new) external {
        require(msg.sender == _operator, "only the operator can change the current _parameterControl");
        address previousParameterControl = _parameterControl;
        _parameterControl = _new;
        emit ParameterControlChanged(previousParameterControl, _parameterControl);
    }

    function viewOfferingNFT(bytes32 _offeringId) external view returns (address, uint, uint, bool){
        return (offeringRegistry[_offeringId].hostContract, offeringRegistry[_offeringId].tokenId, offeringRegistry[_offeringId].price, offeringRegistry[_offeringId].closed);
    }

    function viewBalances(address _address) external view returns (uint) {
        return (_balances[_address]);
    }

    function closeOfferingNFT(bytes32 _offeringId) external {
        require(msg.sender == _operator, "Only operator dApp can close offerings");
        offeringRegistry[_offeringId].closed = true;
        emit OfferingClosed(_offeringId, address(0));
    }
}