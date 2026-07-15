// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {AmberforgeToken} from "../src/AmberforgeToken.sol";
import {AmberBoard} from "../src/AmberBoard.sol";
import {AmberCubes} from "../src/AmberCubes.sol";

contract AmberboardTest is Test {
    AmberforgeToken internal ambr;
    AmberBoard internal board;
    AmberCubes internal cubes;

    address internal deployer = makeAddr("deployer");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        vm.startPrank(deployer);
        ambr = new AmberforgeToken();
        board = new AmberBoard(IERC20(address(ambr)));
        cubes = new AmberCubes(board);
        ambr.transfer(alice, 100e18);
        vm.stopPrank();
    }

    function test_CheerCountsAndParticipants() public {
        vm.prank(alice);
        board.cheer();
        vm.prank(alice);
        board.cheer();
        vm.prank(bob);
        board.cheer();

        assertEq(board.cheers(alice), 2);
        assertEq(board.cheers(bob), 1);
        assertEq(board.totalCheers(), 3);
        assertEq(board.participantCount(), 2);
    }

    function test_LeaderboardReportsAmbrBalances() public {
        vm.prank(alice);
        board.cheer();
        vm.prank(bob);
        board.cheer();

        (address[] memory addrs, uint256[] memory counts, uint256[] memory balances) = board.leaderboard();
        assertEq(addrs.length, 2);
        assertEq(addrs[0], alice);
        assertEq(counts[0], 1);
        assertEq(balances[0], 100e18);
        assertEq(balances[1], 0);
    }

    function test_RevertWhen_MintWithoutEnoughCheers() public {
        vm.prank(alice);
        board.cheer();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(AmberCubes.NotEnoughCheers.selector, 1, 3));
        cubes.mintCube();
    }

    function test_MintCubeAfterThreeCheers() public {
        vm.startPrank(alice);
        board.cheer();
        board.cheer();
        board.cheer();
        uint256 id = cubes.mintCube();
        vm.stopPrank();

        assertEq(id, 1);
        assertEq(cubes.ownerOf(1), alice);
        // On-chain metadata resolves
        assertGt(bytes(cubes.tokenURI(1)).length, 100);
    }

    function test_RevertWhen_MintTwice() public {
        vm.startPrank(alice);
        board.cheer();
        board.cheer();
        board.cheer();
        cubes.mintCube();
        vm.expectRevert(AmberCubes.AlreadyMinted.selector);
        cubes.mintCube();
        vm.stopPrank();
    }

    function test_CheeredEventCarriesRunningCounts() public {
        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit AmberBoard.Cheered(alice, 1, 1);
        board.cheer();

        vm.prank(bob);
        vm.expectEmit(true, false, false, true);
        emit AmberBoard.Cheered(bob, 1, 2);
        board.cheer();

        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit AmberBoard.Cheered(alice, 2, 3);
        board.cheer();
    }

    function test_ParticipantRegisteredOnlyOnce() public {
        vm.startPrank(alice);
        board.cheer();
        board.cheer();
        board.cheer();
        vm.stopPrank();
        assertEq(board.participantCount(), 1);
    }

    function test_LeaderboardBalancesAreLiveNotSnapshotted() public {
        vm.prank(alice);
        board.cheer();

        (,, uint256[] memory before) = board.leaderboard();
        assertEq(before[0], 100e18);

        vm.prank(alice);
        ambr.transfer(bob, 40e18);

        (,, uint256[] memory afterTransfer) = board.leaderboard();
        assertEq(afterTransfer[0], 60e18);
    }

    function testFuzz_TotalsAlwaysConsistent(uint8 aliceCheers, uint8 bobCheers) public {
        uint256 a = bound(aliceCheers, 0, 30);
        uint256 b = bound(bobCheers, 0, 30);
        for (uint256 i = 0; i < a; i++) {
            vm.prank(alice);
            board.cheer();
        }
        for (uint256 i = 0; i < b; i++) {
            vm.prank(bob);
            board.cheer();
        }
        assertEq(board.totalCheers(), a + b);
        assertEq(board.cheers(alice), a);
        assertEq(board.cheers(bob), b);
        assertEq(board.participantCount(), (a > 0 ? 1 : 0) + (b > 0 ? 1 : 0));
    }
}
