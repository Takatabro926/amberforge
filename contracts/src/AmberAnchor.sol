// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AmberAnchor
/// @notice Canonical on-chain pointer to the Amberforge project. Deployed via
///         the deterministic CREATE2 factory (0x4e59b44847b379578588920cA78FbF26c0B4956C)
///         with salt keccak256("amberforge-anchor"), so the same bytecode lands
///         at the same address on any EVM chain — the discovery pattern B20
///         tokens use, applied to a plain contract.
contract AmberAnchor {
    string public constant REPO = "https://github.com/Takatabro926/amberforge";
    string public constant APP = "https://amberforge-board.vercel.app";
    uint256 public constant AGENT_ID_MAINNET = 59020;
    uint256 public constant AGENT_ID_SEPOLIA = 8095;
}
