// SPDX-License-Identifier: MIT

pragma solidity 0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
//import "hardhat/console.sol";

import "../governance/ParameterControl.sol";
import "../utils/IERC1155Tradable.sol";

contract RoveMarketPlaceV2 is ReentrancyGuard, AccessControl {
    using Counters for Counters.Counter;
    Counters.Counter private _offeringNonces;

    event OfferingPlaced(bytes32 indexed offeringId, address indexed hostContract, address indexed offerer, uint tokenId, address erc20, uint price, string uri);
    event OfferingClosed(bytes32 indexed offeringId, address indexed buyer);
    event OfferingRemain(bytes32 indexed offeringId, address indexed buyer, uint indexed amount);
    event BalanceWithdrawn (address indexed beneficiary, address erc20, uint amount);
    event OperatorChanged (address previousOperator, address newOperator);
    event ParameterControlChanged (address previousOperator, address newOperator);
    event ApprovalForAll(address owner, address operator, bool approved);

    address public operator; // is a mutil sig address when deploy
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
        uint amount;
        bool closed;
        address erc20Token;
    }

    struct closeOfferingData {
        address buyer;
        uint price;
        uint totalPrice;// final erc-20 amount which offer should be receive
        uint256 originPrice; // origin erc-20 amount for this closing offering
        uint256 balanceBuyer;
        uint256 approvalToken;
        address erc20Token;
    }

    mapping(bytes32 => offering) offeringRegistry;
    bytes32[] private _arrayOffering;

    constructor (address operator_, address parameterControl_) {
        //        console.log("Deploy Rove market place operator %s", operator_);
        require(operator_ != address(0x0), "ADDRESS_INVALID");
        require(parameterControl_ != address(0x0), "ADDRES_INVALID");

        operator = operator_;
        _setupRole(DEFAULT_ADMIN_ROLE, operator);
        if (operator != _msgSender()) {
            _revokeRole(DEFAULT_ADMIN_ROLE, _msgSender());
        }
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
    function placeOffering(address _hostContract, uint _tokenId, address _erc20Token, uint _price, uint _amount) external nonReentrant {
        // owner nft is sender
        address nftOwner = msg.sender;
        // get hostContract of erc-1155
        ERC1155 hostContract = ERC1155(_hostContract);
        uint256 nftBalance = hostContract.balanceOf(nftOwner, _tokenId);
        console.log("nftOwner balance: ", nftBalance);
        bool approval = hostContract.isApprovedForAll(nftOwner, address(this));

        /// check require
        // check available amount of erc-1155
        require(nftBalance >= _amount, "BALANCE_INVALID");
        // check approval of erc-1155 on this contract
        require(approval == true, "ERC-1155_NOT_APPROVED");

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
        offeringRegistry[offeringId].amount = _amount;
        if (_erc20Token != address(0x0)) {
            offeringRegistry[offeringId].erc20Token = _erc20Token;
        } else {
            offeringRegistry[offeringId].erc20Token = address(0x0);
        }
        console.log("init offeringId: %s", toHex(offeringId));

        string memory uri = hostContract.uri(_tokenId);
        _arrayOffering.push(offeringId);
        emit OfferingPlaced(offeringId, _hostContract, nftOwner, _tokenId, _erc20Token, _price, uri);
    }

    function closeOffering(bytes32 _offeringId, uint _amount) external nonReentrant payable {
        // get offer
        offering memory _offer = offeringRegistry[_offeringId];
        IERC1155Tradable hostContract = IERC1155Tradable(_offer.hostContract);
        uint remainAmount = _offer.amount;
        bool approvalErc1155 = hostContract.isApprovedForAll(_offer.offerer, address(this));
        bool isERC20 = _offer.erc20Token != address(0x0);

        // buyer is sender
        closeOfferingData memory _closeOfferingData;
        ERC20 token;
        if (isERC20) {
            token = ERC20(_offer.erc20Token);
            _closeOfferingData = closeOfferingData(
                msg.sender,
                _offer.price,
                _offer.price * _amount,
                _offer.price * _amount,
                token.balanceOf(msg.sender),
                token.allowance(msg.sender, address(this)),
                _offer.erc20Token
            );
        } else {
            _closeOfferingData = closeOfferingData(
                msg.sender,
                _offer.price,
                _offer.price * _amount,
                _offer.price * _amount,
                0,
                0,
                address(0x0) // is ETH
            );
        }

        /*console.log("get price of offering: %s", _closeOfferingData.price);
        console.log("get total price of offering: %s", _closeOfferingData.totalPrice);
        console.log("get balance erc-20 token of buyer %s: %s", _closeOfferingData.buyer, _closeOfferingData.balanceBuyer);*/


        // check require
        // check approval of erc-1155 on this contract
        require(approvalErc1155 == true, "ERC-1155_NOT_APPROVED");
        require(remainAmount >= _amount, "ERC-1155-AMOUNT_INVALID");
        require(hostContract.balanceOf(_offer.offerer, _offer.tokenId) >= _amount, "ERC-1155_BALANCE_INVALID");
        if (isERC20) {
            require(_closeOfferingData.approvalToken >= _closeOfferingData.totalPrice, "ERC-20_NOT_APPROVED");
            require(_closeOfferingData.balanceBuyer >= _closeOfferingData.totalPrice, "ERC-20_BALANCE_INVALID");
        } else {
            require(msg.value >= _closeOfferingData.totalPrice, "VALUE_INVALID");
        }
        require(!_offer.closed, "OFFERING_CLOSED");

        // transfer erc-1155
        //        console.log("prepare safeTransferFrom offerer %s by this address %s", _offer.offerer, address(this));
        // only transfer one in this version
        hostContract.safeTransferFrom(_offer.offerer, _closeOfferingData.buyer, _offer.tokenId, _amount, "0x");
        /*console.log("safeTransferFrom erc-1155 tokenID %s from %s to buyer %s",
            _offer.tokenId,
            _offer.offerer,
            _closeOfferingData.buyer
        );*/

        // logic for 
        // benefit of operator here
        ParameterControl parameterController = ParameterControl(parameterControl);
        benefit memory _benefit = benefit(0, 0, 0, 0);
        _benefit.benefitPercentOperator = parameterController.getUInt256("MARKET_BENEFIT");
        if (_benefit.benefitPercentOperator > 0) {
            _benefit.benefitOperator = _closeOfferingData.originPrice / 100 * _benefit.benefitPercentOperator;
            _closeOfferingData.totalPrice -= _benefit.benefitOperator;
            //            console.log("market operator profit %s", _benefit.benefitOperator);
            // update balance(on market) of operator
            _balances[_closeOfferingData.erc20Token][operator] += _benefit.benefitOperator;
        }
        // benefit of minter nfts here
        _benefit.benefitPercentCreator = parameterController.getUInt256("CREATOR_BENEFIT");
        if (_benefit.benefitPercentCreator > 0) {
            if (hostContract.supportsInterface(type(IERC1155Tradable).interfaceId)) {
                (address _receiver, uint256 _royaltyAmount) = hostContract.royaltyInfo(_offer.tokenId, _closeOfferingData.originPrice);
                if (_receiver != address(0x0)) {
                    _benefit.benefitCreator = _closeOfferingData.originPrice / 100 * _benefit.benefitPercentCreator;
                    _closeOfferingData.totalPrice -= _benefit.benefitCreator;
                    //                    console.log("creator profit %s", _benefit.benefitCreator);
                    // update balance(on market) of creator erc-1155
                    //                    console.log("benefit creator %s: +%s", _receiver, _benefit.benefitCreator);
                    _balances[_closeOfferingData.erc20Token][_receiver] += _benefit.benefitCreator;
                }
            }
        } else {
            if (hostContract.supportsInterface(type(IERC1155Tradable).interfaceId)) {
                (address _receiver, uint256 _royaltyAmount) = hostContract.royaltyInfo(_offer.tokenId, _closeOfferingData.originPrice);
                if (_receiver != address(0x0)) {
                    _benefit.benefitCreator = _royaltyAmount;
                    _closeOfferingData.totalPrice -= _benefit.benefitCreator;
                    //                    console.log("creator profit %s", _benefit.benefitCreator);
                    // update balance(on market) of creator erc-1155
                    //                    console.log("benefit creator %s: +%s", _receiver, _benefit.benefitCreator);
                    _balances[_closeOfferingData.erc20Token][_receiver] += _benefit.benefitCreator;
                }
            }
        }

        if (isERC20) {
            // tranfer erc-20 token to this market contract
            //            console.log("tranfer erc-20 token %s to this market contract %s with amount: %s", _closeOfferingData.buyer, address(this), _closeOfferingData.originPrice);
            bool success = token.transferFrom(_closeOfferingData.buyer, address(this), _closeOfferingData.originPrice);
            require(success == true, "TRANSFER_FAIL");
            _offer.amount -= _amount;
            remainAmount = _offer.amount;
        }
        // update balance(on market) of offerer
        console.log("update balance of offerer: %s +%s", _offer.offerer, _closeOfferingData.totalPrice);
        _balances[_closeOfferingData.erc20Token][_offer.offerer] += _closeOfferingData.totalPrice;

        // close offering
        if (remainAmount == 0) {
            _offer.closed = true;
            //            console.log("close offering: ", toHex(_offeringId));
            emit OfferingClosed(_offeringId, _closeOfferingData.buyer);
        } else {
            //            console.log("remain amount of offering %s:%s", toHex(_offeringId), remainAmount);
            emit OfferingRemain(_offeringId, _closeOfferingData.buyer, remainAmount);
        }
    }

    function withdrawBalance(address _erc20Token) external nonReentrant {
        address withdrawer = msg.sender;
        // check require: balance of sender in market place > 0
        //        console.log("balance of sender: ", _balances[_erc20Token][withdrawer]);
        uint _withdrawAvailable = _balances[_erc20Token][withdrawer];
        require(_withdrawAvailable > 0, "WITHDRAW_UNAVAILABLE");

        if (_erc20Token != address(0x0)) {
            ERC20 token = ERC20(_erc20Token);
            uint256 balanceErc20 = token.balanceOf(address(this));
            //            console.log("balance of market place: ", balanceErc20);
            // check require balance of this market contract > sender's withdraw
            require(balanceErc20 >= _balances[_erc20Token][withdrawer], "INVALID_FUND");

            // tranfer erc-20 token from this market contract to sender
            //            console.log("tranfer erc-20 %s from this market contract %s to sender %s", _erc20Token, address(this), withdrawer);
            bool success = token.transfer(withdrawer, _withdrawAvailable);
            require(success == true, "TRANSFER_FAIL");
        } else {
            require(address(this).balance > 0, "INVALID_FUND");
            (bool success,) = withdrawer.call{value : _withdrawAvailable}("");
            require(success, "TRANSFER_FAIL");
        }

        // reset balance
        _balances[_erc20Token][withdrawer] = 0;

        emit BalanceWithdrawn(withdrawer, _erc20Token, _withdrawAvailable);
    }

    function changeOperator(address _newOperator) external {
        require(msg.sender == operator, "OPERATOR_ONLY");
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "OPERATOR_ONLY");
        require(_newOperator != address(0x0), "ADDRESS_INVALID");

        address previousOperator = operator;
        operator = _newOperator;
        _setupRole(DEFAULT_ADMIN_ROLE, operator);
        _revokeRole(DEFAULT_ADMIN_ROLE, previousOperator);
        emit OperatorChanged(previousOperator, operator);
    }

    function changeParameterControl(address _new) external {
        require(msg.sender == operator, "OPERATOR_ONLY");
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "OPERATOR_ONLY");
        require(_new != address(0x0), "ADDRESS_INVALID");

        address previousParameterControl = parameterControl;
        parameterControl = _new;
        emit ParameterControlChanged(previousParameterControl, parameterControl);
    }

    function viewOfferingNFT(bytes32 _offeringId) external view returns (address, uint, uint, bool, uint){
        return (offeringRegistry[_offeringId].hostContract,
        offeringRegistry[_offeringId].tokenId,
        offeringRegistry[_offeringId].price,
        offeringRegistry[_offeringId].closed,
        offeringRegistry[_offeringId].amount
        );
    }

    function viewBalances(address _address, address _erc20Token) external view returns (uint) {
        return (_balances[_erc20Token][_address]);
    }

    function operatorCloseOffering(bytes32 _offeringId) external {
        require(msg.sender == operator, "OPERATOR_ONLY");
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "OPERATOR_ONLY");
        offeringRegistry[_offeringId].closed = true;
        emit OfferingClosed(_offeringId, address(0));
    }
}