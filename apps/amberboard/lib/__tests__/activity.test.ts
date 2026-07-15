import { describe, expect, it } from "vitest";
import {
  BOARD_DEPLOY_BLOCK,
  LOG_CHUNK,
  chunkWindows,
  newestFirst,
  timeAgo,
  type ActivityItem,
} from "../activity";

describe("chunkWindows", () => {
  it("walks newest-first and never crosses the floor", () => {
    const windows = chunkWindows(1050n, 1000n, 20n);
    expect(windows).toEqual([
      [1031n, 1050n],
      [1011n, 1030n],
      [1000n, 1010n],
    ]);
  });

  it("emits a single window when the range fits in one chunk", () => {
    expect(chunkWindows(1005n, 1000n, 20n)).toEqual([[1000n, 1005n]]);
  });

  it("handles latest === floor", () => {
    expect(chunkWindows(1000n, 1000n, 20n)).toEqual([[1000n, 1000n]]);
  });

  it("every window respects the public RPC 10k-block cap", () => {
    const windows = chunkWindows(BOARD_DEPLOY_BLOCK + 123_456n, BOARD_DEPLOY_BLOCK);
    for (const [from, to] of windows) {
      expect(to - from + 1n <= LOG_CHUNK).toBe(true);
      expect(from >= BOARD_DEPLOY_BLOCK).toBe(true);
    }
    // contiguous, no gaps or overlaps
    for (let i = 1; i < windows.length; i++) {
      expect(windows[i][1]).toBe(windows[i - 1][0] - 1n);
    }
  });
});

describe("newestFirst", () => {
  const item = (blockNumber: bigint, logIndex: number): ActivityItem => ({
    kind: "cheer",
    who: "0x0000000000000000000000000000000000000001",
    detail: "",
    blockNumber,
    logIndex,
    txHash: "0x00",
  });

  it("sorts by block descending, then log index descending", () => {
    const sorted = [item(5n, 0), item(7n, 1), item(7n, 3), item(6n, 0)].sort(newestFirst);
    expect(sorted.map((i) => [i.blockNumber, i.logIndex])).toEqual([
      [7n, 3],
      [7n, 1],
      [6n, 0],
      [5n, 0],
    ]);
  });
});

describe("timeAgo", () => {
  const now = 1_800_000_000_000; // ms
  it("formats seconds, minutes, hours, days", () => {
    expect(timeAgo(BigInt(now / 1000 - 5), now)).toBe("5s ago");
    expect(timeAgo(BigInt(now / 1000 - 300), now)).toBe("5m ago");
    expect(timeAgo(BigInt(now / 1000 - 7200), now)).toBe("2h ago");
    expect(timeAgo(BigInt(now / 1000 - 200_000), now)).toBe("2d ago");
  });
  it("is empty without a timestamp and never negative", () => {
    expect(timeAgo(undefined, now)).toBe("");
    expect(timeAgo(BigInt(now / 1000 + 60), now)).toBe("0s ago");
  });
});
