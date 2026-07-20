import { describe, expect, it, vi } from "vitest";
import type { PublicClient } from "viem";

const coinPriceInUSD = vi.fn();
const coinMarketCapInUSD = vi.fn();
const getCoinInfo = vi.fn();
const creatorRevenue = vi.fn();

vi.mock("@flaunch/sdk", () => ({
  createFlaunch: () => ({ coinPriceInUSD, coinMarketCapInUSD, getCoinInfo, creatorRevenue }),
}));

const { EMBR_ADDRESS, EMBR_CREATOR, fetchEmbrMarket } = await import("../embr");

describe("fetchEmbrMarket", () => {
  it("queries price/mcap/supply/revenue for EMBR's own address and creator", async () => {
    coinPriceInUSD.mockResolvedValue("0.0000123");
    coinMarketCapInUSD.mockResolvedValue("12300");
    getCoinInfo.mockResolvedValue({ totalSupply: 1_000_000_000n, decimals: 18, formattedTotalSupplyInDecimals: 1_000_000_000 });
    creatorRevenue.mockResolvedValue(0n);

    await fetchEmbrMarket({} as PublicClient);

    expect(coinPriceInUSD).toHaveBeenCalledWith({ coinAddress: EMBR_ADDRESS });
    expect(coinMarketCapInUSD).toHaveBeenCalledWith({ coinAddress: EMBR_ADDRESS });
    expect(getCoinInfo).toHaveBeenCalledWith(EMBR_ADDRESS);
    expect(creatorRevenue).toHaveBeenCalledWith(EMBR_CREATOR);
  });

  it("converts the SDK's string price/mcap to numbers and wei revenue to ETH", async () => {
    coinPriceInUSD.mockResolvedValue("0.0000123");
    coinMarketCapInUSD.mockResolvedValue("12300.5");
    getCoinInfo.mockResolvedValue({ totalSupply: 1_000_000_000n, decimals: 18, formattedTotalSupplyInDecimals: 1_000_000_000 });
    creatorRevenue.mockResolvedValue(500_000_000_000_000_000n); // 0.5 ETH

    const market = await fetchEmbrMarket({} as PublicClient);

    expect(market.priceUsd).toBeCloseTo(0.0000123, 10);
    expect(market.marketCapUsd).toBeCloseTo(12300.5, 5);
    expect(market.totalSupply).toBe(1_000_000_000);
    expect(market.unclaimedCreatorRevenueEth).toBe(0.5);
  });
});
