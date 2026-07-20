// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {SafeCast} from "v4-core/src/libraries/SafeCast.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/src/types/BeforeSwapDelta.sol";

/// @title AmberDonationHook
/// @notice The first mechanism neither the evmpirate/0x6 nor the
///         amberforge/0x23 wallet had tried: a Uniswap v4 hook. Every swap
///         through a pool that has this hook attached donates a small basis-
///         point cut of the swapper's output to a treasury address — here,
///         the AmberBoard contract itself. Only afterSwap is permissioned;
///         every other IHooks callback is a bare no-op required by the
///         interface but never invoked (PoolManager checks the deployed
///         address's low bits before calling out, per Hooks.sol).
contract AmberDonationHook is IHooks {
    using SafeCast for uint256;

    IPoolManager public immutable POOL_MANAGER;
    address public immutable TREASURY;
    uint256 public immutable FEE_BPS;

    error NotPoolManager();
    error FeeTooHigh();

    event Donated(Currency indexed currency, uint256 amount);

    modifier onlyPoolManager() {
        if (msg.sender != address(POOL_MANAGER)) revert NotPoolManager();
        _;
    }

    constructor(IPoolManager poolManager, address treasury, uint256 feeBps) {
        if (feeBps > 500) revert FeeTooHigh(); // hard cap 5% — this is a donation, not a toll
        POOL_MANAGER = poolManager;
        TREASURY = treasury;
        FEE_BPS = feeBps;
        Hooks.validateHookPermissions(this, getHookPermissions());
    }

    function getHookPermissions() public pure returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: false,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: true,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    /// @dev Skims FEE_BPS/10000 of whatever the swapper is about to receive
    ///      and routes it to TREASURY via the pool manager's own accounting
    ///      (take() + a positive returned delta — the swapper's settlement
    ///      is reduced by exactly the amount already paid out here, so
    ///      nothing is double-counted).
    function afterSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        BalanceDelta swapDelta,
        bytes calldata
    ) external onlyPoolManager returns (bytes4, int128) {
        (Currency outputCurrency, int128 outputAmount) = params.zeroForOne
            ? (key.currency1, swapDelta.amount1())
            : (key.currency0, swapDelta.amount0());

        uint256 skim = calculateSkim(outputAmount, FEE_BPS);
        if (skim == 0) {
            return (IHooks.afterSwap.selector, 0);
        }

        POOL_MANAGER.take(outputCurrency, TREASURY, skim);
        emit Donated(outputCurrency, skim);
        return (IHooks.afterSwap.selector, skim.toInt128());
    }

    /// @notice Pure fee math, split out from afterSwap so it's fuzzable
    ///         without a live PoolManager/swap in the loop.
    function calculateSkim(int128 outputAmount, uint256 feeBps) public pure returns (uint256) {
        if (outputAmount <= 0 || feeBps == 0) return 0;
        // forge-lint: disable-next-line(unsafe-typecast) — outputAmount > 0 is checked above
        return (uint256(int256(outputAmount)) * feeBps) / 10_000;
    }

    // --- unpermissioned IHooks callbacks: never invoked, bare stubs only ---

    function beforeInitialize(address, PoolKey calldata, uint160) external pure returns (bytes4) {
        return IHooks.beforeInitialize.selector;
    }

    function afterInitialize(address, PoolKey calldata, uint160, int24) external pure returns (bytes4) {
        return IHooks.afterInitialize.selector;
    }

    function beforeAddLiquidity(address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return IHooks.beforeAddLiquidity.selector;
    }

    function afterAddLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure returns (bytes4, BalanceDelta) {
        return (IHooks.afterAddLiquidity.selector, BalanceDeltaLibrary.ZERO_DELTA);
    }

    function beforeRemoveLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        return IHooks.beforeRemoveLiquidity.selector;
    }

    function afterRemoveLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure returns (bytes4, BalanceDelta) {
        return (IHooks.afterRemoveLiquidity.selector, BalanceDeltaLibrary.ZERO_DELTA);
    }

    function beforeSwap(address, PoolKey calldata, IPoolManager.SwapParams calldata, bytes calldata)
        external
        pure
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return IHooks.beforeDonate.selector;
    }

    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return IHooks.afterDonate.selector;
    }
}
