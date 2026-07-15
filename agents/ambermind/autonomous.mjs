// AmberMind autonomous sentinel: observe -> decide -> act, no human in the loop
// within a run. The agent reads real-world and onchain signals, evaluates its
// policy, and only if every condition passes does it execute an onchain action
// (cheer() on the mainnet AmberBoard) carrying its ERC-8021 attribution suffix.
//
// Policy (all must hold, otherwise the agent stands down and reports why):
//   1. Chainlink ETH/USD feed is fresh (updated within MAX_FEED_AGE_S)
//   2. price is inside the sanity band [PRICE_MIN, PRICE_MAX] USD
//   3. current base fee is below MAX_BASE_FEE_GWEI (act only when blockspace is cheap)
//   4. the agent wallet holds at least MIN_AMBR AMBR (inventory sanity)
//
// Usage: PRIVATE_KEY=0x... node autonomous.mjs [--dry-run]

import { createWalletClient, createPublicClient, http, formatUnits, erc20Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { Attribution } from "ox/erc8021";

const BUILDER_CODE = "bc_vsdrc64m"; // agent's own code, see builderCode.ts
const DATA_SUFFIX = Attribution.toDataSuffix({ codes: [BUILDER_CODE] });

const BOARD = "0x57E637fcC76B9d2c08E15F6C3e21c4cF77289637"; // AmberBoard (Base mainnet)
const AMBR = "0x4Bc12215fd6CB26BbFe1f2960AC025250fa0C6B5"; // Amberforge Token (Base mainnet)
const CHAINLINK_ETH_USD = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70"; // verified: description() == "ETH / USD"

const POLICY = {
  MAX_FEED_AGE_S: 3600,
  PRICE_MIN_USD: 500,
  PRICE_MAX_USD: 10000,
  MAX_BASE_FEE_GWEI: 0.15,
  MIN_AMBR: 100n * 10n ** 18n,
};

const feedAbi = [
  {
    type: "function", name: "latestRoundData", stateMutability: "view", inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" }, { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" }, { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
];
const boardAbi = [
  { type: "function", name: "cheer", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "cheers", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
];

const dryRun = process.argv.includes("--dry-run");
const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const publicClient = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });

// --- observe ---
const [round, block, ambrBalance, cheersBefore] = await Promise.all([
  publicClient.readContract({ address: CHAINLINK_ETH_USD, abi: feedAbi, functionName: "latestRoundData" }),
  publicClient.getBlock(),
  publicClient.readContract({ address: AMBR, abi: erc20Abi, functionName: "balanceOf", args: [account.address] }),
  publicClient.readContract({ address: BOARD, abi: boardAbi, functionName: "cheers", args: [account.address] }),
]);

const priceUsd = Number(round[1]) / 1e8;
const feedAgeS = Number(block.timestamp - round[3]);
const baseFeeGwei = Number(formatUnits(block.baseFeePerGas ?? 0n, 9));

// --- decide ---
const checks = {
  feedFresh: feedAgeS <= POLICY.MAX_FEED_AGE_S,
  priceInBand: priceUsd >= POLICY.PRICE_MIN_USD && priceUsd <= POLICY.PRICE_MAX_USD,
  gasCheap: baseFeeGwei < POLICY.MAX_BASE_FEE_GWEI,
  inventoryOk: ambrBalance >= POLICY.MIN_AMBR,
};
const act = Object.values(checks).every(Boolean);

const trace = {
  agent: account.address,
  observed: {
    ethUsd: priceUsd,
    feedAgeS,
    baseFeeGwei,
    ambr: formatUnits(ambrBalance, 18),
    cheersBefore: Number(cheersBefore),
  },
  checks,
  decision: act ? "ACT" : "STAND_DOWN",
};
console.log(JSON.stringify(trace, null, 2));

// --- act ---
if (!act || dryRun) {
  if (dryRun && act) console.log("dry-run: would have acted");
  process.exit(0);
}

const walletClient = createWalletClient({ account, chain: base, transport: http("https://mainnet.base.org") });
const hash = await walletClient.writeContract({
  address: BOARD,
  abi: boardAbi,
  functionName: "cheer",
  dataSuffix: DATA_SUFFIX,
});
console.log("action tx:", hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
const cheersAfter = await publicClient.readContract({ address: BOARD, abi: boardAbi, functionName: "cheers", args: [account.address] });
console.log("status:", receipt.status, "| cheers:", Number(cheersBefore), "->", Number(cheersAfter));
