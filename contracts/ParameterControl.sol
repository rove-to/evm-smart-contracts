// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./utils/constants.sol";

/*
 * @dev Implementation of a programmable parameter control.
 *
 * [x] Add (key, value)
 * [x] Add access control 
 * [ ] Use string instead of uint256. Add a string to uint parser.
 *
 */

contract ParameterControl is Constant {

        address private _admin;
        mapping(string => uint256) private _params;

        constructor(address admin, uint256 breedingFee, uint256 mintMetaverseFee) {
                _admin = admin;
                _params[ROCK_BREEDING_FEE] = breedingFee;
                _params[METAVERSE_MINTING_FEE] = mintMetaverseFee;
        }

        function get(string memory key) external view returns (uint256) {
                return _params[key];
        }

        function set(string memory key, uint256 value) external {
                require(msg.sender == _admin);
                _params[key] = value;
        }

        function updateAdmin(address admin) external {
                require(msg.sender == _admin);
                _admin = admin;
        }
}
