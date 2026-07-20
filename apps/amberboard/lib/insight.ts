import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

import { AMBERMIND_AGENT_ID, BOARD_ADDRESS, CUBES_ADDRESS, boardAbi, cubesAbi } from "./contracts";

const client = createPublicClient({ chain: base, transport: http() });

export type Insight = {
  agentId: string;
  network: "base";
  board: string;
  totalCheers: string;
  participantCount: string;
  cubesMinted: string;
  topCheerer: { address: `0x${string}`; cheers: string } | null;
  generatedAt: string;
};

/** What AmberMind sells: a computed read of its own on-chain board, priced
 *  because the leaderboard() multicall plus a client-side max-scan is more
 *  than a casual free-tier RPC call — same "pay for the aggregation, not the
 *  raw read" shape as TrailKeeper's /report, built independently here. */
export async function computeInsight(): Promise<Insight> {
  const [[addrs, counts], totalCheers, nextId] = await Promise.all([
    client.readContract({ address: BOARD_ADDRESS, abi: boardAbi, functionName: "leaderboard" }),
    client.readContract({ address: BOARD_ADDRESS, abi: boardAbi, functionName: "totalCheers" }),
    client.readContract({ address: CUBES_ADDRESS, abi: cubesAbi, functionName: "nextId" }),
  ]);
  const participantCount = BigInt(addrs.length);

  let topCheerer: Insight["topCheerer"] = null;
  for (let i = 0; i < addrs.length; i++) {
    if (!topCheerer || counts[i] > BigInt(topCheerer.cheers)) {
      topCheerer = { address: addrs[i], cheers: counts[i].toString() };
    }
  }

  return {
    agentId: AMBERMIND_AGENT_ID.toString(),
    network: "base",
    board: BOARD_ADDRESS,
    totalCheers: totalCheers.toString(),
    participantCount: participantCount.toString(),
    cubesMinted: (nextId - 1n).toString(),
    topCheerer,
    generatedAt: new Date().toISOString(),
  };
}
