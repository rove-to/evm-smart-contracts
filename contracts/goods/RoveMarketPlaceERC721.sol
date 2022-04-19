// SPDX-License-Identifier: MIT

pragma solidity 0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

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
    address public parameterControl;

    mapping(address => mapping(address => uint)) private _balances;

    struct benefit {
        uint256 benefitPercentCreator;
        uint256 benefitCreator;
        uint256 benefitPercentOperator;
        uint256 benefitOperator;
        uint256 discountRoveToken;
    }

    struct offering {
        address offerer;
        address hostContract;
        uint tokenId;
        uint price;
        bool closed;
        address erc20Token;
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

    constructor (address operator_, address parameterControl_) {
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
    function placeOffering(address _hostContract, uint _tokenId, address _erc20Token, uint _price) external nonReentrant {
        // owner nft is sender
        address nftOwner = msg.sender;
        // require(msg.sender == _operator, "Only operator dApp can create offerings");

        // get hostContract of erc-721
        ERC721 hostContract = ERC721(_hostContract);
        require(hostContract.ownerOf(_tokenId) == nftOwner, "INVALID_ERC721_OWNER");
        // check approval of erc-721 on this contract
        bool approval = hostContract.isApprovedForAll(nftOwner, address(this));
        require(approval == true, "ERC-721_NOT_APPROVED");

        // create offering nonce by counter
        _offeringNonces.increment();
        uint256 newItemId = _offeringNonces.current();

        // init offering id
        bytes32 offeringId = keccak256(abi.encodePacked(newItemId, _hostContract, _tokenId));
        // create offering by id
        offeringRegistry[offeringId].offerer = nftOwner;
        offeringRegistry[offeringId].hostContract = _hostContract;
        offeringRegistry[offeringId].tokenId = _tokenId;
        offeringRegistry[offeringId].price = _price;
        if (_erc20Token != address(0x0)) {
            offeringRegistry[offeringId].erc20Token = _erc20Token;
        } else {
            offeringRegistry[offeringId].erc20Token = address(0x0);
        }

        string memory uri = hostContract.tokenURI(_tokenId);
        _arrayOffering.push(offeringId);
        emit OfferingPlaced(offeringId, _hostContract, nftOwner, _tokenId, _price, uri);
    }

    function _toLower(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint i = 0; i < bStr.length; i++) {
            // Uppercase character...
            if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) {
                // So we add 32 to make it lowercase
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }

    function hashCompareWithLengthCheck(string memory a, string memory b) internal returns (bool) {
        a = _toLower(a);
        b = _toLower(b);
        if (bytes(a).length != bytes(b).length) {
            return false;
        } else {
            return keccak256(bytes(a)) == keccak256(bytes(b));
        }
    }

    function closeOffering(bytes32 _offeringId) external nonReentrant payable {
        // get offer
        offering memory _offer = offeringRegistry[_offeringId];
        address hostContractOffering = _offer.hostContract;
        ERC721 hostContract = ERC721(hostContractOffering);
        uint tokenID = _offer.tokenId;
        address offerer = _offer.offerer;
        bool isERC20 = _offer.erc20Token != address(0x0);

        // buyer is sender
        closeOfferingData memory _closeOfferingData;
        ERC20 token;
        if (isERC20) {
            token = ERC20(_offer.erc20Token);
            _closeOfferingData = closeOfferingData(
                msg.sender,
                _offer.price,
                _offer.price,
                token.balanceOf(msg.sender),
                token.allowance(msg.sender, address(this)),
                _offer.erc20Token
            );
        } else {
            _closeOfferingData = closeOfferingData(
                msg.sender,
                _offer.price,
                _offer.price,
                0,
                0,
                address(0x0) // is ETH
            );
        }

        // check require
        require(hostContract.ownerOf(tokenID) == offerer, "INVALID_ERC721_OWNER");
        if (isERC20) {
            // check approval of erc-20 on this contract
            require(_closeOfferingData.approvalToken >= _closeOfferingData.price, "ERC-20_NOT_APPROVED");
            require(_closeOfferingData.balanceBuyer >= _closeOfferingData.price, "ERC-20_BALANCE_INVALID");
        } else {
            require(msg.value >= _closeOfferingData.price, "VALUE_INVALID");
        }
        require(!offeringRegistry[_offeringId].closed, "OFFERING_CLOSED");

        // transfer erc-721
        hostContract.safeTransferFrom(offerer, _closeOfferingData.buyer, tokenID);

        // logic for 
        // benefit of operator here
        ParameterControl parameterController = ParameterControl(parameterControl);
        benefit memory _benefit = benefit(0, 0, 0, 0, 0);
        _benefit.benefitPercentOperator = parameterController.getUInt256("MARKET_BENEFIT");
        if (_benefit.benefitPercentOperator > 0) {
            _benefit.benefitOperator = _closeOfferingData.originPrice * _benefit.benefitPercentOperator / 10000;
            if (isERC20) {
                // check for erc-20
                string memory _roveTokenAdd = parameterController.get("ROVE_TOKEN");
                // using param control rove token for market
                if (bytes(_roveTokenAdd).length != 0) {
                    // erc-20 is rove token
                    if (hashCompareWithLengthCheck(Strings.toHexString(uint256(uint160(_offer.erc20Token)), 20), _roveTokenAdd)) {
                        _benefit.discountRoveToken = parameterController.getUInt256("DISCOUNT_ROVE_TOKEN");
                        // discount > 0
                        if (_benefit.discountRoveToken > 0) {
                            _benefit.benefitOperator = _benefit.benefitOperator - _benefit.benefitOperator * _benefit.discountRoveToken / 10000;
                        }
                    }
                }
            }
            _closeOfferingData.price -= _benefit.benefitOperator;
            // update balance(on market) of operator
            _balances[operator][_closeOfferingData.erc20Token] += _benefit.benefitOperator;
        }

        // tranfer erc-20 token to this market contract
        if (isERC20) {
            bool success = token.transferFrom(_closeOfferingData.buyer, address(this), _closeOfferingData.originPrice);
            require(success == true, "TRANSFER_FAIL");
        }

        // update balance(on market) of offerer
        _balances[offerer][_closeOfferingData.erc20Token] += _closeOfferingData.price;

        // close offering
        offeringRegistry[_offeringId].closed = true;

        emit OfferingClosed(_offeringId, _closeOfferingData.buyer);
    }

    function withdrawBalance(address _erc20Token) external nonReentrant {
        address withdrawer = msg.sender;
        // check require: balance of sender in market place > 0
        uint _withdrawAvailable = _balances[withdrawer][_erc20Token];
        require(_withdrawAvailable > 0, "WITHDRAW_UNAVAILABLE");

        if (_erc20Token != address(0x0)) {
            ERC20 token = ERC20(_erc20Token);
            uint256 balance = token.balanceOf(address(this));
            // check require balance of this market contract > sender's withdraw
            require(balance >= _balances[withdrawer][_erc20Token], "INVALID_FUND");


            // tranfer erc-20 token from this market contract to sender
            uint amount = _balances[withdrawer][_erc20Token];
            //payable(withdrawer).transfer(amount);
            bool success = token.transfer(withdrawer, amount);
            require(success == true, "TRANSFER_FAIL");}
        else {
            require(address(this).balance > 0, "INVALID_FUND");
            (bool success,) = withdrawer.call{value : _withdrawAvailable}("");
            require(success, "TRANSFER_FAIL");
        }
        // reset balance
        _balances[withdrawer][_erc20Token] = 0;
        //        roveToken.approve(withdrawer, _balances[withdrawer]);

        emit BalanceWithdrawn(withdrawer, _withdrawAvailable);
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