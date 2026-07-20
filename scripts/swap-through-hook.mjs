// Executes one real swap through the hooked ETH/AMBR pool via the freshly
// deployed PoolSwapTest (0xA3175A6D033Ad21894BA0DF648c48F684a0Fc715), the
// same router contract type already proven correct in
// contracts/test/AmberDonationHook.t.sol. Small exact-input ETH->AMBR swap,
// just enough to trigger afterSwap and see a real Donated event + treasury
// balance move on Base mainnet.
//
// Usage: PRIVATE_KEY=0x... node swap-through-hook.mjs

import { createPublicClient, createWalletClient, http, formatEther, parseAbi, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const SWAP_ROUTER = "0xA3175A6D033Ad21894BA0DF648c48F684a0Fc715";
const AMBR = "0x4Bc12215fd6CB26BbFe1f2960AC025250fa0C6B5";
const ETH = "0x0000000000000000000000000000000000000000";
const HOOK = "0xF5B4dbc6a25a3E41d4FD3250CD3b6A5764440044";

const FEE = 10000;
const TICK_SPACING = 200;
const MIN_SQRT_PRICE_PLUS_ONE = 4295128740n; // TickMath.MIN_SQRT_PRICE + 1
const AMOUNT_IN = parseEther("0.00002");

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const publicClient = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });
const walletClient = createWalletClient({ account, chain: base, transport: http("https://mainnet.base.org") });

const poolKey = { currency0: ETH, currency1: AMBR, fee: FEE, tickSpacing: TICK_SPACING, hooks: HOOK };
const swapAbi = parseAbi([
  // BalanceDelta is a UDVT over int256 (packs amount0/amount1 as two int128s) — single value in the ABI.
  "function swap((address,address,uint24,int24,address) key, (bool,int256,uint160) params, (bool,bool) testSettings, bytes hookData) payable returns (int256)",
]);

const hash = await walletClient.writeContract({
  address: SWAP_ROUTER,
  abi: swapAbi,
  functionName: "swap",
  args: [
    [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
    [true, -AMOUNT_IN, MIN_SQRT_PRICE_PLUS_ONE],
    [false, false],
    "0x",
  ],
  value: AMOUNT_IN,
});
const rcpt = await publicClient.waitForTransactionReceipt({ hash });
console.log(`swap: ${hash} (${rcpt.status})`);
if (rcpt.status !== "success") process.exit(1);

console.log("ETH left:", formatEther(await publicClient.getBalance({ address: account.address })));
console.log(
  "deployer AMBR balance now:",
  await publicClient.readContract({
    address: AMBR,
    abi: parseAbi(["function balanceOf(address) view returns (uint256)"]),
    functionName: "balanceOf",
    args: [account.address],
  }),
);
