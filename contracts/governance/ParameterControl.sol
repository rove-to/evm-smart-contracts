// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "hardhat/console.sol";

/*
 * @dev Implementation of a programmable parameter control.
 *
 * [x] Add (key, value)
 * [x] Add access control 
 * [x] Use string instead of uint256. Add a string to uint parser.
 *
 */

contract ParameterControl is AccessControl {

    address private _admin;
    mapping(string => string) private _params;
    mapping(string => int) private _paramsInt;
    mapping(string => uint256) private _paramsUInt256;

    constructor(
        address admin_
    ) {
        _admin = admin_;
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    function admin() external view returns (address) {
        return _admin;
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
        require(msg.sender == _admin);
        _params[key] = value;
    }

    function setInt(string memory key, int value) external {
        console.log("msg.sender %s", msg.sender);
        require(msg.sender == _admin);
        _paramsInt[key] = value;
    }

    function setUInt256(string memory key, uint256 value) external {
        console.log("msg.sender %s", msg.sender);
        require(msg.sender == _admin);
        _paramsUInt256[key] = value;
    }

    function updateAdmin(address admin_) external {
        require(msg.sender == _admin);
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not a admin");
        console.log("set new admin %s -> %s", _admin, admin_);
        _admin = admin_;
    }
}
