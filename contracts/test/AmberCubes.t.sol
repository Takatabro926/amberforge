// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

import {AmberforgeToken} from "../src/AmberforgeToken.sol";
import {AmberBoard} from "../src/AmberBoard.sol";
import {AmberCubes} from "../src/AmberCubes.sol";

contract AmberCubesTest is Test {
    AmberforgeToken internal ambr;
    AmberBoard internal board;
    AmberCubes internal cubes;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");

    function setUp() public {
        ambr = new AmberforgeToken();
        board = new AmberBoard(IERC20(address(ambr)));
        cubes = new AmberCubes(board);
    }

    function _earnCube(address who) internal returns (uint256 id) {
        vm.startPrank(who);
        for (uint256 i = 0; i < cubes.CHEERS_REQUIRED(); i++) {
            board.cheer();
        }
        id = cubes.mintCube();
        vm.stopPrank();
    }

    function test_IdsAreSequentialAcrossMinters() public {
        assertEq(_earnCube(alice), 1);
        assertEq(_earnCube(bob), 2);
        assertEq(_earnCube(carol), 3);
        assertEq(cubes.nextId(), 4);
    }

    function test_ExtraCheersDoNotUnlockASecondCube() public {
        _earnCube(alice);
        vm.startPrank(alice);
        board.cheer();
        board.cheer();
        board.cheer();
        vm.expectRevert(AmberCubes.AlreadyMinted.selector);
        cubes.mintCube();
        vm.stopPrank();
    }

    function test_TransferDoesNotResetMintGate() public {
        uint256 id = _earnCube(alice);
        vm.prank(alice);
        cubes.transferFrom(alice, bob, id);

        assertEq(cubes.ownerOf(id), bob);
        // alice no longer owns a cube but is still marked as having minted
        assertTrue(cubes.minted(alice));
        vm.prank(alice);
        vm.expectRevert(AmberCubes.AlreadyMinted.selector);
        cubes.mintCube();
    }

    function test_ApprovedOperatorCanTransfer() public {
        uint256 id = _earnCube(alice);
        vm.prank(alice);
        cubes.approve(bob, id);
        vm.prank(bob);
        cubes.transferFrom(alice, carol, id);
        assertEq(cubes.ownerOf(id), carol);
    }

    function test_RevertWhen_UnapprovedTransfer() public {
        uint256 id = _earnCube(alice);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721InsufficientApproval.selector, bob, id));
        cubes.transferFrom(alice, bob, id);
    }

    function test_TokenURIEmbedsIdInSvgAndJson() public {
        uint256 id = _earnCube(alice);
        string memory uri = cubes.tokenURI(id);

        // data:application/json;base64,<payload> — decode and check the payload
        string memory prefix = "data:application/json;base64,";
        bytes memory uriBytes = bytes(uri);
        bytes memory payload = new bytes(uriBytes.length - bytes(prefix).length);
        for (uint256 i = 0; i < payload.length; i++) {
            payload[i] = uriBytes[i + bytes(prefix).length];
        }
        string memory json = string(Base64.decode(string(payload)));

        assertTrue(vm.contains(json, '"name":"Amber Cube #1"'));
        assertTrue(vm.contains(json, "data:image/svg+xml;base64,"));
    }

    function test_RevertWhen_TokenURIForNonexistentId() public {
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, 42));
        cubes.tokenURI(42);
    }

    function testFuzz_MintGateEnforcedForAnyCheerCount(uint8 cheerCount) public {
        uint256 n = bound(cheerCount, 0, 20);
        vm.startPrank(alice);
        for (uint256 i = 0; i < n; i++) {
            board.cheer();
        }
        if (n < cubes.CHEERS_REQUIRED()) {
            vm.expectRevert(abi.encodeWithSelector(AmberCubes.NotEnoughCheers.selector, n, cubes.CHEERS_REQUIRED()));
            cubes.mintCube();
        } else {
            assertEq(cubes.mintCube(), 1);
        }
        vm.stopPrank();
    }

    function testFuzz_IdOrderFollowsMintCallOrderNotCheerOrder(uint8 firstCheers, uint8 secondCheers) public {
        uint256 a = bound(firstCheers, 3, 20);
        uint256 b = bound(secondCheers, 3, 20);

        vm.startPrank(bob);
        for (uint256 i = 0; i < b; i++) {
            board.cheer();
        }
        vm.stopPrank();

        vm.startPrank(alice);
        for (uint256 i = 0; i < a; i++) {
            board.cheer();
        }
        vm.stopPrank();

        // alice out-cheered bob but mints second — ids track call order, not cheer count.
        vm.prank(bob);
        uint256 bobId = cubes.mintCube();
        vm.prank(alice);
        uint256 aliceId = cubes.mintCube();

        assertEq(bobId, 1);
        assertEq(aliceId, 2);
    }

    function testFuzz_TransferChainNeverUnlocksASecondMintForAnyHolder(uint8 hops) public {
        uint256 id = _earnCube(alice);
        uint256 n = bound(hops, 1, 8);

        address current = alice;
        for (uint256 i = 0; i < n; i++) {
            address next = address(uint160(uint256(keccak256(abi.encode("hop", i)))));
            vm.prank(current);
            cubes.transferFrom(current, next, id);
            current = next;
        }
        assertEq(cubes.ownerOf(id), current);

        // every past holder along the chain is still gate-locked, even the ones
        // that no longer own the token and never will again.
        vm.prank(alice);
        vm.expectRevert(AmberCubes.AlreadyMinted.selector);
        cubes.mintCube();
    }
}
