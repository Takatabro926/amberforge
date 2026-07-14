// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {AmberBoard} from "./AmberBoard.sol";

/// @title Amber Cubes (CUBE)
/// @notice Reward NFT for the Amberboard app: mintable once per address after
///         reaching CHEERS_REQUIRED cheers on the AmberBoard. Metadata and SVG
///         are generated fully on-chain — no external hosting.
contract AmberCubes is ERC721 {
    using Strings for uint256;

    AmberBoard public immutable BOARD;
    uint256 public constant CHEERS_REQUIRED = 3;

    uint256 public nextId = 1;
    mapping(address => bool) public minted;

    error AlreadyMinted();
    error NotEnoughCheers(uint256 have, uint256 need);

    constructor(AmberBoard board) ERC721("Amber Cubes", "CUBE") {
        BOARD = board;
    }

    function mintCube() external returns (uint256 id) {
        if (minted[msg.sender]) revert AlreadyMinted();
        uint256 have = BOARD.cheers(msg.sender);
        if (have < CHEERS_REQUIRED) revert NotEnoughCheers(have, CHEERS_REQUIRED);

        minted[msg.sender] = true;
        id = nextId++;
        _safeMint(msg.sender, id);
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        _requireOwned(id);
        string memory svg = string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">',
            '<rect width="200" height="200" fill="#1a120b"/>',
            '<rect x="50" y="50" width="100" height="100" rx="12" fill="#ffb300" opacity="0.9"/>',
            '<text x="100" y="112" font-family="monospace" font-size="28" text-anchor="middle" fill="#1a120b">#',
            id.toString(),
            "</text></svg>"
        );
        string memory json = string.concat(
            '{"name":"Amber Cube #',
            id.toString(),
            '","description":"Amberboard reward cube. Earned by cheering on the Amberforge board.",',
            '"image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '"}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }
}
