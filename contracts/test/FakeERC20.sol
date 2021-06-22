pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract FakeERC20 is ERC20 {
    constructor() ERC20("fake", "fake") {
        _mint(msg.sender, 5000000 * 10**(decimals()));
    }

    function rebase(int256 amount) external {
        if(amount > 0)
            _mint(msg.sender, uint256(amount));
        else {
            _burn(msg.sender, uint256(-amount));
        }
    }
}