// Client-side only — AmberCubes' on-chain SVG (tokenURI) is immutable once
// deployed, so a tiered look for the *already-live* contract has to live
// here instead of in Solidity. Ratio-to-leader rather than rank-index, so
// ties land in the same tier regardless of array order and the scale stays
// meaningful as the board grows.
export type RarityTier = "gold" | "silver" | "bronze" | null;

export const RARITY_BADGE: Record<Exclude<RarityTier, null>, string> = {
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
};

export function rarityTier(cheers: number, leaderCheers: number): RarityTier {
  if (cheers <= 0 || leaderCheers <= 0) return null;
  const ratio = cheers / leaderCheers;
  if (ratio >= 0.75) return "gold";
  if (ratio >= 0.4) return "silver";
  return "bronze";
}

export function rarityBadge(cheers: number, leaderCheers: number): string {
  const tier = rarityTier(cheers, leaderCheers);
  return tier ? RARITY_BADGE[tier] : "";
}
