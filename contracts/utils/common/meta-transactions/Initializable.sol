// SPDX-License-Identifier: MIT

pragma solidity 0.8.12;

contract InitializableSimple {
    bool inited = false;

    modifier initializer() {
        require(!inited, "already inited");
        _;
        inited = true;
    }
}
