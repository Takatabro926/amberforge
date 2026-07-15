import { describe, expect, it } from "vitest";
import { base } from "wagmi/chains";
import { config } from "../config";

describe("wagmi config", () => {
  it("targets Base mainnet only", () => {
    expect(config.chains.map((c) => c.id)).toEqual([base.id]);
    expect(base.id).toBe(8453);
  });

  it("offers Coinbase Wallet and injected connectors", () => {
    const ids = config.connectors.map((c) => c.id);
    expect(ids).toContain("coinbaseWalletSDK");
    expect(ids).toContain("injected");
  });
});
