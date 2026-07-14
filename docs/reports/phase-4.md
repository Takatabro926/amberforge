# Phase 4 Report — Building / Ecosystem

**Date**: 2026-07-14 · **App**: [amberforge-board.vercel.app](https://amberforge-board.vercel.app)

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| Amberboard live and registered | ✅ live on Vercel; Base.dev entry created (app_id `6a568090862b3c002cbb65af`), domain-verification tag served; final metadata completion on user's side |
| Builder Codes active | ✅ **proven on-chain**: user cheer [`0x6c2c7640…62ec`](https://sepolia.basescan.org/tx/0x6c2c764092013db4ecda87df52a65abb9549a7dd664562c361693a55bd0d62ec) carries the ERC-8021 suffix |
| docs/ecosystem.md | ✅ |
| Amber Cubes (optional) | ✅ deployed + Cube #1 minted |

## What was built

- **Contracts** (verified, 5/5 tests): `AmberBoard` [`0x3723…0647`](https://sepolia.basescan.org/address/0x3723A33249C07CC5336aC778Da3fFab85a2d0647)
  (cheer tally + leaderboard with live AMBR balances), `AmberCubes` [`0xEa50…6aD9`](https://sepolia.basescan.org/address/0xEa501373F771eAaC2F6d93230815c2B389426aD9)
  (CUBE ERC-721, mint gated by ≥3 cheers, fully on-chain SVG metadata).
- **App**: Next.js 15 + wagmi + viem + coinbaseWallet/injected; reads leaderboard, writes
  cheer/mint with pinned `chainId` and per-call ERC-8021 `dataSuffix`; serves AmberMind's
  agent card at `/.well-known/agent-card.json`; `base:app_id` domain-verification meta tag.

## Key lessons

1. **The MiniKit/Farcaster-miniapp path is deprecated** — current Base flow is a standard
   web app + Base.dev metadata + Builder Code (no manifest).
2. **Silent config failures**: wagmi 2.19 ignores an unknown config-level `dataSuffix` —
   the first user cheer landed with bare calldata. Fixed per-call; verified by inspecting
   real transaction input, not the config. *Verify outcomes, not configuration.*
3. **Pin `chainId` on writes**: a wallet on another chain would send the tx to the same
   address on the wrong network (no contract there). UI now blocks + offers chain switch.
4. Deploy before domain verification (the meta tag must be live) — chicken-and-egg.

## Program wrap-up

All four phases executed on 2026-07-14 from `0x23dd…D08C` on Base Sepolia (+ Solana Devnet):
AMBR (raw ERC-20) and BALT (B20 native) launched; native bridge round-tripped both
directions; AmberMind registered (ERC-8004 #8095) and paying via x402; Amberboard live
with attributed transactions. Recommended next: Builder Rewards application
(builderscore.xyz), Base MCP sign-in, and an eventual mainnet path for Builder Grants.
