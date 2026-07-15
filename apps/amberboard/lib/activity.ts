import { parseAbiItem, zeroAddress, type Address, type PublicClient } from "viem";

import { BOARD_ADDRESS, CUBES_ADDRESS } from "./contracts";

export const BOARD_DEPLOY_BLOCK = 48_635_706n;
// mainnet.base.org rejects eth_getLogs spanning more than 10,000 blocks.
export const LOG_CHUNK = 10_000n;

export const cheeredEvent = parseAbiItem(
  "event Cheered(address indexed who, uint256 count, uint256 totalCheers)",
);
export const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
);

export type ActivityItem = {
  kind: "cheer" | "mint";
  who: Address;
  detail: string;
  blockNumber: bigint;
  logIndex: number;
  txHash: `0x${string}`;
  timestamp?: bigint;
};

/** Newest-first [from, to] windows of at most LOG_CHUNK blocks, never below `floor`. */
export function chunkWindows(
  latest: bigint,
  floor: bigint,
  chunk: bigint = LOG_CHUNK,
): Array<[bigint, bigint]> {
  const windows: Array<[bigint, bigint]> = [];
  let to = latest;
  while (to >= floor) {
    const from = to - chunk + 1n > floor ? to - chunk + 1n : floor;
    windows.push([from, to]);
    if (from === floor) break;
    to = from - 1n;
  }
  return windows;
}

export function newestFirst(a: ActivityItem, b: ActivityItem): number {
  if (a.blockNumber !== b.blockNumber) return a.blockNumber > b.blockNumber ? -1 : 1;
  return b.logIndex - a.logIndex;
}

export async function fetchRecentActivity(
  client: PublicClient,
  { maxItems = 12, maxChunks = 30 } = {},
): Promise<ActivityItem[]> {
  const latest = await client.getBlockNumber();
  const windows = chunkWindows(latest, BOARD_DEPLOY_BLOCK).slice(0, maxChunks);

  const items: ActivityItem[] = [];
  for (const [fromBlock, toBlock] of windows) {
    const [cheers, mints] = await Promise.all([
      client.getLogs({ address: BOARD_ADDRESS, event: cheeredEvent, fromBlock, toBlock }),
      client.getLogs({
        address: CUBES_ADDRESS,
        event: transferEvent,
        args: { from: zeroAddress },
        fromBlock,
        toBlock,
      }),
    ]);
    for (const log of cheers) {
      items.push({
        kind: "cheer",
        who: log.args.who!,
        detail: `cheer #${log.args.totalCheers}`,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
        txHash: log.transactionHash,
      });
    }
    for (const log of mints) {
      items.push({
        kind: "mint",
        who: log.args.to!,
        detail: `Cube #${log.args.tokenId}`,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
        txHash: log.transactionHash,
      });
    }
    if (items.length >= maxItems) break;
  }

  items.sort(newestFirst);
  const recent = items.slice(0, maxItems);

  const blocks = [...new Set(recent.map((i) => i.blockNumber))];
  const timestamps = new Map(
    await Promise.all(
      blocks.map(
        async (n) =>
          [n, (await client.getBlock({ blockNumber: n })).timestamp] as [bigint, bigint],
      ),
    ),
  );
  return recent.map((i) => ({ ...i, timestamp: timestamps.get(i.blockNumber) }));
}

export function timeAgo(timestamp: bigint | undefined, nowMs = Date.now()): string {
  if (timestamp === undefined) return "";
  const s = Math.max(0, Math.floor(nowMs / 1000) - Number(timestamp));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
