// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";

interface IERC1155TradableUpgradeable is IERC1155Upgradeable, IERC2981Upgradeable {
    function getCreator(uint256 id) external view
    virtual
    returns (address sender);
}
