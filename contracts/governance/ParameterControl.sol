// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


/*
 * @dev Implementation of a programmable parameter control.
 *
 * [x] Add (key, value)
 * [ ] Add access control 
 * [ ] Use string instead of uint256. Add a string to uint parser.
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
