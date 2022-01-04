// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


/*
 * [ ] 
 * [ ] 
 * [ ] 
 *
 */

contract ParameterControl {

        mapping(string => uint256) private _params;

        function get(string memory key) external view returns (uint256) {
                return _params[key];
        }

        function set(string memory key, uint256 value) external {
                _params[key] = value;

        }

}
