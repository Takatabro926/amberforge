// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CommonBase} from "forge-std/Base.sol";
import {StdCheats} from "forge-std/StdCheats.sol";
import {StdUtils} from "forge-std/StdUtils.sol";

import {AmberBoard} from "../../src/AmberBoard.sol";
import {AmberCubes} from "../../src/AmberCubes.sol";

/// @notice Drives AmberBoard.cheer / AmberCubes.mintCube / transferFrom from a
///         fixed cast of actors and records ghost state the invariants below
///         can check against, since the contracts themselves don't expose a
///         "who has ever minted" list or a running owner index.
contract AmberCubesHandler is CommonBase, StdCheats, StdUtils {
    AmberBoard public immutable BOARD;
    AmberCubes public immutable CUBES;

    address[] public actors;
    address[] public ghostMinters;
    mapping(address => bool) public isGhostMinter;
    uint256[] public ghostMintedIds;
    mapping(uint256 => address) public ghostIdOwner;

    constructor(AmberBoard board, AmberCubes cubes) {
        BOARD = board;
        CUBES = cubes;
        for (uint256 i = 0; i < 5; i++) {
            actors.push(address(uint160(uint256(keccak256(abi.encode("amber-cubes-actor", i))))));
        }
    }

    function actorsLength() external view returns (uint256) {
        return actors.length;
    }

    function ghostMintersLength() external view returns (uint256) {
        return ghostMinters.length;
    }

    function ghostMintedIdsLength() external view returns (uint256) {
        return ghostMintedIds.length;
    }

    function cheer(uint256 actorSeed) external {
        address actor = actors[bound(actorSeed, 0, actors.length - 1)];
        vm.prank(actor);
        BOARD.cheer();
    }

    function mintCube(uint256 actorSeed) external {
        address actor = actors[bound(actorSeed, 0, actors.length - 1)];
        vm.prank(actor);
        try CUBES.mintCube() returns (uint256 id) {
            if (!isGhostMinter[actor]) {
                isGhostMinter[actor] = true;
                ghostMinters.push(actor);
            }
            ghostMintedIds.push(id);
            ghostIdOwner[id] = actor;
        } catch {
            // AlreadyMinted or NotEnoughCheers — expected under-constrained paths, ignore.
        }
    }

    function transferCube(uint256 idSeed, uint256 toSeed) external {
        if (ghostMintedIds.length == 0) return;
        uint256 id = ghostMintedIds[bound(idSeed, 0, ghostMintedIds.length - 1)];
        address currentOwner = CUBES.ownerOf(id);
        address to = actors[bound(toSeed, 0, actors.length - 1)];
        vm.prank(currentOwner);
        CUBES.transferFrom(currentOwner, to, id);
        ghostIdOwner[id] = to;
    }
}
