import type { PublicClient } from "viem";

import { BOARD_ADDRESS, boardAbi } from "./contracts";

// Same feed AmberMind's autonomous.mjs already reads and has verified
// (description() == "ETH / USD") — reused here for a *display* purpose
// instead of a gate-the-transaction policy check.
export const CHAINLINK_ETH_USD = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70" as const;
export const MAX_FEED_AGE_S = 3600;

const feedAbi = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

export type NetworkCost = {
  ethUsd: number;
  feedAgeS: number;
  stale: boolean;
  baseFeeGwei: number;
  cheerGas: bigint;
  cheerCostUsd: number;
};

export async function fetchNetworkCost(client: PublicClient): Promise<NetworkCost> {
  const [round, block, cheerGas] = await Promise.all([
    client.readContract({ address: CHAINLINK_ETH_USD, abi: feedAbi, functionName: "latestRoundData" }),
    client.getBlock(),
    client.estimateContractGas({ address: BOARD_ADDRESS, abi: boardAbi, functionName: "cheer" }),
  ]);

  const ethUsd = Number(round[1]) / 1e8;
  const feedAgeS = Number(block.timestamp - round[3]);
  const baseFeeWei = block.baseFeePerGas ?? 0n;
  const baseFeeGwei = Number(baseFeeWei) / 1e9;
  const cheerCostEth = Number(cheerGas * baseFeeWei) / 1e18;

  return {
    ethUsd,
    feedAgeS,
    stale: feedAgeS > MAX_FEED_AGE_S,
    baseFeeGwei,
    cheerGas,
    cheerCostUsd: cheerCostEth * ethUsd,
  };
}
