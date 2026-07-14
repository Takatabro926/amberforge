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
