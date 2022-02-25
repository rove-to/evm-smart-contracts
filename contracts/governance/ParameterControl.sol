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

    constructor(
        address admin
    ) {
        _admin = admin;
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    function admin() external view returns (address) {
        return _admin;
    }

    function get(string memory key) external view returns (string memory) {
        return _params[key];
    }

    function set(string memory key, string memory value) external {
        require(msg.sender == _admin);
        _params[key] = value;
    }

    function updateAdmin(address admin) external {
        require(msg.sender == _admin);
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not a admin");
        console.log("set new admin %s -> %s", _admin, admin);
        _admin = admin;
    }
}
