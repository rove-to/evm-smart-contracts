// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../utils/ERC1155Tradable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";

/*
 * TODO:
 * [] Use ERC1155 https://docs.openzeppelin.com/contracts/3.x/erc1155
 * [] 
 *
 */

contract EnvironmentNFT is ERC1155Tradable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    uint256 public newItemId;

    constructor(address _proxyRegistryAddress)
    ERC1155Tradable(
        "Rove Environments",
        "REs",
        "",
        _proxyRegistryAddress
    ) public {
    }

    function mintNFT(address recipient, uint256 initialSupply, string memory tokenURI)
    public
    returns (uint256)
    {
        _tokenIds.increment();

        newItemId = _tokenIds.current();
        create(recipient, newItemId, initialSupply, tokenURI, "0x");

        console.log(
            "mintNFT erc-1155 %s, owner %s, total %s",
            address(this),
            recipient,
            initialSupply
        );
        console.log("tokenid: ", newItemId);
        return newItemId;
    }
}
