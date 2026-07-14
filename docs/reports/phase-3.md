# Phase 3 Report — AI Agents (Base Stack)

**Date**: 2026-07-14 · **Network**: Base Sepolia · **Wallet**: `0x23ddAAd22d030b4a8d0BFbADeaCA11Ed9959D08C`

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| Base MCP working end-to-end | 🔶 installed (`claude mcp add --scope user base-mcp https://mcp.base.org`); passkey sign-in + tool demo **deferred by user** |
| One x402 payment | ✅ settlement [`0xbbdd4ded…612f`](https://sepolia.basescan.org/tx/0xbbdd4deda186b79d438b1b1a4d1ea22dc53248d0a6526a0f4e620ed6f9bd612f) |
| AmberMind exists | ✅ ERC-8004 agentId **8095** |
| docs/agents.md | ✅ |

## Highlights

- **x402**: paid $0.001 testnet USDC for `GET /report` on TrailKeeper (the previous
  program's agent at trailkeeper-three.vercel.app) — 402 challenge → EIP-3009 signature →
  facilitator settled on-chain, **gasless for the payer**. Client: `agents/ambermind/pay-report.mjs`.
- **AmberMind identity**: ERC-721 in the Identity Registry (`0x8004A818…BD9e`), registered
  ([`0xd9c6de91…`](https://sepolia.basescan.org/tx/0xd9c6de91d83a2f5cdbb3e941468aecbdfc62a36b7d91261bd55d221507320813))
  then agentURI set — initially a fully on-chain `data:base64` card, later repointed
  ([`0xf2e2b878…`](https://sepolia.basescan.org/tx/0xf2e2b878c9dd2c9ae3e9c1b01d48ccbbed3f5c896e9f74b3d398bfd2397fe203))
  to `https://amberforge-board.vercel.app/.well-known/agent-card.json`.
- Route: direct ERC-8004 over Virtuals — no login dependencies, teaches the base standard.

## Open item

Base MCP passkey sign-in + core-tool demo (balance, testnet send, sign, history) — resume
with `/mcp` → base-mcp → Authenticate.
