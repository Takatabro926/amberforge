// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Deployers} from "v4-core/test/utils/Deployers.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";

import {AmberDonationHook} from "../src/AmberDonationHook.sol";
import {HookMiner} from "../src/lib/HookMiner.sol";

contract AmberDonationHookTest is Deployers {
    AmberDonationHook internal hook;
    address internal treasury = makeAddr("treasury");
    uint256 internal constant FEE_BPS = 100; // 1% — large enough to see clearly in a small test swap

    function _mineAndDeployHook(uint256 feeBps) internal returns (AmberDonationHook) {
        uint160 flags = uint160(Hooks.AFTER_SWAP_FLAG | Hooks.AFTER_SWAP_RETURNS_DELTA_FLAG);
        bytes memory creationCode =
            abi.encodePacked(type(AmberDonationHook).creationCode, abi.encode(manager, treasury, feeBps));
        (address predicted, bytes32 salt) = HookMiner.find(address(this), flags, creationCode, 200_000);

        AmberDonationHook deployed = new AmberDonationHook{salt: salt}(manager, treasury, feeBps);
        assertEq(address(deployed), predicted, "mined salt didn't produce the predicted address");
        return deployed;
    }

    function setUp() public {
        deployFreshManagerAndRouters();
        deployMintAndApprove2Currencies();

        hook = _mineAndDeployHook(FEE_BPS);
        (key,) = initPoolAndAddLiquidity(currency0, currency1, IHooks(address(hook)), 3000, SQRT_PRICE_1_1);
    }

    function test_HookAddressEncodesOnlyAfterSwapPermissions() public view {
        assertTrue(Hooks.hasPermission(IHooks(address(hook)), Hooks.AFTER_SWAP_FLAG));
        assertTrue(Hooks.hasPermission(IHooks(address(hook)), Hooks.AFTER_SWAP_RETURNS_DELTA_FLAG));
        assertFalse(Hooks.hasPermission(IHooks(address(hook)), Hooks.BEFORE_SWAP_FLAG));
        assertFalse(Hooks.hasPermission(IHooks(address(hook)), Hooks.BEFORE_INITIALIZE_FLAG));
    }

    function test_RevertWhen_FeeAboveHardCap() public {
        vm.expectRevert(AmberDonationHook.FeeTooHigh.selector);
        new AmberDonationHook(manager, treasury, 501);
    }

    function test_ZeroForOneSwapDonatesFeeBpsOfCurrency1ToTreasury() public {
        assertEq(MockERC20(Currency.unwrap(currency1)).balanceOf(treasury), 0);

        BalanceDelta delta = swap(key, true, -1e15, ZERO_BYTES);
        int128 callerReceived = delta.amount1();
        assertGt(callerReceived, 0);

        uint256 treasuryAfter = MockERC20(Currency.unwrap(currency1)).balanceOf(treasury);
        assertGt(treasuryAfter, 0);

        uint256 grossOutput = uint256(uint128(callerReceived)) + treasuryAfter;
        assertEq(treasuryAfter, hook.calculateSkim(int128(uint128(grossOutput)), FEE_BPS));
    }

    function test_OneForZeroSwapDonatesFeeBpsOfCurrency0ToTreasury() public {
        assertEq(MockERC20(Currency.unwrap(currency0)).balanceOf(treasury), 0);

        BalanceDelta delta = swap(key, false, -1e15, ZERO_BYTES);
        int128 callerReceived = delta.amount0();
        assertGt(callerReceived, 0);

        uint256 treasuryAfter = MockERC20(Currency.unwrap(currency0)).balanceOf(treasury);
        assertGt(treasuryAfter, 0);

        uint256 grossOutput = uint256(uint128(callerReceived)) + treasuryAfter;
        assertEq(treasuryAfter, hook.calculateSkim(int128(uint128(grossOutput)), FEE_BPS));
    }

    function test_ZeroFeeHookNeverTakesAnything() public {
        AmberDonationHook zeroFeeHook = _mineAndDeployHook(0);
        (PoolKey memory zeroFeeKey,) =
            initPoolAndAddLiquidity(currency0, currency1, IHooks(address(zeroFeeHook)), 500, SQRT_PRICE_1_1);

        BalanceDelta delta = swap(zeroFeeKey, true, -1e15, ZERO_BYTES);
        assertEq(MockERC20(Currency.unwrap(currency1)).balanceOf(treasury), 0);
        assertGt(delta.amount1(), 0);
    }

    function testFuzz_CalculateSkimNeverExceedsOutputAndIsMonotonicInFee(int128 outputAmount, uint256 feeBps)
        public
        view
    {
        feeBps = bound(feeBps, 0, 500); // hook's own hard cap
        outputAmount = int128(bound(outputAmount, 0, type(int128).max));

        uint256 skim = hook.calculateSkim(outputAmount, feeBps);
        if (outputAmount > 0) {
            assertLe(skim, uint256(uint128(outputAmount)));
        }

        uint256 skimAtHigherFee = hook.calculateSkim(outputAmount, feeBps + 1 > 500 ? 500 : feeBps + 1);
        assertGe(skimAtHigherFee, skim);
    }

    function testFuzz_CalculateSkimIsZeroForNonPositiveOutputOrZeroFee(int128 outputAmount, uint256 feeBps)
        public
        view
    {
        outputAmount = int128(bound(outputAmount, type(int128).min, 0));
        assertEq(hook.calculateSkim(outputAmount, bound(feeBps, 0, 10_000)), 0);
        assertEq(hook.calculateSkim(int128(bound(outputAmount, 1, type(int128).max)), 0), 0);
    }
}
