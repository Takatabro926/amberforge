# Native Base ↔ Solana Bridge — Phase 2

First-party bridge by Base (docs: [base-solana-bridge](https://docs.base.org/base-chain/network-information/base-solana-bridge),
repo: [base/bridge](https://github.com/base/bridge)). Environment used: `testnet-prod` =
**Base Sepolia (84532) ↔ Solana Devnet**.

## Architecture in one page

Two asymmetric directions:

- **Solana → Base (pull-based, fast)**: SOL is **locked** in a program vault on Solana, an
  `OutgoingMessage` account is created; bridge validators (oracle) approve messages
  (~every 300 finalized blocks) and wrapped **ERC20 SOL is minted** on Base. With
  `payForRelay` the execution on Base happens automatically — one user transaction total.
- **Base → Solana (proof-based, slower, trust-minimized)**: wrapped SOL is **burned** on Base;
  validators post a **Merkle root** of outgoing Base messages to Solana; the user (anyone)
  generates a Merkle **proof** that the burn is included and executes prove + finalize on
  Solana; the vault releases native SOL. No trusted relayer needed for this direction.
- Every Solana wallet gets a deterministic **Twin contract** on Base that can execute
  arbitrary calls on its behalf (cross-chain calls, not used here).

**Key addresses** (testnet): Bridge on Base Sepolia `0x01824a90d32A69022DdAEcC6C5C14Ed08dB4EB9B`,
wrapped SOL (CrossChainERC20, 9 decimals) `0xCace0c896714DaF7098FFD8CC54aFCFe0338b4BC`,
Bridge program on Solana Devnet `7c6mteAcTXaQ1MFBCrnuzoZVTTAEfZwa6wgy4bqX3KXC`.

**Risks vs third-party bridges** (Stargate/Hyperlane/LI.FI): no external validator set or
pooled liquidity (lock/mint, not swap); first-party oracle is the trust anchor for
Solana→Base; for Base→Solana the proof is trustless. Sharpest edge from the docs: a bridge
message carrying a **non-executable call cannot be undone** — tokens bundled with it are
permanently locked. We bridged pure transfers (no calls) to avoid this class of risk entirely.

## Executed transfers

Wallets: Base `0x23ddAAd22d030b4a8d0BFbADeaCA11Ed9959D08C` (deployer keystore),
Solana Devnet `CcBvQTP5PSeqG9gtajJDbAT198edpL1cL4G9yNCJMCyd` (local keypair, funded via faucet).

### Leg 1 — Solana → Base: 0.01 SOL ✅

| Step | Proof |
|------|-------|
| Lock 0.01 SOL + pay relay (Solana Devnet) | [`5bFiL6q2…UeD4m`](https://explorer.solana.com/tx/5bFiL6q2D8rNo3xqPcBZ8LVxBSUV7c2UZ7b86uHDXZFEiVrR924wrKewYtYEBrLvL8uktT9CjGapD9csy1UeD4m?cluster=devnet) |
| Auto-relay mint of 0.01 wSOL on Base Sepolia | [`0xb4d83583…7f5b`](https://sepolia.basescan.org/tx/0xb4d83583b9ec8fb924f99919b72ae7bcdc3a7b8c7dd3a8d19c7324dc1f347f5b) |
| Result | `balanceOf(deployer)` = 10,000,000 (0.01 SOL, 9 decimals) |

Command: `bun cli sol bridge bridge-sol --deploy-env testnet-prod --to 0x23dd… --amount 0.01 --payer-kp config --pay-for-relay`.
End-to-end latency: ~2 minutes.

### Leg 2 — Base → Solana: 0.005 SOL ✅

| Step | Proof |
|------|-------|
| Burn 0.005 wSOL via `Bridge.bridgeToken` (no attached call) | [`0xb424a044…a95e`](https://sepolia.basescan.org/tx/0xb424a044f62e64d4d7f91b788ce1b8e5f1da8d7477b9989934f205fb2347a95e) (block 44,140,602) |
| Merkle root caught up on Solana | ~35 min after burn (root had been stale since block 43,406,400 — devnet posts are infrequent between bursts) |
| `prove-message` (Merkle proof submitted, nonce 244) | [`4iQUjcBk…ujmu`](https://explorer.solana.com/tx/4iQUjcBkLgvvtAk4ynV9AFzexXLULEq4ty7VGbx42qpPSPEXgAuBJLUTEguqq3PyzZ2RD5mrMwq6VxHeAWLtujmu?cluster=devnet) |
| `relay-message` (vault released 5,000,000 lamports) | [`rhMNSDFZ…KsCa`](https://explorer.solana.com/tx/rhMNSDFZsSqwoCYMF8gP26iWp1atThkMiAmSFt4MwAGAdgrLjNTAnPbUCCH1WAgKZvwfieAQxBsbyGi8QUgKsCa?cluster=devnet) |
| Result | 0.005 SOL back in `CcBvQTP5…MCyd`; **round trip complete in both directions** |

Call used (manual, keystore-signed): `bridgeToken((wSOL, bytes32(0), <solana pubkey as bytes32>, 5_000_000), [])` —
for CrossChainERC20 tokens `localAmount == remoteAmount` (both 9 decimals, no scaling; the
`/1e9` in the repo's example script is ETH's 18→9 decimals scaling, not applicable to wSOL).

## Mainnet round trip (2026-07-14) ✅

Env `mainnet`: Base Mainnet ↔ Solana Mainnet. Asset bridged: **ETH** (18 dec) ↔ wETH SPL
(Token-2022, 9 dec, mint `2ZCFyWM6…9LMX`). User wallets: Solana `73cRUf…MCyd`→ wait, see below —
Solana `73cRUfZGovk2gPmQ2pzgS52jAwDVYFQQwT9PrquxvmUi` (ATA `3KMVk4…Zd4m`), Base return address
`0x1b665eee71FEE4D68296182cCb0DA03Ba1C4D57e`.

| Step | Proof |
|------|-------|
| Create ATA (Token-2022) | [`38zDuMGe…Q9Se`](https://explorer.solana.com/tx/38zDuMGehuqrHzTE7oP59v5LmidVLiZCTUXwNwGK5ZwZpagtBdG1Sg9mfWV2Lp8xWYEHebnFZaB24o6ErDksQ9Se) |
| Lock 0.0005 ETH on Base (`bridgeToken`, ETH sentinel, `remoteAmount 500000` ⇒ scalar 1e9 checked by dry-run) | [`0x1233619e…0179`](https://basescan.org/tx/0x1233619e9a794e4b51deddde7e53bbd78b9528ef5e089b18ca06b55fe6f60179) |
| Root wait | **~70 min** (mainnet oracle also bursty — the "15 min" SLA is best-case) |
| `prove-message` (Merkle proof, user-paid) | [`3dKYAsN2…Po7v`](https://explorer.solana.com/tx/3dKYAsN26jKc1nAVoqTA248sfaRQir5F3gkAUjWQivLFVm7ydt8otHGeM7veYmaiu2CNAHeRf217KV2XvA1nPo7v) |
| `relay-message` → 0.0005 wETH minted to ATA | [`2j4p9TMy…sodn`](https://explorer.solana.com/tx/2j4p9TMyqtHW5cMzCtdvYKVnYSfD4yHe3Zd6vHnHMFW3bDbrCq4pdyUqsaLkj9ga8Qzbx6DXN2gi8UgBgDcsodn) |
| Return: burn 0.00025 wETH + pay-for-relay (user-signed) | [`2nMBLHig…Fgpw`](https://explorer.solana.com/tx/2nMBLHig4NiZed2KEfeUAA7NbDDQXJ5CY3TfXkkqnC1FR6KXHhvJ6C9dRZL7R5r9SujmEe7yr8pmTyW1TE2TFgpw) |
| Auto-relay on Base → **native 0.00025 ETH delivered** to `0x1b66…D57e` (gasless for recipient) | balance confirmed on-chain |

End state: 0.00025 wETH remains on Solana, 0.00025 ETH delivered on Base, ~0.0108 SOL left
after all fees. Round trip: Base→Solana ~75 min (root-bound), Solana→Base ~2 min.

## Lessons

- **Mainnet ≠ testnet SLAs**: docs promise ~15 min root posting; the devnet oracle lags by days.
  The burn is safe and provable whenever the root catches up (proof-based custody model).
- The recipient pubkey travels as `bytes32` (Solana pubkey re-encoded), converted with
  `pubkey-to-bytes32`.
- `prove-message` CLI: use `--skip-relay` for non-interactive runs, then `relay-message` with
  the printed message hash.
- Amounts: `bridge-sol` takes SOL units (min 0.001); `bridgeToken` takes raw `remoteAmount`.
