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

contract RockNFT is ERC1155Tradable {
        using Counters for Counters.Counter;
        Counters.Counter private _tokenIds;
        uint256 private _newItemId;

        constructor(address _proxyRegistryAddress)
        ERC1155Tradable(
                "Rove Rocks",
                "RRs",
                "",
                _proxyRegistryAddress
        ) public {
        }

        function newItemId() public view returns (uint256) {
                return _newItemId;
        }

        function mintNFT(address recipient, string memory tokenURI)
        public onlyOwner
        returns (uint256)
        {
                _tokenIds.increment();

                _newItemId = _tokenIds.current();
                create(recipient, _newItemId, 1, tokenURI, "0x");

                console.log(
                        "mintNFT erc-1155 %s, owner %s, only 1",
                        address(this),
                        recipient
                );
                console.log("tokenid: ", _newItemId);
                return _newItemId;
        }
}
