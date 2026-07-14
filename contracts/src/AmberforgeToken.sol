// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/// @title Amberforge Token (AMBR)
/// @notice Fixed-supply ERC-20: 1,000,000 AMBR (18 decimals) minted once to the
///         deployer in the constructor. No owner, no further minting — the total
///         supply can only ever decrease via burning.
contract AmberforgeToken is ERC20, ERC20Burnable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000e18;

    constructor() ERC20("Amberforge Token", "AMBR") {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}
