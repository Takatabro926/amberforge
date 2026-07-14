# Phase 1 Report — Tokens

**Date**: 2026-07-14 · **Network**: Base Sepolia (84532) · **Deployer**: `0x23ddAAd22d030b4a8d0BFbADeaCA11Ed9959D08C`

## Acceptance criteria — all met

| Criterion | Status |
|-----------|--------|
| AMBR verified contract | ✅ [`0x85bFC3Cd…8382`](https://sepolia.basescan.org/address/0x85bfc3cd262d8efda7d299babf446f054d938382) — BaseScan `Pass - Verified` + Sourcify |
| Test suite green | ✅ 9/9 (`forge test`), incl. fuzz + custom-error reverts |
| `docs/tokens.md` complete | ✅ raw deploy vs launchpads vs B20 |
| BALT launched or launch-ready | ✅ **launched on Sepolia**: [`0xb200…F1A6c5`](https://sepolia.basescan.org/address/0xb2000000000000000000001B288D711aC70Fa6c5) |

## What was built

1. **AMBR (raw ERC-20)** — OpenZeppelin `ERC20 + ERC20Burnable`, fixed 1,000,000 supply,
   deployed with `forge create` via encrypted keystore, verified, then exercised end-to-end:
   transfer → approve → transferFrom (second wallet) → burn. Supply now 999,000.
2. **Launchpad survey** — Flaunch / Clawnch / Bankr (+ Zora, Clanker) documented with
   fee, liquidity, and ownership trade-offs. No deployment (by design).
3. **BALT (B20 Asset variant)** — created through the `0xB20f…` factory precompile with
   manually encoded `params` + `initCalls` (grant `MINT_ROLE`, cap 1,000,000), then minted
   250,000. Address is deterministic with the `0xb20…` prefix. No bytecode, no verification
   needed — the implementation is the node itself.

## Key lessons

- Etherscan V1 per-chain API endpoints are dead; Foundry's default **Etherscan V2** verifier
  (`chain = <id>` + one `ETHERSCAN_API_KEY`) is the working path.
- Public RPC (`sepolia.base.org`) can lag on `getTransactionCount` → `nonce too low` on rapid
  sequential sends; fetch nonce once and pass `--nonce` explicitly.
- `approve`/`transferFrom` is a delegation of spending, not a transfer; allowance decrements on use.
- B20's `initCalls` run inside a bootstrap window that bypasses role gates (but never
  `MINT_RECEIVER_POLICY`, pause, or supply invariants) — atomic token setup in one tx.
- Blockscout verification lags (submitted via API v2; expected to auto-import from Sourcify) — open item.

## Costs

Testnet-only. Deployer Sepolia balance ~0.49 ETH before, ~0.486 ETH after (8 txs incl. tester funding).
