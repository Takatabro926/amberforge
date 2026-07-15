# AmberMind — Agent Transaction Rules

## Builder Code (ERC-8021)

AmberMind's wallet `0x23ddAAd22d030b4a8d0BFbADeaCA11Ed9959D08C` is registered as an agent
with Base (`POST api.base.dev/v1/agents/builder-codes`). Its builder code is
**`bc_vsdrc64m`**, stored in `builderCode.ts`. This is distinct from the Amberboard app's
code (`bc_mlikghsq`) — agent activity and app activity are attributed separately.

Do **not** re-register the wallet: that would mint a new code and orphan this one.

## How attribution is attached

Every transaction is sent through viem's `writeContract`/`sendTransaction` with
`dataSuffix: Attribution.toDataSuffix({ codes: [BUILDER_CODE] })` (`ox/erc8021`).
See `agent-tx.mjs` for the reference implementation. Proof tx:
[`0x8eb990df…5580`](https://basescan.org/tx/0x8eb990dfeac77707185115e19dff5a5474e2fc743ed4847b530864f955c15580)
(calldata ends with `62635f767364726336346d…8021×7`).

## Permanent rule

**Every transaction this agent sends MUST include the builder code attribution via the
ERC-8021 data suffix.** Missing attribution produces no error — the activity is just
silently invisible to Base. Any new transaction path added to this codebase must carry
the suffix. (x402 payments are exempt: they are gasless EIP-3009 signatures settled by
the facilitator, not agent-sent transactions.)

## Identity

- ERC-8004: Base Mainnet agentId **59020** (registry `0x8004A169…a432`),
  Base Sepolia agentId **8095** (registry `0x8004A818…BD9e`)
- Agent card: https://amberforge-board.vercel.app/.well-known/agent-card.json

## Sentinel loop (cron)

`cron-run.sh` runs the observe→decide→act cycle on a schedule (`17 */3 * * *` in the
operator's crontab, WSL2 — runs only while the machine/WSL instance is up). The on-chain
cadence is deliberately irregular: random 0–45 min jitter, a 40% random stand-down per
run, and a hard cap of 2 actions per UTC day — on top of the agent's own 4-check policy.
Fixed-interval on-chain activity is a bot signature we intentionally avoid; a run that
stands down costs nothing. Log: `logs/cron.log` (git-ignored).
