# Phase 2 Report — Native Base ↔ Solana Bridge

**Date**: 2026-07-14 · **Env**: `testnet-prod` (Base Sepolia 84532 ↔ Solana Devnet)
**Wallets**: Base `0x23ddAAd22d030b4a8d0BFbADeaCA11Ed9959D08C`, Solana `CcBvQTP5PSeqG9gtajJDbAT198edpL1cL4G9yNCJMCyd`

## Acceptance criteria — met and exceeded

| Criterion | Status |
|-----------|--------|
| ≥1 successful bridged transfer with proof links | ✅ **both directions** completed |
| `docs/bridge.md` | ✅ architecture, all 4 proof links, lessons |

## Transfers

1. **Solana → Base, 0.01 SOL** (~2 min): lock + relay payment on Devnet
   ([`5bFiL6q2…`](https://explorer.solana.com/tx/5bFiL6q2D8rNo3xqPcBZ8LVxBSUV7c2UZ7b86uHDXZFEiVrR924wrKewYtYEBrLvL8uktT9CjGapD9csy1UeD4m?cluster=devnet))
   → auto-relayed wSOL mint on Sepolia
   ([`0xb4d83583…`](https://sepolia.basescan.org/tx/0xb4d83583b9ec8fb924f99919b72ae7bcdc3a7b8c7dd3a8d19c7324dc1f347f5b)).
2. **Base → Solana, 0.005 SOL** (~40 min incl. root wait): manual `bridgeToken` burn
   ([`0xb424a044…`](https://sepolia.basescan.org/tx/0xb424a044f62e64d4d7f91b788ce1b8e5f1da8d7477b9989934f205fb2347a95e))
   → Merkle proof ([`4iQUjcBk…`](https://explorer.solana.com/tx/4iQUjcBkLgvvtAk4ynV9AFzexXLULEq4ty7VGbx42qpPSPEXgAuBJLUTEguqq3PyzZ2RD5mrMwq6VxHeAWLtujmu?cluster=devnet))
   → finalize, vault release ([`rhMNSDFZ…`](https://explorer.solana.com/tx/rhMNSDFZsSqwoCYMF8gP26iWp1atThkMiAmSFt4MwAGAdgrLjNTAnPbUCCH1WAgKZvwfieAQxBsbyGi8QUgKsCa?cluster=devnet)).

## Key lessons

- Asymmetric trust: Solana→Base relies on the validator oracle; Base→Solana is proof-based
  (anyone can prove inclusion — we did, from the CLI).
- Devnet root posting is bursty (was ~734k Base blocks stale, caught up 35 min later) —
  don't extrapolate testnet latency to the mainnet ~15 min SLA, in either direction.
- The repo's example script scales amounts `/1e9` (ETH 18→9 decimals); wSOL is already
  9-decimals and bridges 1:1 — reading `TokenLib.initializeTransfer` beats trusting examples.
- Never attach a call you can't guarantee executes on Base — such messages are unrecoverable.
  Pure transfers avoid the whole class.

## Tooling

Official [base/bridge](https://github.com/base/bridge) repo (user-approved), bun 1.3.14,
`bridge-sol` / `prove-message --skip-relay` / `relay-message` CLI; Base-side burn done
manually with `cast send` against `Bridge.bridgeToken` after a `eth_call` dry-run.
