// Uniswap V4 on Base mainnet: initialize a SECOND native-ETH/AMBR pool, this
// one with AmberDonationHook attached (different fee tier from the hookless
// pool in univ4-ambr.mjs, since the hook address makes this a distinct pool
// regardless), then mint a tiny full-range position.
//
// Usage: PRIVATE_KEY=0x... node init-hooked-pool.mjs

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

const POSM = "0x7C5f5A4bBd8fD63184577525326123B519429bDc";
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const AMBR = "0x4Bc12215fd6CB26BbFe1f2960AC025250fa0C6B5";
const ETH = "0x0000000000000000000000000000000000000000";
const HOOK = "0xF5B4dbc6a25a3E41d4FD3250CD3b6A5764440044"; // AmberDonationHook, feeBps=20

const SQRT_PRICE_X96 = 100n * 2n ** 96n; // same 10,000 AMBR/ETH price as the hookless pool
const FEE = 10000; // 1% tier -> distinct pool from the hookless 0.3% one
const TICK_SPACING = 200;
const FULL_RANGE = { tickLower: -887200, tickUpper: 887200 }; // nearest multiples of 200
const LIQUIDITY = 2n * 10n ** 16n;
const AMOUNT0_MAX = parseEther("0.00021");
const AMOUNT1_MAX = parseEther("2.1");

const MINT_POSITION = 0x02;
const SETTLE_PAIR = 0x0d;
const SWEEP = 0x14;

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const publicClient = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });
const walletClient = createWalletClient({ account, chain: base, transport: http("https://mainnet.base.org") });

const poolKey = { currency0: ETH, currency1: AMBR, fee: FEE, tickSpacing: TICK_SPACING, hooks: HOOK };
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
  "function allowance(address owner, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)",
  "function approve(address token, address spender, uint160 amount, uint48 expiration)",
]);

const send = async (name, fn) => {
  const hash = await fn();
  const rcpt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`${name}: ${hash} (${rcpt.status})`);
  if (rcpt.status !== "success") process.exit(1);
  return rcpt;
};

try {
  await send("initializePool (hooked)", () =>
    walletClient.writeContract({
      address: POSM,
      abi: posmAbi,
      functionName: "initializePool",
      args: [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks], SQRT_PRICE_X96],
    }),
  );
} catch (e) {
  console.log("initializePool skipped:", e.shortMessage ?? e.message);
}

// AMBR->Permit2->POSM approvals from the hookless pool setup still cover
// this pool too (Permit2 allowances are keyed by token+spender, not by pool).
const [permit2Amount] = await publicClient.readContract({
  address: PERMIT2,
  abi: permit2Abi,
  functionName: "allowance",
  args: [account.address, AMBR, POSM],
});
if (permit2Amount < AMOUNT1_MAX) {
  await send("AMBR.approve(Permit2)", () =>
    walletClient.writeContract({ address: AMBR, abi: erc20Abi, functionName: "approve", args: [PERMIT2, maxUint256] }),
  );
  await send("Permit2.approve(AMBR -> posm)", () =>
    walletClient.writeContract({
      address: PERMIT2,
      abi: permit2Abi,
      functionName: "approve",
      args: [AMBR, POSM, maxUint160, 2n ** 48n - 1n],
    }),
  );
} else {
  console.log("Permit2 allowance already covers this mint, skipping approvals");
}

const actions = encodePacked(["uint8", "uint8", "uint8"], [MINT_POSITION, SETTLE_PAIR, SWEEP]);
const mintParams = encodeAbiParameters(
  [poolKeyAbi, { type: "int24" }, { type: "int24" }, { type: "uint256" }, { type: "uint128" }, { type: "uint128" }, { type: "address" }, { type: "bytes" }],
  [poolKey, FULL_RANGE.tickLower, FULL_RANGE.tickUpper, LIQUIDITY, AMOUNT0_MAX, AMOUNT1_MAX, account.address, "0x"],
);
const settleParams = encodeAbiParameters([{ type: "address" }, { type: "address" }], [ETH, AMBR]);
const sweepParams = encodeAbiParameters([{ type: "address" }, { type: "address" }], [ETH, account.address]);
const unlockData = encodeAbiParameters([{ type: "bytes" }, { type: "bytes[]" }], [actions, [mintParams, settleParams, sweepParams]]);

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
