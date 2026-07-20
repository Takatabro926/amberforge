// Live integration test against Base mainnet — opt-in only (RUN_LIVE=1 npx vitest run).
// Skipped in CI: public RPC is rate-limited and state drifts.
import { describe, expect, it } from "vitest";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { fetchEmbrMarket } from "../embr";

describe.runIf(process.env.RUN_LIVE === "1")("fetchEmbrMarket (live)", () => {
  it("reads real price/market-cap/supply/revenue for the deployed EMBR coin", async () => {
    const client = createPublicClient({ chain: base, transport: http() });
    const market = await fetchEmbrMarket(client);
    expect(market.priceUsd).toBeGreaterThan(0);
    expect(market.marketCapUsd).toBeGreaterThan(0);
    expect(market.totalSupply).toBeGreaterThan(0);
    expect(market.unclaimedCreatorRevenueEth).toBeGreaterThanOrEqual(0);
    console.log(market);
  }, 60_000);
});
