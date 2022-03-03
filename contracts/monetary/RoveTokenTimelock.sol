// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.5.0) (token/ERC20/utils/TokenTimelock.sol)

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

/**
 * @dev A token holder contract that will allow a beneficiary to extract the
 * tokens after a given release time.
 *
 * Useful for simple vesting schedules like "advisors get all of their tokens
 * after 1 year".
 */
contract RoveTokenTimelock is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ERC20 basic token contract being held
    IERC20 public immutable token;

    // beneficiary of tokens after they are released by bellow ordering
    // community multi sig address
    // team multi sig address
    // sales multi sig address
    // exchange liquidity multi sig address
    address[4] private _beneficiary;

    // timestamp when token release is enabled
    uint256 public immutable releaseTime;

    /**
     * @dev Deploys a timelock instance that is able to hold the token specified, and will only release it to
     * `beneficiary_` when {release} is invoked after `releaseTime_`. The release time is specified as a Unix timestamp
     * (in seconds).
     */
    constructor(
        IERC20 token_,
        address[4] memory beneficiary_,
        uint256 releaseTime_
    ) {
        require(releaseTime_ > block.timestamp, "TokenTimelock: release time is before current time");
        token = token_;
        _beneficiary = beneficiary_;
        releaseTime = releaseTime_;
    }

    function beneficiary() public view virtual returns (address[4] memory) {
        return _beneficiary;
    }

    /**
     * @dev Returns the beneficiary that will receive the tokens.
     */
    function beneficiary(uint128 index) public view virtual returns (address) {
        return _beneficiary[index];
    }

    function current_balance() public view returns (uint256) {
        address temp = address(this);
        uint256 balance = token.balanceOf(temp);
        console.log("token lock time address %s has balance %s", address(this), balance);
        return balance;
    }

    /**
     * @dev Transfers tokens held by the timelock to the beneficiary. Will only succeed if invoked after the release
     * time.
     */
    function release() public nonReentrant virtual {
        console.log("call release for token lock time address %s, block timestamp %s, release Time %s", address(this), block.timestamp, releaseTime);
        require(block.timestamp >= releaseTime, "TokenTimelock: current time is before release time");

        uint256 amount = token.balanceOf(address(this));
        amount = amount - amount % 20;
        require(amount > 0, "TokenTimelock: no tokens to release");

        // split amount
        // 65% for community members
        uint256 community = amount / 20;
        community = community * 13;
        console.log("community: ", community);
        // 20% for Team
        uint256 team = amount / 5;
        console.log("team: ", team);
        // 10% reserved for Token Sales 
        uint256 sales = amount / 10;
        console.log("sales: ", sales);
        // 5% reserved for Exchange Liquidity
        uint256 liquidity = amount / 20;
        console.log("liquidity: ", liquidity);

        uint256 temp = community + team;
        temp = temp + sales;
        temp = temp + liquidity;
        require(temp == amount, "TokenTimelock: no tokens to release");

        token.safeTransfer(_beneficiary[0], community);
        token.safeTransfer(_beneficiary[1], team);
        token.safeTransfer(_beneficiary[2], sales);
        token.safeTransfer(_beneficiary[3], liquidity);
    }
}
