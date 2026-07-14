// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title AmberBoard
/// @notice Onchain tally for the Amberboard app: anyone can `cheer()`; the
///         leaderboard ranks participants by cheer count and reports their
///         AMBR balance alongside. Write path for the Amberforge mini app.
contract AmberBoard {
    IERC20 public immutable AMBR;

    mapping(address => uint256) public cheers;
    uint256 public totalCheers;

    address[] private _participants;
    mapping(address => bool) private _seen;

    event Cheered(address indexed who, uint256 count, uint256 totalCheers);

    constructor(IERC20 ambr) {
        AMBR = ambr;
    }

    function cheer() external {
        if (!_seen[msg.sender]) {
            _seen[msg.sender] = true;
            _participants.push(msg.sender);
        }
        cheers[msg.sender] += 1;
        totalCheers += 1;
        emit Cheered(msg.sender, cheers[msg.sender], totalCheers);
    }

    function participantCount() external view returns (uint256) {
        return _participants.length;
    }

    /// @notice Full board in one call: participants, their cheer counts, and AMBR balances.
    function leaderboard()
        external
        view
        returns (address[] memory addrs, uint256[] memory counts, uint256[] memory ambrBalances)
    {
        uint256 n = _participants.length;
        addrs = new address[](n);
        counts = new uint256[](n);
        ambrBalances = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            address p = _participants[i];
            addrs[i] = p;
            counts[i] = cheers[p];
            ambrBalances[i] = AMBR.balanceOf(p);
        }
    }
}
