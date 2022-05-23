// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

/*
import "@openzeppelin/contracts/access/AccessControl.sol";

import "../goods/RockNFT.sol";

contract MetaverseDAO {
    address rockNFTAddr;
    mapping(bytes32 => bool) proposals;

    function initProposal(uint256 _metaverseId, uint256 action, uint256 threshold) public returns (bool) {
        bytes32 offeringId = keccak256(abi.encodePacked("1, 2, 3"));
        return true;
    }

    function confirm(bytes32 _proposalId, uint256 _tokenId) public {
        address _sender = msg.sender;
        RockNFT _rockNFT = RockNFT(rockNFTAddr);
        uint256 _balance = _rockNFT.balanceOf(_sender, _tokenId);
        require(_balance > 0, "");
    }

    function executeAddZone(uint256 _metaverseId, SharedStructs.zone memory _zone) public {
        RockNFT _rockNFT = RockNFT(rockNFTAddr);
        _rockNFT.addZone(_metaverseId, _zone);
    }
}*/
