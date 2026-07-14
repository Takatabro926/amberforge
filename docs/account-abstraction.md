# Account Abstraction without Passkeys — Gasless & Pay-Gas-in-USDC

User constraint: no passkey flows. Both AA checklist items were completed with plain
EOA keys via **EIP-7702** and **ERC-4337 + Pimlico paymasters** on Base Sepolia.

## Demo 1 — Gasless (sponsored) via EIP-7702 ✅

The tester EOA (`0xF4e7…f1A6`) signed an EIP-7702 authorization delegating to the audited
`Simple7702Account` implementation (`0xe6Ca…555B`, eth-infinitism, EntryPoint v0.8) and sent
a **sponsored userOperation** calling `cheer()` on the Sepolia AmberBoard.

| Evidence | Value |
|----------|-------|
| Tx | [`0x781d198a…861d`](https://sepolia.basescan.org/tx/0x781d198ae33913c7e8ecbe9857f2718bdc408ecaf1f8a5f8964b6ffdd552861d) |
| EOA code after | `0xef0100e6cae8…555b` (7702 delegation designator — account is still an EOA) |
| ETH balance | **identical to the wei** before/after — Pimlico paid the gas |
| Effect | `cheers(EOA) = 1` on the board |

Script: `scripts/eip7702-gasless.mjs` (viem `toSimple7702SmartAccount` + permissionless).

## Demo 2 — Gas paid in USDC (ERC-20 paymaster) ✅

A counterfactual **SimpleAccount (EntryPoint v0.7)** owned by the same EOA was funded with
USDC only (**0 ETH, ever**). Its first userOperation deployed the account and called
`cheer()`, with gas charged in USDC by Pimlico's singleton paymaster
(`0x7777…834C`; approval auto-injected by `prepareUserOperationForErc20Paymaster`).

| Evidence | Value |
|----------|-------|
| Account | `0x8351c2D1212308D62F7465640e484930aB8B5679` (deployed by this very op) |
| Tx | [`0x3dee3f38…a288`](https://sepolia.basescan.org/tx/0x3dee3f382b60326f17bd78465e7b0ffdb282dd2892165253b74e1f96a731a288) |
| Gas bill | 5.000000 → 4.994394 USDC (**0.005606 USDC ≈ half a cent; ETH balance: 0 throughout**) |

Script: `scripts/erc20-gas-v07.mjs`.

## Finding: ERC-20 mode fails on EntryPoint v0.8/7702 (2026-07-14)

The identical flow on the 7702 account (EntryPoint **v0.8**) consistently fails with
`Paymaster postOp function reverted` — regardless of allowance (1→2 USDC), balance (2→12
USDC), entrypoint-matched `getTokenQuotes`, or the official
`prepareUserOperationForErc20Paymaster` helper. Sponsored mode works fine on v0.8.
Conclusion: use **v0.7 for ERC-20 gas** until Pimlico's singleton paymaster handles the
v0.8 path; worth reporting to Pimlico.

## Why this matters

- **Gasless**: apps can pay gas for users — no "first you need ETH" onboarding wall.
- **ERC-20 gas**: a wallet holding only USDC is fully functional — critical for
  payment-first products.
- Both achieved with a bare private key — no passkey, no biometrics, no vendor wallet.
