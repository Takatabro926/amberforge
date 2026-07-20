// Follow-up to init-hooked-pool.mjs: the pool init succeeded
// (tx 0x77e3ecd3ceabd69f407e60f4d6bcd84f596c8735b507fc77da18e17c97048008,
// poolId 0x8dd6226b4cd8cb36c07219f559f19879b355807a95b2d501f1b0c428131af46d,
// independently re-derived offline via cast keccak and matched byte-for-
// byte against the Initialize event) but the immediately-following mint
// reverted PoolNotInitialized — the well-documented stale-public-RPC-read
// issue already logged elsewhere in this project's journal. This script is
// just the mint half, run separately so state has had time to propagate.
//
// Usage: PRIVATE_KEY=0x... node mint-hooked-pool-liquidity.mjs

import {
  createPublicClient,
  createWalletClient,
  http,
  encodeAbiParameters,
  encodePacked,
  formatEther,
  parseAbi,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const POSM = "0x7C5f5A4bBd8fD63184577525326123B519429bDc";
const AMBR = "0x4Bc12215fd6CB26BbFe1f2960AC025250fa0C6B5";
const ETH = "0x0000000000000000000000000000000000000000";
const HOOK = "0xF5B4dbc6a25a3E41d4FD3250CD3b6A5764440044";

const FEE = 10000;
const TICK_SPACING = 200;
const FULL_RANGE = { tickLower: -887200, tickUpper: 887200 };
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
  "function modifyLiquidities(bytes unlockData, uint256 deadline) payable",
  "function nextTokenId() view returns (uint256)",
]);

const actions = encodePacked(["uint8", "uint8", "uint8"], [MINT_POSITION, SETTLE_PAIR, SWEEP]);
const mintParams = encodeAbiParameters(
  [poolKeyAbi, { type: "int24" }, { type: "int24" }, { type: "uint256" }, { type: "uint128" }, { type: "uint128" }, { type: "address" }, { type: "bytes" }],
  [poolKey, FULL_RANGE.tickLower, FULL_RANGE.tickUpper, LIQUIDITY, AMOUNT0_MAX, AMOUNT1_MAX, account.address, "0x"],
);
const settleParams = encodeAbiParameters([{ type: "address" }, { type: "address" }], [ETH, AMBR]);
const sweepParams = encodeAbiParameters([{ type: "address" }, { type: "address" }], [ETH, account.address]);
const unlockData = encodeAbiParameters([{ type: "bytes" }, { type: "bytes[]" }], [actions, [mintParams, settleParams, sweepParams]]);

const tokenIdBefore = await publicClient.readContract({ address: POSM, abi: posmAbi, functionName: "nextTokenId" });
const hash = await walletClient.writeContract({
  address: POSM,
  abi: posmAbi,
  functionName: "modifyLiquidities",
  args: [unlockData, BigInt(Math.floor(Date.now() / 1000) + 600)],
  value: AMOUNT0_MAX,
});
const rcpt = await publicClient.waitForTransactionReceipt({ hash });
console.log(`modifyLiquidities(mint): ${hash} (${rcpt.status})`);
if (rcpt.status !== "success") process.exit(1);
console.log("position tokenId (expected):", tokenIdBefore.toString());
console.log("ETH left:", formatEther(await publicClient.getBalance({ address: account.address })));
