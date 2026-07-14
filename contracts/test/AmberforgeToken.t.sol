// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {AmberforgeToken} from "../src/AmberforgeToken.sol";

contract AmberforgeTokenTest is Test {
    AmberforgeToken internal token;

    address internal deployer = makeAddr("deployer");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint256 internal constant SUPPLY = 1_000_000e18;

    function setUp() public {
        vm.prank(deployer);
        token = new AmberforgeToken();
    }

    function test_Metadata() public view {
        assertEq(token.name(), "Amberforge Token");
        assertEq(token.symbol(), "AMBR");
        assertEq(token.decimals(), 18);
    }

    function test_InitialSupplyMintedToDeployer() public view {
        assertEq(token.totalSupply(), SUPPLY);
        assertEq(token.balanceOf(deployer), SUPPLY);
    }

    function test_Transfer() public {
        vm.prank(deployer);
        token.transfer(alice, 100e18);

        assertEq(token.balanceOf(alice), 100e18);
        assertEq(token.balanceOf(deployer), SUPPLY - 100e18);
    }

    function test_RevertWhen_TransferExceedsBalance() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, alice, 0, 1)
        );
        token.transfer(bob, 1);
    }

    function test_ApproveAndTransferFrom() public {
        vm.prank(deployer);
        token.approve(alice, 500e18);
        assertEq(token.allowance(deployer, alice), 500e18);

        vm.prank(alice);
        token.transferFrom(deployer, bob, 200e18);

        assertEq(token.balanceOf(bob), 200e18);
        // Allowance is spent, not reset
        assertEq(token.allowance(deployer, alice), 300e18);
    }

    function test_RevertWhen_TransferFromWithoutAllowance() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, alice, 0, 1e18)
        );
        token.transferFrom(deployer, bob, 1e18);
    }

    function test_BurnReducesTotalSupply() public {
        vm.prank(deployer);
        token.burn(1_000e18);

        assertEq(token.totalSupply(), SUPPLY - 1_000e18);
        assertEq(token.balanceOf(deployer), SUPPLY - 1_000e18);
    }

    function test_BurnFromSpendsAllowance() public {
        vm.prank(deployer);
        token.approve(alice, 50e18);

        vm.prank(alice);
        token.burnFrom(deployer, 50e18);

        assertEq(token.totalSupply(), SUPPLY - 50e18);
        assertEq(token.allowance(deployer, alice), 0);
    }

    function testFuzz_Transfer(uint256 amount) public {
        amount = bound(amount, 0, SUPPLY);

        vm.prank(deployer);
        token.transfer(alice, amount);

        assertEq(token.balanceOf(alice), amount);
        assertEq(token.balanceOf(deployer), SUPPLY - amount);
    }
}
