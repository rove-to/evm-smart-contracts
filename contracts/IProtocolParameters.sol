// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IProtocolParameters {

        function getHostingFee(string memory experienceType) external returns (uint256);
        function getLandTaxRate() external returns (uint256);
        function getWorldMintingFee() external returns (uint256);

}
