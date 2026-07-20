import { describe, expect, it } from "vitest";
import { rarityBadge, rarityTier } from "../rarity";

describe("rarityTier", () => {
  it("gives the leader gold regardless of absolute count", () => {
    expect(rarityTier(1, 1)).toBe("gold");
    expect(rarityTier(500, 500)).toBe("gold");
  });

  it("buckets by ratio-to-leader, not rank index", () => {
    expect(rarityTier(75, 100)).toBe("gold"); // exactly at the 0.75 boundary
    expect(rarityTier(74, 100)).toBe("silver");
    expect(rarityTier(40, 100)).toBe("silver"); // exactly at the 0.4 boundary
    expect(rarityTier(39, 100)).toBe("bronze");
    expect(rarityTier(1, 100)).toBe("bronze");
  });

  it("gives no tier for zero cheers or a boardless leader", () => {
    expect(rarityTier(0, 100)).toBeNull();
    expect(rarityTier(5, 0)).toBeNull();
  });

  it("ties land in the same tier regardless of who's compared first", () => {
    expect(rarityTier(50, 100)).toBe(rarityTier(50, 100));
    expect(rarityTier(9, 9)).toBe("gold");
    expect(rarityTier(3, 9)).toBe(rarityTier(3, 9));
  });
});

describe("rarityBadge", () => {
  it("renders an emoji for a tiered score and an empty string otherwise", () => {
    expect(rarityBadge(100, 100)).toBe("🥇");
    expect(rarityBadge(50, 100)).toBe("🥈");
    expect(rarityBadge(10, 100)).toBe("🥉");
    expect(rarityBadge(0, 100)).toBe("");
  });
});
