// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IParameterControl {
        function get(string memory key) external view returns (uint256 value);
        function set(string memory key, uint256 value) external;
}
