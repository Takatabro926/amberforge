// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {AmberforgeToken} from "../../src/AmberforgeToken.sol";
import {AmberBoard} from "../../src/AmberBoard.sol";
import {AmberCubes} from "../../src/AmberCubes.sol";
import {AmberCubesHandler} from "./AmberCubesHandler.sol";

/// @notice Stateful fuzzing over cheer/mint/transfer sequences. The mint gate
///         (cheers >= 3, once per address) has no test coverage for
///         out-of-order or interleaved actor behaviour in the unit suite —
///         these invariants hold across arbitrary call sequences instead of
///         the hand-picked ones in AmberCubes.t.sol.
contract AmberCubesInvariantTest is Test {
    AmberforgeToken internal ambr;
    AmberBoard internal board;
    AmberCubes internal cubes;
    AmberCubesHandler internal handler;

    function setUp() public {
        ambr = new AmberforgeToken();
        board = new AmberBoard(IERC20(address(ambr)));
        cubes = new AmberCubes(board);
        handler = new AmberCubesHandler(board, cubes);

        targetContract(address(handler));
    }

    function invariant_MintedCountMatchesSuccessfulGhostMints() public view {
        assertEq(cubes.nextId() - 1, handler.ghostMintedIdsLength());
    }

    function invariant_EveryGhostMinterIsFlaggedOnChain() public view {
        uint256 n = handler.ghostMintersLength();
        for (uint256 i = 0; i < n; i++) {
            assertTrue(cubes.minted(handler.ghostMinters(i)));
        }
    }

    function invariant_EveryGhostMinterHadEnoughCheers() public view {
        uint256 n = handler.ghostMintersLength();
        for (uint256 i = 0; i < n; i++) {
            // cheers only ever increases, so this holds regardless of how
            // many more cheers landed after the mint.
            assertGe(board.cheers(handler.ghostMinters(i)), cubes.CHEERS_REQUIRED());
        }
    }

    function invariant_OwnershipMatchesHandlerBookkeeping() public view {
        uint256 n = handler.ghostMintedIdsLength();
        for (uint256 i = 0; i < n; i++) {
            uint256 id = handler.ghostMintedIds(i);
            assertEq(cubes.ownerOf(id), handler.ghostIdOwner(id));
        }
    }

    function invariant_GhostMintersHasNoDuplicates() public view {
        uint256 n = handler.ghostMintersLength();
        for (uint256 i = 0; i < n; i++) {
            for (uint256 j = i + 1; j < n; j++) {
                assertTrue(handler.ghostMinters(i) != handler.ghostMinters(j));
            }
        }
    }
}
