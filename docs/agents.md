# Base Agent Stack — Phase 3

Three pillars: an MCP-connected wallet for the AI assistant, machine-to-machine payments
(x402), and onchain agent identity (ERC-8004).

> **Update 2026-07-14**: user permanently declined passkey-based flows — Base MCP sign-in
> and the tool demo are **abandoned by decision**, not pending. (Base MCP requires a
> passkey Base Account; everything else below works with the EOA keystore.)

## 4. Agent Builder Codes ✅ (mainnet)

AmberMind's wallet is registered as an **agent** with Base
(`POST api.base.dev/v1/agents/builder-codes`) and has its own builder code
**`bc_vsdrc64m`** — separate from the Amberboard app's `bc_mlikghsq`, so agent
activity and app activity are attributed independently. Attribution is attached via
viem's `dataSuffix` on every agent transaction (`agents/ambermind/agent-tx.mjs`,
rules in `agents/ambermind/AGENT_README.md`). Proof on mainnet:
[`0x8eb990df…5580`](https://basescan.org/tx/0x8eb990dfeac77707185115e19dff5a5474e2fc743ed4847b530864f955c15580) —
`cheer()` calldata ends with the agent's ERC-8021 suffix.

## 1. Base MCP (installed; abandoned — passkey required)

Base MCP (`https://mcp.base.org`) connects an AI assistant to a **Base Account** — a smart
wallet secured by a passkey instead of a seed phrase. Installed into Claude Code with:

```bash
claude mcp add --transport http --scope user base-mcp https://mcp.base.org
```

Status: server registered, sign-in **abandoned by user decision** (passkey-based by design —
see `docs/deferred.md`). Everything below was achieved DIY with the EOA keystore instead.

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

**Mainnet registration** (2026-07-14): AmberMind is also registered on the Base Mainnet
registry `0x8004A169…a432` as **agentId 59020**
([tx `0xc24f69b0…dfdb`](https://basescan.org/tx/0xc24f69b01fcf97b5583a7121b123018213def297d32a3d80f576f3bbad49dfdb));
the hosted agent card lists both registrations (mainnet 59020 + Sepolia 8095).

References: [ERC-8004 spec](https://eips.ethereum.org/EIPS/eip-8004),
[reference contracts](https://github.com/erc-8004/erc-8004-contracts).

## 5. Autonomous sentinel run ✅ (mainnet, 2026-07-15)

`agents/ambermind/autonomous.mjs` closes the loop from *identity* to *agency*: one run
**observes** (Chainlink ETH/USD `0x71041ddd…Bb70`, feed freshness, current base fee, own
AMBR inventory), **decides** against a 4-condition policy, and only then **acts** — no
human signing inside the run.

First live run: observed ETH/USD **$1880.62** (feed age 464 s), base fee 0.005 gwei,
inventory 997,800 AMBR → all checks passed → `cheer()` executed with the agent's
ERC-8021 suffix: [`0x4111fdce…3142`](https://basescan.org/tx/0x4111fdce3694f4b0c87983859d4227f3051f6662b9bb0f48837549d77f963142),
cheers 7 → 8. When any check fails the agent stands down and prints its decision trace
(verified via `--dry-run`).

**DIY vs hosted**: this run signs locally with the EOA key and hand-rolls its policy.
The hosted stack (Base MCP + Base Account) would add per-transaction human approval URLs,
passkey custody, and Spend Permissions (onchain-enforced budgets) — i.e. guardrails around
the same primitive, not a different capability.

## Coverage: DIY vs deferred

| Capability | DIY (EOA keystore) | Base Account / MCP path |
|------------|--------------------|-------------------------|
| Agent identity (ERC-8004) | ✅ Sepolia 8095 + mainnet 59020 | not required |
| x402 micropayment | ✅ `pay-report.mjs` (EIP-3009, gasless) | MCP `x402` tool — deferred |
| Attributed agent txs (ERC-8021) | ✅ `agent-tx.mjs`, code `bc_vsdrc64m` | not required |
| Autonomous condition→action | ✅ `autonomous.mjs` (this page, §5) | hosted approval flows — deferred |
| Wallet tool demos (portfolio/send/sign/history) | n/a (covered by cast/viem directly) | ❌ requires passkey sign-in — deferred |
| Spend Permissions / budget enforcement | ❌ not replicable with bare EOA | deferred (see `docs/deferred.md`) |

## Phase 3 acceptance status

| Criterion | Status |
|-----------|--------|
| Base MCP working end-to-end | ❌ abandoned (passkey) — logged in `docs/deferred.md` |
| One x402 payment | ✅ |
| AmberMind exists | ✅ agentId 8095 (Sepolia) + 59020 (mainnet) |
| Autonomous action | ✅ sentinel run, tx `0x4111fdce…3142` |
| docs/agents.md | ✅ this file |
