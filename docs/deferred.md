# Deferred — features gated on Base Account (passkey)

User decision (2026-07-14): no passkey/biometric-associated auth flows. Everything below
requires a **Base Account** (Coinbase smart wallet, passkey-secured by design) and is
therefore parked for a possible final phase — not skipped by accident.

| Feature | Why it needs Base Account | DIY substitute we shipped instead |
|---------|---------------------------|-----------------------------------|
| Base MCP sign-in + wallet tool demos | MCP authenticates against a Base Account (passkey) | direct `cast`/viem calls with the EOA keystore |
| Sign in with Base (SIWB) | Base Account is the identity being signed in | n/a (no login surface needed) |
| Base Pay | payment API executes from a Base Account | x402 EIP-3009 payment (`agents/ambermind/pay-report.mjs`) |
| Sub Accounts | child accounts of a Base Account | second EOA (helper wallet) where separation was needed |
| Spend Permissions / recurring subscriptions | onchain budgets enforced by Base Account contracts | policy checks inside the agent (`autonomous.mjs`) — softer guarantee |
| Native paymaster sponsorship (CDP) | tied to Base Account + CDP onboarding | EIP-7702 + Pimlico sponsorship and ERC-20 (USDC) gas on EPv0.7 — see `docs/account-abstraction.md` |

## Explicitly NOT deferred

- **MiniKit / Farcaster miniapp** — not blocked by passkeys; the path itself is deprecated
  in current Base docs. Amberboard shipped as a standard web app registered on base.dev.
- **Gasless UX and pay-gas-in-USDC** — both achieved without Base Account
  (`docs/account-abstraction.md`).

Resume point if the decision ever changes: `/mcp` → base-mcp → Authenticate, then the
wallet tool demos; afterwards revisit the Base Account bundle row by row.
