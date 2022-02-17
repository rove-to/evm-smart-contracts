// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../utils/ERC1155Tradable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/*
 * TODO:
 * [] Use ERC1155 https://docs.openzeppelin.com/contracts/3.x/erc1155
 * [] 
 *
 */

contract EnvironmentNFT is ERC1155Tradable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor(address _proxyRegistryAddress)
    ERC1155Tradable(
        "Rove Environment Test",
        "REsT",
        "",
        _proxyRegistryAddress
    ) public {
    }

    function mintNFT(address recipient, string memory tokenURI)
    public onlyOwner
    returns (uint256)
    {
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        create(recipient, newItemId, 1, tokenURI, "0x");
        return newItemId;
    }
}
