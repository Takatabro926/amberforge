import { describe, expect, it } from "vitest";
import type { PublicClient } from "viem";

import { CHAINLINK_ETH_USD, fetchNetworkCost, MAX_FEED_AGE_S } from "../prices";

function fakeClient(overrides: {
  answer: bigint;
  updatedAt: bigint;
  blockTimestamp: bigint;
  baseFeePerGas: bigint | undefined;
  cheerGas: bigint;
}): PublicClient {
  return {
    readContract: async ({ address }: { address: string }) => {
      if (address !== CHAINLINK_ETH_USD) throw new Error(`unexpected address ${address}`);
      return [0n, overrides.answer, 0n, overrides.updatedAt, 0n];
    },
    getBlock: async () => ({ timestamp: overrides.blockTimestamp, baseFeePerGas: overrides.baseFeePerGas }),
    estimateContractGas: async () => overrides.cheerGas,
  } as unknown as PublicClient;
}

describe("fetchNetworkCost", () => {
  it("converts the feed's 8-decimal answer to a USD float", async () => {
    const client = fakeClient({
      answer: 3_200_00000000n, // $3,200.00000000
      updatedAt: 1000n,
      blockTimestamp: 1000n,
      baseFeePerGas: 1_000_000_000n, // 1 gwei
      cheerGas: 100_000n,
    });
    const result = await fetchNetworkCost(client);
    expect(result.ethUsd).toBe(3200);
  });

  it("flags the feed stale once its age exceeds MAX_FEED_AGE_S, not before", async () => {
    const fresh = await fetchNetworkCost(
      fakeClient({
        answer: 3_000_00000000n,
        updatedAt: 1000n,
        blockTimestamp: 1000n + BigInt(MAX_FEED_AGE_S),
        baseFeePerGas: 1n,
        cheerGas: 1n,
      }),
    );
    expect(fresh.feedAgeS).toBe(MAX_FEED_AGE_S);
    expect(fresh.stale).toBe(false);

    const stale = await fetchNetworkCost(
      fakeClient({
        answer: 3_000_00000000n,
        updatedAt: 1000n,
        blockTimestamp: 1000n + BigInt(MAX_FEED_AGE_S) + 1n,
        baseFeePerGas: 1n,
        cheerGas: 1n,
      }),
    );
    expect(stale.feedAgeS).toBe(MAX_FEED_AGE_S + 1);
    expect(stale.stale).toBe(true);
  });

  it("prices a cheer as gas * baseFee * ethUsd, in dollars", async () => {
    const client = fakeClient({
      answer: 2_000_00000000n, // $2,000
      updatedAt: 0n,
      blockTimestamp: 0n,
      baseFeePerGas: 1_000_000_000n, // 1 gwei
      cheerGas: 100_000n, // 100k gas
    });
    // cost = 100_000 * 1e9 wei = 1e14 wei = 0.0001 ETH -> $0.20 at $2,000/ETH
    const result = await fetchNetworkCost(client);
    expect(result.cheerCostUsd).toBeCloseTo(0.2, 10);
  });

  it("treats a missing baseFeePerGas as zero cost rather than throwing", async () => {
    const client = fakeClient({
      answer: 2_000_00000000n,
      updatedAt: 0n,
      blockTimestamp: 0n,
      baseFeePerGas: undefined,
      cheerGas: 100_000n,
    });
    const result = await fetchNetworkCost(client);
    expect(result.cheerCostUsd).toBe(0);
    expect(result.baseFeeGwei).toBe(0);
  });
});
