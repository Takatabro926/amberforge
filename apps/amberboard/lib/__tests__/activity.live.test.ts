// Live integration test against Base mainnet — opt-in only (RUN_LIVE=1 npx vitest run).
// Skipped in CI: public RPC is rate-limited and state drifts.
import { describe, expect, it } from "vitest";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { fetchRecentActivity } from "../activity";

describe.runIf(process.env.RUN_LIVE === "1")("fetchRecentActivity (live)", () => {
  it("returns real cheer/mint history, newest first, with timestamps", async () => {
    const client = createPublicClient({ chain: base, transport: http() });
    const items = await fetchRecentActivity(client);
    expect(items.length).toBeGreaterThanOrEqual(10); // 10 cheers + 2 cube mints as of 2026-07-15
    expect(items[0].timestamp).toBeDefined();
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].blockNumber >= items[i].blockNumber).toBe(true);
    }
    console.log(
      items.map((i) => `${i.kind} ${i.detail} @ ${i.blockNumber} by ${i.who.slice(0, 8)}`),
    );
  }, 60_000);
});
