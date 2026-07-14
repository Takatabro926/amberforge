# Amberforge

A four-phase learning-by-building program on Base (Ethereum L2). One umbrella
project covering token creation, the native Base–Solana bridge, the Base AI
agent stack, and the builder/ecosystem path.

## Structure

| Path | Contents |
|------|----------|
| `contracts/` | Foundry project (Solidity contracts + tests) |
| `apps/` | Frontend / Mini App (Amberboard) |
| `agents/` | AI agent configs (AmberMind) |
| `docs/` | English documentation, `JOURNAL.md`, phase reports |

## Phases

1. **Tokens** — AMBR (ERC-20 from scratch), launchpad comparison, BALT (B20 native standard)
2. **Native Base–Solana bridge** — minimal bridged transfer, both directions if feasible
3. **AI agents** — Base MCP, x402 micropayment, AmberMind onchain agent
4. **Building / ecosystem** — Amberboard Mini App, Builder Codes, Amber Cubes NFT, ecosystem map

## Networks

| Network | Chain ID | RPC | Explorer |
|---------|----------|-----|----------|
| Base Sepolia (default) | 84532 | https://sepolia.base.org | https://sepolia.basescan.org |
| Base Mainnet (on explicit confirmation only) | 8453 | https://mainnet.base.org | https://basescan.org |

## Safety

- Testnet first; mainnet only after explicit confirmation.
- Keys live in Foundry encrypted keystores or a git-ignored `.env` — never in the repo.
