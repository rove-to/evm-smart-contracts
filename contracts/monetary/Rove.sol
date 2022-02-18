// contracts/MyToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract RoveToken is ERC20, AccessControl {
    using SafeMath for uint; //
    address private _admin;
    address[4] private _roveTokenTimelockContract;

    // Create a new role identifier for the minter role
    // admin is a multi sig address
    constructor(address admin_) ERC20("ROVE", "RVE") {
        _admin = admin_;
        // Grant the minter role to a specified account
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
        _mint(_admin, 1000000000 * (10 ** uint256(decimals())));
    }
    
    function admin() public view returns (address) {
        return _admin;
    }

    function mint(address to, uint256 amount) public {
        // Check that the calling account has the minter role
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not a minter");
        _mint(to, amount);
    }

    function roveTokenTimelockContract() public view virtual returns (address[4] memory) {
        return _roveTokenTimelockContract;
    }

    function schedule_minting(address[4] memory timeLockContracts) public returns (uint256) {
        _roveTokenTimelockContract = timeLockContracts;
        uint256 total = totalSupply();
        
        // * Minting schedule: 
        //     - 40% 1st year
        uint256 first_year = total.div(5);
        first_year = first_year.mul(2);
        require(first_year == 400000000, "RoveToken: schedule minting first_year 400000000 is invalid");
        //     - 30% 2nd year
        uint256 second_year = total.div(10);
        second_year = second_year.mul(3);
        require(second_year == 300000000, "RoveToken: schedule minting second_year 300000000 is invalid");
        
        //     - 20% 3rd year
        uint256 third_year = total.div(5);
        third_year = third_year.mul(1);
        require(third_year == 200000000, "RoveToken: schedule minting third_year 200000000 is invalid");
        
        //     - 10% 4th year
        uint256 fourth_year = total.div(10);
        fourth_year = fourth_year.mul(1);
        require(fourth_year == 100000000, "RoveToken: schedule minting fourth_year 100000000 is invalid");

        uint256 temp = first_year.add(second_year);
        temp = temp.add(third_year);
        temp = temp.add(fourth_year);
        require(temp == total, "RoveToken: schedule minting is invalid");

        transfer(timeLockContracts[0], first_year);
        transfer(timeLockContracts[1], second_year);
        transfer(timeLockContracts[2], third_year);
        transfer(timeLockContracts[3], fourth_year);

        return temp;
    }
}