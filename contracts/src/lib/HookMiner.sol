// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Brute-force CREATE2 salt search for Uniswap v4 hook addresses,
///         whose low 14 bits must encode the hook's permission flags (see
///         v4-core's Hooks.sol). Hand-rolled instead of pulling in
///         v4-periphery's HookMiner just for this one utility — same
///         algorithm (linear salt scan + standard CREATE2 address formula),
///         no extra dependency tree.
library HookMiner {
    uint160 internal constant FLAG_MASK = 0x3FFF; // bits 0-13, the full flag range in Hooks.sol

    function find(address deployer, uint160 flags, bytes memory creationCodeWithArgs, uint256 maxAttempts)
        internal
        pure
        returns (address hookAddress, bytes32 salt)
    {
        bytes32 initCodeHash = keccak256(creationCodeWithArgs);
        for (uint256 i = 0; i < maxAttempts; i++) {
            salt = bytes32(i);
            address computed = computeAddress(deployer, salt, initCodeHash);
            if (uint160(computed) & FLAG_MASK == flags) {
                return (computed, salt);
            }
        }
        revert("HookMiner: no salt found within maxAttempts");
    }

    function computeAddress(address deployer, bytes32 salt, bytes32 initCodeHash) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), deployer, salt, initCodeHash)))));
    }
}
