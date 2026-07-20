// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

import {AmberCubes} from "../../src/AmberCubes.sol";
import {AmberBoard} from "../../src/AmberBoard.sol";

/// @notice Checks the deployed AmberCubes against the live AmberBoard it reads
///         from, on a pinned Base mainnet fork. See AmberAnchor.fork.t.sol for
///         the FORK=1 opt-in convention.
contract AmberCubesForkTest is Test {
    uint256 internal constant FORK_BLOCK = 48_893_600;
    AmberCubes internal constant CUBES = AmberCubes(0x3C509A043C370b79bBd2F15fd5700a8695e348Ff);

    function setUp() public {
        if (!vm.envOr("FORK", false)) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork("base", FORK_BLOCK);
    }

    function test_PointsAtTheLiveAmberBoard() public view {
        assertEq(address(CUBES.BOARD()), 0x57E637fcC76B9d2c08E15F6C3e21c4cF77289637);
    }

    function test_MintGateStillRequiresThreeCheers() public view {
        assertEq(CUBES.CHEERS_REQUIRED(), 3);
    }

    function test_EveryMintedCubeHasADecodableTokenURI() public view {
        uint256 minted = CUBES.nextId() - 1;
        assertGt(minted, 0);
        for (uint256 id = 1; id <= minted; id++) {
            address owner = CUBES.ownerOf(id);
            assertTrue(owner != address(0));

            string memory uri = CUBES.tokenURI(id);
            string memory prefix = "data:application/json;base64,";
            bytes memory uriBytes = bytes(uri);
            bytes memory payload = new bytes(uriBytes.length - bytes(prefix).length);
            for (uint256 i = 0; i < payload.length; i++) {
                payload[i] = uriBytes[i + bytes(prefix).length];
            }
            string memory json = string(Base64.decode(string(payload)));
            assertTrue(vm.contains(json, string.concat('"name":"Amber Cube #', vm.toString(id), '"')));
        }
    }

    function test_MintedCountNeverExceedsBoardParticipants() public view {
        AmberBoard board = CUBES.BOARD();
        assertLe(CUBES.nextId() - 1, board.participantCount());
    }
}
