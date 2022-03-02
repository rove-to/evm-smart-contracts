// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "hardhat/console.sol";

/*
 * @dev Implementation of a programmable parameter control.
 *
 * [x] Add (key, value)
 * [x] Add access control 
 *
 */

contract ParameterControl is AccessControl {
    event AdminChanged (address previousAdmin, address newAdmin);
    address public admin;
    mapping(string => string) private _params;
    mapping(string => int) private _paramsInt;
    mapping(string => uint256) private _paramsUInt256;

    constructor(
        address admin_
    ) {
        admin = admin_;
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function get(string memory key) public view returns (string memory) {
        return _params[key];
    }

    function getInt(string memory key) public view returns (int) {
        return _paramsInt[key];
    }

    function getUInt256(string memory key) public view returns (uint256) {
        return _paramsUInt256[key];
    }

    function set(string memory key, string memory value) external {
        console.log("msg.sender %s", msg.sender);
        require(msg.sender == admin, "Sender is not admin");
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not a admin");
        _params[key] = value;
    }

    function setInt(string memory key, int value) external {
        console.log("msg.sender %s", msg.sender);
        require(msg.sender == admin, "Sender is not admin");
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not a admin");
        _paramsInt[key] = value;
    }

    function setUInt256(string memory key, uint256 value) external {
        console.log("msg.sender %s", msg.sender);
        require(msg.sender == admin, "Sender is not admin");
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not a admin");
        _paramsUInt256[key] = value;
    }

    function updateAdmin(address admin_) external {
        require(msg.sender == admin);
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not a admin");
        console.log("set new admin %s -> %s", admin, admin_);
        address previousAdmin = admin;
        admin = admin_;
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _revokeRole(DEFAULT_ADMIN_ROLE, previousAdmin);
        emit AdminChanged(previousAdmin, admin);
    }
}
