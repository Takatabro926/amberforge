// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {AmberAnchor} from "../../src/AmberAnchor.sol";

/// @notice Reads AmberAnchor as it actually stands on Base mainnet, pinned to a
///         fixed block so results stay reproducible while the rest of the
///         program keeps writing to these contracts. Opt in with `FORK=1
///         forge test --match-path "test/fork/**"` — skipped otherwise so the
///         default `forge test` run stays offline and fast.
contract AmberAnchorForkTest is Test {
    uint256 internal constant FORK_BLOCK = 48_893_600;
    AmberAnchor internal constant ANCHOR = AmberAnchor(0x7559EaCa8Eaa1705B5a7C9b25Fd508A41326E6A1);

    function setUp() public {
        if (!vm.envOr("FORK", false)) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork("base", FORK_BLOCK);
    }

    function test_HasCodeAtTheDeterministicCreate2Address() public view {
        assertGt(address(ANCHOR).code.length, 0);
    }

    function test_ReportsCanonicalRepoAndApp() public view {
        assertEq(ANCHOR.REPO(), "https://github.com/Takatabro926/amberforge");
        assertEq(ANCHOR.APP(), "https://amberforge-board.vercel.app");
    }

    function test_AgentIdsMatchTheErc8004Registrations() public view {
        assertEq(ANCHOR.AGENT_ID_MAINNET(), 59020);
        assertEq(ANCHOR.AGENT_ID_SEPOLIA(), 8095);
    }
}
