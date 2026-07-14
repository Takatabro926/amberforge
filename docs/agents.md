# Base Agent Stack — Phase 3

Three pillars: an MCP-connected wallet for the AI assistant, machine-to-machine payments
(x402), and onchain agent identity (ERC-8004).

## 1. Base MCP (installed; sign-in pending)

Base MCP (`https://mcp.base.org`) connects an AI assistant to a **Base Account** — a smart
wallet secured by a passkey instead of a seed phrase. Installed into Claude Code with:

```bash
claude mcp add --transport http --scope user base-mcp https://mcp.base.org
```

Status: server registered, **awaiting passkey sign-in** (`/mcp` → base-mcp → Authenticate).
Write operations always require per-transaction user approval via approval URLs — the agent
prepares, the human confirms. Tool demos (portfolio, testnet send, message signing, history)
will be recorded here after sign-in.

## 2. x402 micropayment ✅

x402 turns HTTP 402 into a payment rail: the server challenges, the client signs an
**EIP-3009 `transferWithAuthorization`** for USDC, and a **facilitator** submits it on-chain —
the payer spends no gas.

**Executed** (2026-07-14): AmberMind's client (`agents/ambermind/pay-report.mjs`) paid
**$0.001 testnet USDC** for `GET https://trailkeeper-three.vercel.app/report` — a paid
endpoint operated by TrailKeeper, the agent built in the previous learning program
(nice symmetry: our old agent earned from our new one).

| Fact | Value |
|------|-------|
| Payer | `0x23ddAAd22d030b4a8d0BFbADeaCA11Ed9959D08C` (20 → 19.999 USDC) |
| Payee | `0x2C7B…3abC` (TrailKeeper agent wallet, +0.001 USDC) |
| Settlement tx | [`0xbbdd4ded…612f`](https://sepolia.basescan.org/tx/0xbbdd4deda186b79d438b1b1a4d1ea22dc53248d0a6526a0f4e620ed6f9bd612f) |
| Gas paid by | facilitator `0xd407…f1bf` (x402.org) — gasless for payer |
| Flow | 402 challenge → sign EIP-3009 → facilitator settles → 200 + `payment-response` header |

Packages: `@x402/fetch` + `@x402/evm` (exact EVM scheme), signer via viem.

## 3. AmberMind — onchain agent identity (ERC-8004) ✅

**What an onchain agent identity actually is** (by construction, not by definition):

1. **An ERC-721 token** in the ERC-8004 Identity Registry
   ([Base Sepolia `0x8004A818…BD9e`](https://sepolia.basescan.org/address/0x8004A818BFB912233c491871b3d84c89A494BD9e),
   upgradeable proxy; impl `0x7274…9c02`). AmberMind = **agentId 8095**, owner = our deployer.
   Registration: [`0xd9c6de91…0813`](https://sepolia.basescan.org/tx/0xd9c6de91d83a2f5cdbb3e941468aecbdfc62a36b7d91261bd55d221507320813).
2. **An agent card** (JSON) referenced by `agentURI`/`tokenURI`: name, description, service
   endpoints, and a `registrations` entry binding the card back to
   `eip155:84532:0x8004A818…BD9e#8095`. Ours is embedded as a
   `data:application/json;base64` URI — fully on-chain, no hosting dependency
   ([`setAgentURI` tx `0xd4ab469f…108f`](https://sepolia.basescan.org/tx/0xd4ab469f473f48bdbda348a4c597d01db6cd4b50bbfadcf773231629d046108f)).
   Planned: swap to `https://<amberboard>/.well-known/agent-card.json` in Phase 4.
3. **Optional extensions** (not yet used): `setAgentWallet` (EIP-712-verified revenue wallet)
   and the Reputation Registry (`0x8004B663…8713`) where other parties attest to the agent.

Route chosen: **direct ERC-8004** over the Virtuals plugin — no MCP/SIWE login required,
and it teaches the base standard that agent platforms (e.g. Brickken) build upon.

References: [ERC-8004 spec](https://eips.ethereum.org/EIPS/eip-8004),
[reference contracts](https://github.com/erc-8004/erc-8004-contracts).

## Phase 3 acceptance status

| Criterion | Status |
|-----------|--------|
| Base MCP working end-to-end | 🔶 installed, sign-in + tool demo pending (user-deferred) |
| One x402 payment | ✅ |
| AmberMind exists | ✅ agentId 8095 |
| docs/agents.md | ✅ this file |
