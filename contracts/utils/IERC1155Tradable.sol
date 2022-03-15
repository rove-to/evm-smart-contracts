// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface IERC1155Tradable is IERC1155 {
    function getCreator(uint256 id)
    external
    view
    virtual
    returns (address sender);
}
