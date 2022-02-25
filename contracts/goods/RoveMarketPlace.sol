// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../utils/ERC1155Tradable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";

contract RoveMarketPlace {
    using Counters for Counters.Counter;
    Counters.Counter private _offeringNonces;

    event OfferingPlaced(bytes32 indexed offeringId, address indexed hostContract, address indexed offerer, uint tokenId, uint price, string uri);
    event OfferingClosed(bytes32 indexed offeringId, address indexed buyer);
    event BalanceWithdrawn (address indexed beneficiary, uint amount);
    event OperatorChanged (address previousOperator, address newOperator);

    address private _operator;
    address private _roveToken; // require using this erc-20 token in this market

    struct offering {
        address offerer;
        address hostContract;
        uint tokenId;
        uint price;
        bool closed;
    }

    mapping(bytes32 => offering) offeringRegistry;
    mapping(address => uint) balances;

    constructor (address operator_, address roveToken_) {
        console.log("Deploy Rove market place operator %s, rove token %s", operator_, roveToken_);
        _operator = operator_;
        _roveToken = roveToken_;
    }

    function operator() public view returns(address) {
        return _operator;
    }

    function roveToken() public view returns(address) {
        return _roveToken;
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

    function placeOffering(address _offerer, address _hostContract, uint _tokenId, uint _price) external {
        require(msg.sender == _operator, "Only operator dApp can create offerings");

        // create offering nonce by counter
        _offeringNonces.increment();
        uint256 newItemId = _offeringNonces.current();
        console.log("create offering nonce by counter: ", newItemId);

        // init offering id
        bytes32 offeringId = keccak256(abi.encodePacked(newItemId, _hostContract, _tokenId));
        // create offering by id
        offeringRegistry[offeringId].offerer = _offerer;
        offeringRegistry[offeringId].hostContract = _hostContract;
        offeringRegistry[offeringId].tokenId = _tokenId;
        offeringRegistry[offeringId].price = _price;
        console.log("init offeringId: %s", toHex(offeringId));

        // get uri of erc-1155
        ERC1155Tradable hostContract = ERC1155Tradable(offeringRegistry[offeringId].hostContract);
        string memory uri = hostContract.uri(_tokenId);
        emit  OfferingPlaced(offeringId, _hostContract, _offerer, _tokenId, _price, uri);
    }

    function closeOffering(bytes32 _offeringId) external payable {
        console.log("start close _offeringId: ", toHex(_offeringId));
        ERC20 roveToken = ERC20(_roveToken);
        uint price = offeringRegistry[_offeringId].price;
        console.log("get price of offering: %s", price);
        uint256 balance = roveToken.balanceOf(msg.sender);
        console.log("get balance erc-20 token of sender(buyer): %s", balance);

        // check require
        require(balance >= price, "Not enough funds erc-20 to buy");
        require(offeringRegistry[_offeringId].closed != true, "Offering is closed");

        // transfer erc-1155
        address hostContractOffering = offeringRegistry[_offeringId].hostContract;
        ERC1155Tradable hostContract = ERC1155Tradable(hostContractOffering);
        uint tokenID = offeringRegistry[_offeringId].tokenId;
        address offerer = offeringRegistry[_offeringId].offerer;
        hostContract.safeTransferFrom(offerer, msg.sender, tokenID, 1, "0x");
        console.log("safeTransferFrom erc-1155 %s, tokenID %s from %s to sender",
            hostContractOffering,
            tokenID,
            offerer
        );

        // TODO: logic for 
        // profit of operator/erc-1155 minter here
        // ...

        // tranfer erc-20 token to this market contract
        roveToken.transferFrom(msg.sender, address(this), price);
        console.log("tranfer erc-20 token %s to this market contract %s with amount: %s", _roveToken, address(this), price);
        // update balance of offerer
        balances[offeringRegistry[_offeringId].offerer] += price;
        console.log("update balance of offerer: %s +%s", offeringRegistry[_offeringId].offerer, price);
        // close offering
        offeringRegistry[_offeringId].closed = true;
        console.log("close offering: ", toHex(_offeringId));

        emit OfferingClosed(_offeringId, msg.sender);
    }

    function withdrawBalance() external {
        // check require: balance of sender in market place > 0
        console.log("balance of sender: ", balances[msg.sender]);
        require(balances[msg.sender] > 0, "You don't have any balance to withdraw");

        ERC20 roveToken = ERC20(_roveToken);
        uint256 balance = roveToken.balanceOf(address(this));
        console.log("balance of market place: ", balance);
        // check require balance of this market contract > sender's withdraw
        require(balance > balances[msg.sender], "Not enough balance for withdraw");


        // tranfer erc-20 token from this market contract to sender
        uint amount = balances[msg.sender];
        //payable(msg.sender).transfer(amount);
        roveToken.transferFrom(address(this), msg.sender, amount);
        console.log("tranfer erc-20 %s from this market contract %s to sender %s", _roveToken, address(this), msg.sender);

        // reset balance
        balances[msg.sender] = 0;

        emit BalanceWithdrawn(msg.sender, amount);
    }

    function changeOperator(address _newOperator) external {
        require(msg.sender == _operator, "only the operator can change the current operator");
        address previousOperator = _operator;
        _operator = _newOperator;
        emit OperatorChanged(previousOperator, _operator);
    }

    function viewOfferingNFT(bytes32 _offeringId) external view returns (address, uint, uint, bool){
        return (offeringRegistry[_offeringId].hostContract, offeringRegistry[_offeringId].tokenId, offeringRegistry[_offeringId].price, offeringRegistry[_offeringId].closed);
    }

    function viewBalances(address _address) external view returns (uint) {
        return (balances[_address]);
    }
}