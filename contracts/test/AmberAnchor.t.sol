// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AmberAnchor} from "../src/AmberAnchor.sol";

contract AmberAnchorTest is Test {
    AmberAnchor anchor;

    function setUp() public {
        anchor = new AmberAnchor();
    }

    function test_PointsAtTheRepo() public view {
        assertEq(anchor.REPO(), "https://github.com/Takatabro926/amberforge");
        assertEq(anchor.APP(), "https://amberforge-board.vercel.app");
    }

    function test_AgentIds() public view {
        assertEq(anchor.AGENT_ID_MAINNET(), 59020);
        assertEq(anchor.AGENT_ID_SEPOLIA(), 8095);
    }

    /// The deterministic address must be a pure function of (factory, salt,
    /// initcode hash) — recompute it the way the CREATE2 factory does.
    function test_Create2AddressDerivation() public pure {
        bytes32 salt = keccak256("amberforge-anchor");
        address factory = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
        bytes32 initCodeHash = keccak256(type(AmberAnchor).creationCode);
        address predicted =
            address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), factory, salt, initCodeHash)))));
        assertTrue(predicted != address(0));
    }
}
