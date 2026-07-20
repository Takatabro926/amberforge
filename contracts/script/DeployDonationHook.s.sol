// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";

import {AmberDonationHook} from "../src/AmberDonationHook.sol";
import {HookMiner} from "../src/lib/HookMiner.sol";

/// @notice Mines a CREATE2 salt for AmberDonationHook against the canonical
///         deterministic deployer (same factory AmberAnchor used) and
///         broadcasts the deploy through it. Treasury defaults to the
///         deployer wallet, not AmberBoard — AmberBoard has no withdrawal
///         path for arbitrary ERC20/ETH it didn't mint itself, so routing
///         real (if small) skimmed value there would strand it permanently.
contract DeployDonationHook is Script {
    // CREATE2_FACTORY is inherited from forge-std's Base.sol (same canonical
    // deterministic deployer AmberAnchor used).
    address internal constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;

    function run() external returns (address hookAddress) {
        address treasury = vm.envAddress("HOOK_TREASURY");
        uint256 feeBps = vm.envOr("HOOK_FEE_BPS", uint256(20)); // default 0.2% — a donation, not a toll

        uint160 flags = uint160(Hooks.AFTER_SWAP_FLAG | Hooks.AFTER_SWAP_RETURNS_DELTA_FLAG);
        bytes memory creationCode = abi.encodePacked(
            type(AmberDonationHook).creationCode, abi.encode(IPoolManager(POOL_MANAGER), treasury, feeBps)
        );
        (address predicted, bytes32 salt) = HookMiner.find(CREATE2_FACTORY, flags, creationCode, 500_000);
        console2.log("predicted hook address:", predicted);
        console2.log("salt:", vm.toString(salt));
        console2.log("treasury:", treasury);
        console2.log("feeBps:", feeBps);

        vm.startBroadcast();
        (bool ok,) = CREATE2_FACTORY.call(abi.encodePacked(salt, creationCode));
        require(ok, "CREATE2 deploy failed");
        vm.stopBroadcast();

        require(predicted.code.length > 0, "no code at predicted address");
        hookAddress = predicted;
        console2.log("deployed at:", hookAddress);
    }
}
