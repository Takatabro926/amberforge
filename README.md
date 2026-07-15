# Amberforge

[![CI](https://github.com/Takatabro926/amberforge/actions/workflows/ci.yml/badge.svg)](https://github.com/Takatabro926/amberforge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)

A four-phase learning-by-building program on Base (Ethereum L2), executed end to end on
**Base Sepolia and then Base Mainnet**. One umbrella project covering token creation, the
native Base–Solana bridge, the Base AI agent stack, and the builder/ecosystem path.
Every on-chain action is logged with its tx hash in [`docs/JOURNAL.md`](docs/JOURNAL.md).

**Live app**: [amberforge-board.vercel.app](https://amberforge-board.vercel.app)

## Structure

| Path | Contents |
|------|----------|
| `contracts/` | Foundry project (Solidity contracts + tests) |
| `apps/` | Frontend / web app (Amberboard) |
| `agents/` | AI agent code (AmberMind: x402 client, attributed txs, autonomous sentinel) |
| `scripts/` | One-off demos (Flaunch launch, EIP-7702 gasless, USDC-gas via ERC-4337) |
| `docs/` | English documentation, `JOURNAL.md`, phase reports, deferred items |

## What was built

1. **Tokens** — AMBR (ERC-20 from scratch, full lifecycle), BALT (B20 native standard,
   deterministic same address on both networks), EMBR (launchpad route via Flaunch)
2. **Native Base–Solana bridge** — round trips completed in both directions on
   testnet (SOL) and mainnet (ETH), proof-based leg included
3. **AI agents** — AmberMind: ERC-8004 identity (Sepolia 8095, mainnet 59020), x402
   micropayment, ERC-8021 attributed transactions, autonomous observe→decide→act run
4. **Building / ecosystem** — Amberboard app (live on Vercel, registered on base.dev),
   Builder Codes attribution proven in calldata, Amber Cubes NFT, funding-paths map

## Deployed contracts (Base Mainnet, all verified)

| Contract | Address |
|----------|---------|
| AMBR (Amberforge Token) | [`0x4Bc12215fd6CB26BbFe1f2960AC025250fa0C6B5`](https://basescan.org/address/0x4Bc12215fd6CB26BbFe1f2960AC025250fa0C6B5) |
| BALT (B20) | [`0xb2000000000000000000001B288D711aC70Fa6c5`](https://basescan.org/address/0xb2000000000000000000001B288D711aC70Fa6c5) |
| AmberBoard | [`0x57E637fcC76B9d2c08E15F6C3e21c4cF77289637`](https://basescan.org/address/0x57E637fcC76B9d2c08E15F6C3e21c4cF77289637) |
| AmberCubes (ERC-721) | [`0x3C509A043C370b79bBd2F15fd5700a8695e348Ff`](https://basescan.org/address/0x3C509A043C370b79bBd2F15fd5700a8695e348Ff) |
| EMBR (via Flaunch) | [`0xD934dB69495724D5A642B256B76fF7Bc24902Fb3`](https://basescan.org/address/0xD934dB69495724D5A642B256B76fF7Bc24902Fb3) |

Sepolia twins are listed in [`docs/JOURNAL.md`](docs/JOURNAL.md) (AMBR
[`0x85bFC3Cd…8382`](https://sepolia.basescan.org/address/0x85bfc3cd262d8efda7d299babf446f054d938382),
BALT at the **same** deterministic address as mainnet).

## Networks

| Network | Chain ID | RPC | Explorer |
|---------|----------|-----|----------|
| Base Sepolia | 84532 | https://sepolia.base.org | https://sepolia.basescan.org |
| Base Mainnet | 8453 | https://mainnet.base.org | https://basescan.org |

## Safety

- Testnet first; mainnet only after explicit confirmation.
- Keys live in Foundry encrypted keystores or a git-ignored `.env` — never in the repo.
- Deliberately no passkey flows; see [`docs/deferred.md`](docs/deferred.md) for what that
  parks and the DIY substitutes used instead.
