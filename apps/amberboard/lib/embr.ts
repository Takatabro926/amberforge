import { createFlaunch } from "@flaunch/sdk";
import { formatEther } from "viem";
import type { PublicClient } from "viem";

// EMBR launched via Flaunch on Base mainnet (scripts/flaunch-embr.mjs),
// creator = the amberforge deployer wallet.
export const EMBR_ADDRESS = "0xD934dB69495724D5A642B256B76fF7Bc24902Fb3" as const;
export const EMBR_CREATOR = "0x23ddAAd22d030b4a8d0BFbADeaCA11Ed9959D08C" as const;

export type EmbrMarket = {
  priceUsd: number;
  marketCapUsd: number;
  totalSupply: number;
  unclaimedCreatorRevenueEth: number;
};

/** Live price/market-cap/unclaimed-revenue read for EMBR, replacing the
 *  one-off "revenue=0" check from the 2026-07-17 journal entry with a
 *  persistent display anyone can watch update. */
export async function fetchEmbrMarket(publicClient: PublicClient): Promise<EmbrMarket> {
  const flaunch = createFlaunch({ publicClient });

  const [priceUsd, marketCapUsd, coinInfo, revenueWei] = await Promise.all([
    flaunch.coinPriceInUSD({ coinAddress: EMBR_ADDRESS }),
    flaunch.coinMarketCapInUSD({ coinAddress: EMBR_ADDRESS }),
    flaunch.getCoinInfo(EMBR_ADDRESS),
    flaunch.creatorRevenue(EMBR_CREATOR),
  ]);

  return {
    priceUsd: Number(priceUsd),
    marketCapUsd: Number(marketCapUsd),
    totalSupply: coinInfo.formattedTotalSupplyInDecimals,
    unclaimedCreatorRevenueEth: Number(formatEther(revenueWei)),
  };
}
