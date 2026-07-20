// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {AmberBoard} from "../../src/AmberBoard.sol";

/// @notice Cross-checks AmberBoard's own accounting against itself and against
///         the live AMBR token, on a pinned Base mainnet fork. See
///         AmberAnchor.fork.t.sol for the FORK=1 opt-in convention.
contract AmberBoardForkTest is Test {
    uint256 internal constant FORK_BLOCK = 48_893_600;
    AmberBoard internal constant BOARD = AmberBoard(0x57E637fcC76B9d2c08E15F6C3e21c4cF77289637);
    IERC20 internal constant AMBR = IERC20(0x4Bc12215fd6CB26BbFe1f2960AC025250fa0C6B5);
    address internal constant DEPLOYER = 0x23ddAAd22d030b4a8d0BFbADeaCA11Ed9959D08C;

    function setUp() public {
        if (!vm.envOr("FORK", false)) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork("base", FORK_BLOCK);
    }

    function test_LeaderboardCountsSumToTotalCheers() public view {
        (address[] memory addrs, uint256[] memory counts,) = BOARD.leaderboard();
        uint256 sum;
        for (uint256 i = 0; i < counts.length; i++) {
            sum += counts[i];
        }
        assertEq(sum, BOARD.totalCheers());
        assertEq(addrs.length, BOARD.participantCount());
    }

    function test_LeaderboardBalancesMatchLiveAmbrBalanceOf() public view {
        (address[] memory addrs,, uint256[] memory balances) = BOARD.leaderboard();
        for (uint256 i = 0; i < addrs.length; i++) {
            assertEq(balances[i], AMBR.balanceOf(addrs[i]));
        }
    }

    function test_DeployerIsAKnownParticipant() public view {
        assertGt(BOARD.cheers(DEPLOYER), 0);
    }
}
