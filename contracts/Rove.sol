// contracts/MyToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Rove is ERC20, AccessControl {
    // Create a new role identifier for the minter role

    constructor(address admin) ERC20("ROVE", "RVE") {
        // Grant the minter role to a specified account
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function mint(address to, uint256 amount) public {
        // Check that the calling account has the minter role
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not a minter");
        _mint(to, amount);
    }
}