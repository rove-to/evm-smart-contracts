pragma solidity ^0.8.0;

interface IProtocolParameters {

        function getHostingFee(string memory experience) external returns (uint256);

}
