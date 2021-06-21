// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;
import "../TierCompute.sol";

contract TestableTierCompute is TierCompute {
    function add() external {
        _add();
    }

    function remove(uint256 id) external {
        _removeByID(id);
    }
}