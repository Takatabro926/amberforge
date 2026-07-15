// Uniswap V4 on Base mainnet: initialize a hookless native-ETH/AMBR pool on the
// PoolManager singleton, then mint a tiny full-range position via PositionManager.
// V4 differences vs V3 exercised here: singleton pools (no factory deploy), native
// ETH as currency0 (no WETH), Permit2 for token settlement, Actions-encoded mint.
//
// Usage: PRIVATE_KEY=0x... node univ4-ambr.mjs

import {
  createPublicClient,
  createWalletClient,
  http,
  encodeAbiParameters,
  encodePacked,
  erc20Abi,
  formatEther,
  maxUint160,
  maxUint256,
  parseAbi,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const POOL_MANAGER = "0x498581fF718922c3f8e6A244956aF099B2652b2b";
const POSM = "0x7C5f5A4bBd8fD63184577525326123B519429bDc";
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const AMBR = "0x4Bc12215fd6CB26BbFe1f2960AC025250fa0C6B5";
const ETH = "0x0000000000000000000000000000000000000000"; // native currency0

// price: 10,000 AMBR per ETH -> sqrtPriceX96 = sqrt(10000) * 2^96
const SQRT_PRICE_X96 = 100n * 2n ** 96n;
const FEE = 3000;
const TICK_SPACING = 60;
const FULL_RANGE = { tickLower: -887220, tickUpper: 887220 };
const LIQUIDITY = 2n * 10n ** 16n; // ~0.0002 ETH + ~2 AMBR at this price
const AMOUNT0_MAX = parseEther("0.00021");
const AMOUNT1_MAX = parseEther("2.1");

// v4-periphery Actions
const MINT_POSITION = 0x02;
const SETTLE_PAIR = 0x0d;
const SWEEP = 0x14;

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const publicClient = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });
const walletClient = createWalletClient({ account, chain: base, transport: http("https://mainnet.base.org") });

const poolKey = {
  currency0: ETH,
  currency1: AMBR,
  fee: FEE,
  tickSpacing: TICK_SPACING,
  hooks: ETH,
};
const poolKeyAbi = {
  type: "tuple",
  components: [
    { name: "currency0", type: "address" },
    { name: "currency1", type: "address" },
    { name: "fee", type: "uint24" },
    { name: "tickSpacing", type: "int24" },
    { name: "hooks", type: "address" },
  ],
};

const posmAbi = parseAbi([
  "function initializePool((address,address,uint24,int24,address) key, uint160 sqrtPriceX96) payable returns (int24)",
  "function modifyLiquidities(bytes unlockData, uint256 deadline) payable",
  "function nextTokenId() view returns (uint256)",
]);
const permit2Abi = parseAbi([
  "function approve(address token, address spender, uint160 amount, uint48 expiration)",
]);

const send = async (name, fn) => {
  const hash = await fn();
  const rcpt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`${name}: ${hash} (${rcpt.status})`);
  if (rcpt.status !== "success") process.exit(1);
  return rcpt;
};

// 1. initialize the pool (idempotent guard: revert means already initialized)
try {
  await send("initializePool", () =>
    walletClient.writeContract({
      address: POSM,
      abi: posmAbi,
      functionName: "initializePool",
      args: [
        [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
        SQRT_PRICE_X96,
      ],
    }),
  );
} catch (e) {
  console.log("initializePool skipped:", e.shortMessage ?? e.message);
}

// 2. Permit2 plumbing for AMBR
await send("AMBR.approve(Permit2)", () =>
  walletClient.writeContract({
    address: AMBR,
    abi: erc20Abi,
    functionName: "approve",
    args: [PERMIT2, maxUint256],
  }),
);
await send("Permit2.approve(AMBR -> posm)", () =>
  walletClient.writeContract({
    address: PERMIT2,
    abi: permit2Abi,
    functionName: "approve",
    args: [AMBR, POSM, maxUint160, 2n ** 48n - 1n],
  }),
);

// 3. mint full-range position: MINT_POSITION + SETTLE_PAIR + SWEEP(excess ETH back)
const actions = encodePacked(["uint8", "uint8", "uint8"], [MINT_POSITION, SETTLE_PAIR, SWEEP]);
const mintParams = encodeAbiParameters(
  [
    poolKeyAbi,
    { type: "int24" },
    { type: "int24" },
    { type: "uint256" },
    { type: "uint128" },
    { type: "uint128" },
    { type: "address" },
    { type: "bytes" },
  ],
  [poolKey, FULL_RANGE.tickLower, FULL_RANGE.tickUpper, LIQUIDITY, AMOUNT0_MAX, AMOUNT1_MAX, account.address, "0x"],
);
const settleParams = encodeAbiParameters([{ type: "address" }, { type: "address" }], [ETH, AMBR]);
const sweepParams = encodeAbiParameters([{ type: "address" }, { type: "address" }], [ETH, account.address]);
const unlockData = encodeAbiParameters(
  [{ type: "bytes" }, { type: "bytes[]" }],
  [actions, [mintParams, settleParams, sweepParams]],
);

const tokenIdBefore = await publicClient.readContract({ address: POSM, abi: posmAbi, functionName: "nextTokenId" });
await send("modifyLiquidities(mint)", () =>
  walletClient.writeContract({
    address: POSM,
    abi: posmAbi,
    functionName: "modifyLiquidities",
    args: [unlockData, BigInt(Math.floor(Date.now() / 1000) + 600)],
    value: AMOUNT0_MAX,
  }),
);
console.log("position tokenId (expected):", tokenIdBefore.toString());
console.log("ETH left:", formatEther(await publicClient.getBalance({ address: account.address })));
