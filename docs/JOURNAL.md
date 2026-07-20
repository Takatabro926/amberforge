# Amberforge Journal

Running log of every meaningful action: date, action, tx hash, lessons learned.

---

## 2026-07-20 — Block H: fork tests, invariant suite, gas-snapshot CI gate

No txs this block — testing/CI depth only, ahead of the next mainnet-touching blocks.

- **Mainnet fork tests** (`contracts/test/fork/`, `FORK=1 forge test --match-path "test/fork/**"`,
  pinned to block 48,893,600): read AmberAnchor/AmberBoard/AmberCubes as they actually
  stand on Base mainnet — decode every minted cube's on-chain `tokenURI`, cross-check
  `leaderboard()` against `totalCheers`/live AMBR `balanceOf`, confirm the CREATE2 anchor
  still reports the registered agent ids. Skip cleanly via `vm.skip(true)` in `setUp()`
  when `FORK` isn't set, so the default offline suite is untouched.
- **Stateful invariant suite for AmberCubes** (`contracts/test/invariant/`): a handler
  drives `cheer`/`mintCube`/`transferFrom` from 5 actors and records ghost state (the
  contracts don't expose "who has ever minted"). 5 invariants incl. minted-count parity,
  on-chain `minted` flag matching ghost minters, and ownership always matching handler
  bookkeeping. `runs=64 depth=32 fail_on_revert=true` — the handler swallows the expected
  `AlreadyMinted`/`NotEnoughCheers` reverts itself so nothing bubbles up.
  Plus 2 new fuzz tests: mint-id order follows call order (not cheer count), and the mint
  gate stays locked for every past holder along an arbitrary-length transfer chain.
- **Gas snapshot baseline** committed (`.gas-snapshot`, excludes `testFuzz`/`invariant`
  selectors — nondeterministic by design), CI gate `forge snapshot --check`.
- **CI**: pinned `foundry-toolchain` to v1.7.1 (gas reports have drifted across versions
  before) and added a separate `contracts-fork` job so a flaky public RPC can never block
  the fast offline `contracts` job.
- **Lesson**: querying live state via `cast call` before writing fork-test assertions beat
  trusting the journal's own historical tx notes — e.g. Cube #1's owner had moved since it
  was last logged, and hardcoding the old value would have made the test wrong on day one.

## 2026-07-15 — Agent avatar record + first Sablier stream

- **Avatar on `ambermind.evmpirate.base.eth`**: CAIP-19 pointer at Cube #1
  (`eip155:8453/erc721:0x3C50…48Ff/1`) via resolver `setText`
  ([`0xeb712af9…2886`](https://basescan.org/tx/0xeb712af9fead5ec32a8c0aeaa115924e5109e635a84b42137d4eec73cd852886)).
  The parent `evmpirate.base.eth` already had a user-set IPFS avatar — left untouched.
- **First token stream** (SablierLockup v4 `0xc19a…C0A`): 50 AMBR streaming linearly
  to the helper over 30 days, per-second granularity, cancelable+transferable —
  **stream #867** ([`0x1d5478c5…07b0`](https://basescan.org/tx/0x1d5478c5cd42dd959a641ba4b50a046b2b24b75113b4cf1a4a70351f91d107b0)).
  Recipient holds the stream as an NFT and can withdraw the streamed portion anytime;
  2 s after creation `streamedAmountOf` showed exactly 2×(50/2,592,000) AMBR.

## 2026-07-15 — ERC-6551 TBA for Cube #1, Uniswap V4 pool, Flashblocks probe

- **ERC-8004 Validation Registry: blocked upstream.** The erc-8004-contracts repo lists
  NO ValidationRegistry deployment on any network — that part of the spec is being
  revised with the TEE community. Re-check later in the year.
- **ERC-6551 token-bound account**: Cube #1 now owns a wallet. Canonical registry
  `createAccount` → TBA `0x03B40DEF1Db5EBe59a4A563F1E6258927Ea82482`
  ([`0x1c3ec402…abd0`](https://basescan.org/tx/0x1c3ec4021e70582bf24f9439d1778f23b62d0bbb7a8c95f2d0a94285090fabd0)),
  proxy initialized to Tokenbound AccountV3, funded with 1 AMBR, then `execute()`d a
  0.5 AMBR transfer signed by the NFT's owner
  ([`0x32c6e4e6…d718`](https://basescan.org/tx/0x32c6e4e6af65781e639c5bd18b9fae41ab6b8f5fffac35a6402b20c2946ed718)).
  Sell the Cube and its bank account goes with it.
- **Uniswap V4** (`scripts/univ4-ambr.mjs`): hookless native-ETH/AMBR pool initialized
  on the PoolManager singleton (no factory deploy, ETH without WETH — both new vs V3)
  ([`0x31bfe3cd…c5ac`](https://basescan.org/tx/0x31bfe3cd1f17f3f5ad5127c3c6c7fbe7a3b23b1e1e8e79d3acfd04ad4caac5ac)),
  price 10,000 AMBR/ETH; full-range position **#2818983** minted via Actions-encoded
  `modifyLiquidities` + Permit2 (~0.0002 ETH + 2 AMBR, SWEEP refunded the excess)
  ([`0x15e80db8…e298`](https://basescan.org/tx/0x15e80db831032548a7cbe44f6da4325aa79246e1b57482fc2546b472532fe298)).
  No self-swap — trading against our own liquidity proves nothing.
- **Flashblocks probe** (`scripts/flashblocks-probe.mjs`, 5 sends): with local signing
  and polling parallel to dispatch, `eth_sendRawTransaction` acks in ~140 ms and the
  **receipt is served 380–480 ms after dispatch** — consistently faster than the 2 s
  block cadence, i.e. the public HTTP endpoint answers from Flashblocks preconfirmed
  state. `base_transactionStatus` returns `{"status":"Unknown"}` through the public
  load balancer; the 200 ms preconf stream needs provider WebSockets.
- Stale-read tally: ~10 (TBA AMBR balance and post-mint ETH balance both lagged).

## 2026-07-15 — Legacy position cleanup + first NATIVE L1→L2 deposit

Wallet-history audit (727 txs since 2023-08 — this deployer had a long pre-Amberforge
life) surfaced live legacy DeFi positions. Recovered, all in one pass:

| Action | Tx |
|--------|----|
| Aave v3 withdraw 0.1086 USDbC (aBasUSDbC, deprecated bridged USDC) | [`0xa480e485…e900`](https://basescan.org/tx/0xa480e485cdb9e8068c0474f355334cc14eb92dbbd0d5513ce11b2286e4cbe900) |
| Seamless withdraw 0.0001 WETH (sWETH) | [`0x621c61fd…5753`](https://basescan.org/tx/0x621c61fd7db5c27fb7c757f32671b14dfed53da778347debc1a6763dc7295753) |
| Stargate V1 `instantRedeemLocal` ~1.0 USDbC (S*USDbC LP) | [`0x0a02ca14…9ded`](https://basescan.org/tx/0x0a02ca14251d521deab34d203db9801b04d1a09f184e45a73f6b019a2b6b9ded) |
| Burn empty Uniswap V3 position NFT #138546 (AMKT/WETH shell, liquidity 0) | [`0x3492ecc8…1f77`](https://basescan.org/tx/0x3492ecc862a2326e03119b2bce79766cf970da64fa5919b9748fda55ecea1f77) |
| Consolidate: swap 1.109 USDbC → 1.109 USDC (fee-100 pool) | [`0x505872b6…a43b`](https://basescan.org/tx/0x505872b6ce21989ae8765fc71bc256aaa325f1e012d89fc405a1ced444e0a43b) |
| Unwrap WETH dust | [`0x74215d65…949b`](https://basescan.org/tx/0x74215d65210979a127518bdb1249b20c3ff1ab0a3bbebd22b797f4ba0e0c949b) |

Deployer USDC: 0.634 → **1.743**. Skipped deliberately: veMAV (1 MAV locked until
2028-04), HorizonDEX position #3862 (3 wei of liquidity, nonstandard ABI),
Superform SP / rEUL / MORPHO / SEAM (holdings, not closable positions), and every
scam airdrop token (fake UЅDС/CAKE/AERO "claims" — never interact).

**First native L1→L2 deposit** (`scripts/l1l2-deposit.mjs`, viem op-stack
`buildDepositTransaction` → `depositTransaction`): 0.002 ETH, L1 tx
[`0xb3d7a0fb…9b17`](https://etherscan.io/tx/0xb3d7a0fb12793140666f8bb1b2922789a1b1535a721a1fec3493153e03f39b17)
→ derived L2 tx `0xe252f0b4…6433`, minted in ~2 min. All historic bridging from this
wallet was third-party (Stargate/Across/LiFi/Axelar) — the native portal was untouched
until now; with the pending withdrawal this completes the native round trip.

## 2026-07-15 — Sentinel loop on cron, activity feed, app test suite, EMBR revenue check

Four items from the ideas list, in one sitting:

- **AmberMind sentinel loop on cron**: `agents/ambermind/cron-run.sh` wraps
  `autonomous.mjs` — crontab `17 */3 * * *`, plus 0–45 min random jitter, 40% random
  stand-down per run and a 2-actions-per-UTC-day cap, so the on-chain cadence never
  falls into a fixed rhythm (bot signature). First loop-driven action landed:
  [`0x654d2962…43e9`](https://basescan.org/tx/0x654d2962d6003b16597eedb8e55001ed2918fbe9665c12770ef52cccd59243e9)
  (board cheers → 11, with ERC-8021 suffix). Caveat: WSL2 cron runs only while the
  machine is up. Stale-read lesson struck again (~8th time): post-receipt `cheers()`
  read returned the pre-tx value.
- **On-chain activity feed** in Amberboard: `lib/activity.ts` walks `eth_getLogs` in
  newest-first 10,000-block windows (public RPC hard cap, error -32614) with early
  exit, merging `Cheered` events and Cube mint `Transfer`s; UI panel with time-ago
  stamps, 60 s refetch. Verified against live mainnet data via an opt-in
  `RUN_LIVE=1` integration test.
- **App test suite**: vitest, 21 unit tests over `lib/` (ERC-8021 suffix round-trip,
  checksummed addresses, `cheer()` selector = raw `0x34e5a1f5` used by agent scripts,
  registry address regression guard for the …a432/…b432 typo, log windowing math);
  new `app` job in CI.
- **EMBR revenue check** (read-only): `creatorRevenue(deployer)` = **0 ETH**, BidWall
  position empty — no swaps have occurred since launch, so no fees accrued. Honest
  zero; mechanism confirmed working via `@flaunch/sdk`.

## 2026-07-15 — Gas paid in USDC on MAINNET (EPv0.7 SimpleAccount) — Sepolia gap closed

- Session-start parity audit (new standing rule: every Sepolia flow must get its mainnet
  finał) found one closable gap: the Pimlico ERC-20 paymaster run existed only on Sepolia.
- **Mainnet run** (`scripts/erc20-gas-v07-mainnet.mjs`, helper EOA as owner — mirroring
  tester on Sepolia): counterfactual SimpleAccount `0x4AE2F6a3c1140944e3b68d14A08D5E141D8A3b51`
  funded with 0.30 USDC from deployer
  ([`0x01945cc0…b884`](https://basescan.org/tx/0x01945cc00b0805750c006004df98eb1d031de842e5e5990fecc2e8bfbadbb884)),
  then a single userOp deployed the account **and** called `cheer()` with gas paid
  entirely in USDC (account held 0 ETH) —
  [`0xeefcdba8…9276`](https://basescan.org/tx/0xeefcdba86432cc7c73e45535c767eb2c9811a52123c56b9b496ee6a8bfa19276).
  Board cheers 9 → 10. Total gas cost: **0.006784 USDC** (~0.7¢) for deploy + call.
- Remaining Sepolia-only items are both externally blocked: TrailKeeper as mainnet x402
  seller (needs user's CDP API keys) and the Sepolia TRAIL ownership transfer (testnet
  housekeeping, not a mainnet gap).

## 2026-07-15 — L2→L1 withdrawal PROVEN on L1

- **Prove executed** (act two of three): the 0.001 ETH withdrawal
  ([`0x39359854…e56b`](https://basescan.org/tx/0x393598544a55f1d5dca8e434d250e6d28bd1f9ff6a6cc1199804587795aee56b))
  reached `ready-to-prove` and was proven on Ethereum L1 —
  [`0xaa0bec22…ff9b`](https://etherscan.io/tx/0xaa0bec22ebc3483cdc1c2c3c8fe85390393cca0bd9d95f712d8a23bbce9eff9b).
  Status now `waiting-to-finalize`; **finalize after ~2026-07-22** (7-day challenge window),
  same driver: `scripts/l2l1-withdraw.mjs finalize <tx>`.
- Operational lesson: the background prove-watcher from the previous session died with the
  session (scratchpad scripts are ephemeral) — the prove was caught by a manual status check
  at the start of this session. Calendar-style follow-ups belong in the journal/resume notes,
  not in session-local processes.

## 2026-07-15 — L2→L1 withdrawal initiated (user-approved) + Reputation Registry

- **Native L2→L1 withdrawal** (user "TAK" — L1 gas involved): 0.001 ETH initiated on Base
  via `L2StandardBridge.withdraw` ([`0x39359854…e56b`](https://basescan.org/tx/0x393598544a55f1d5dca8e434d250e6d28bd1f9ff6a6cc1199804587795aee56b), block 48,669,092).
  Three-act structure ahead: **prove** on L1 once a dispute game covers the block
  (watcher armed, `scripts/l2l1-withdraw.mjs prove`), **finalize** after the 7-day
  challenge window (calendar item). L1 gas at 0.17 gwei ⇒ both L1 steps well under $0.50;
  deployer holds 0.00705 L1 ETH.
- **ERC-8004 Reputation Registry** (`0x8004BAa1…9b63`, impl via EIP-1967, verified):
  helper wallet rated **TrailKeeper #58971** (the previous program's agent — owned by its
  own agent wallet `0x6D48…639D`, so no self-feedback conflict) for the historical x402
  `/report` interaction: `giveFeedback(58971, 97, 0, "x402", "report", "/report", …)` —
  [`0x263bfbcc…056f`](https://basescan.org/tx/0x263bfbccdf79967db7db5f6a9f30a5d1ba703faf10f8f832f6d8474d8023056f).
  `getSummary(58971,[helper])` → (1, 97, 0). Transparency note: rater and ratee are both
  ours — this is a mechanism walkthrough, not organic third-party reputation.
- Registry quirk: `getSummary` requires a non-empty `clientAddresses` filter.

## 2026-07-15 — setAgentWallet + app footprint panel + Sepolia mirror

- **ERC-8004 `setAgentWallet` (mainnet)**: AmberMind #59020 now has a dedicated revenue
  wallet (the helper), set with the wallet's own EIP-712 consent
  (`AgentWalletSet(uint256 agentId,address newWallet,address owner,uint256 deadline)`,
  domain `ERC8004IdentityRegistry` v1): [`0x112bace1…a7ad`](https://basescan.org/tx/0x112bace11e2e7a15ca7c096c26272ae3304f5779e8a9b4451e14a15d046ea7ad).
  Gotchas: registry address had a one-char typo in our notes (recovered the real one from
  the registration tx's `to`); ABI recovered via EIP-1967 impl slot (same impl as Sepolia);
  `MAX_DEADLINE_DELAY = 5 minutes` — consent signatures must be fresh.
- **App**: "onchain footprint" panel live on amberforge-board.vercel.app — reads
  `AmberAnchor.REPO()` and `getAgentWallet(59020)` from chain, links the EAS attestation,
  shows `ambermind.evmpirate.base.eth`.
- **Sepolia mirror**: AmberAnchor deployed via CREATE2 at the **identical address**
  `0x7559EaCa…E6A1` ([`0x0bbeb34d…a242`](https://sepolia.basescan.org/tx/0x0bbeb34dc60f89f38f85e377a3b7eb50890bc1e44a6d86b8a628240d754fa242), verified);
  EAS schema registered — **UID identical to mainnet** (`0xa50f4253…`, pure function of
  schema+resolver+revocable, chain-independent) + `sepolia-mirror` attestation
  ([`0x462ea449…7e35`](https://sepolia.basescan.org/tx/0x462ea44925a8d4238f3548b104f759883638b2a63736e62a6fa74ce668197e35));
  tester's existing 7702 delegation reused for an atomic `executeBatch` (cheer + AMBR
  transfer): [`0x5f811b12…156e`](https://sepolia.basescan.org/tx/0x5f811b1250690b2170e12b51a22123d754e507a1019a7311a5d318f171fa156e).

## 2026-07-15 — Agent got a name + EAS revocation lifecycle

- **`ambermind.evmpirate.base.eth` live**: subname minted straight on the Basenames
  Registry (`setSubnodeRecord`, [`0xb773bee6…6b85`](https://basescan.org/tx/0xb773bee6c8834f3fc51d96ac0a16668897aa5688a468134ea365744c19cb6b85)),
  records set via resolver multicall ([`0x12fb1628…c07e`](https://basescan.org/tx/0x12fb16288619dec93f7ba4fcc187f27714b02708523ab0a1edf0aa36b805c07e)):
  `addr` → agent wallet, `url` → agent card. The ERC-8004 identity is now reachable by ENS name.
- **EAS revoke**: scratch attestation created and revoked
  ([`0x3a21036c…0444`](https://basescan.org/tx/0x3a21036ce80cf4bbcf6c169c2fbbfedc90c811ce3ea1c0d3294a961ddebd0444));
  `revocationTime` stamped on-chain 36 s after creation. Details §12–13 of
  docs/mainnet-explorations.md.
- Lessons: mainnet reproduced the Sepolia `nonce too low` on rapid sends; and bash's
  readonly `UID` variable ate an attestation UID (recovered from the receipt).
- ERC-8004 `setAgentWallet` on mainnet: **blocked for now** — registry source unverified
  on BaseScan, not calling an unverified selector blind; next step is recovering the ABI
  via the proxy implementation slot.

## 2026-07-15 — Test suite doubled + approval family + EIP-7702 LIVE on mainnet

- **Tests 14 → 29** (all green, CI enforces `forge fmt` now): new AmberCubes suite
  (mint gate, sequential ids, approvals, on-chain metadata decode, fuzz) + AmberBoard
  additions (Cheered event payloads, participant dedup, live balances, consistency fuzz).
- **Approval family on mainnet** (docs/mainnet-explorations.md §10): `burnFrom` 50 AMBR
  (supply → 998,950), spent yesterday's permit allowance (25 of 50 BALT), ERC-721
  `approve` + third-party `transferFrom` (Cube #1 back at deployer).
- **EIP-7702 on mainnet** (§11): helper's authorization signed offline, **deployer
  sponsored the type-4 delegation tx** ([`0xfe53f357…fce4`](https://basescan.org/tx/0xfe53f357c8e488e9f67da2936ce036a99eaf708603c9ad56ade25aad550ffce4));
  helper EOA then executed an **atomic batch on itself** — cheer + AMBR transfer in one tx
  ([`0xf3bde33f…2c02`](https://basescan.org/tx/0xf3bde33fd59ea7476140fcb062da20e81c9a4632e684ef9307740312a38d2c02)).
  Impl address recovered from the Sepolia tester's delegation designator and verified
  as the same `Simple7702Account` on mainnet.
- Stale-read lesson count: 4 (this time the freshly-set 7702 code read as "0x").

## 2026-07-15 — First DEX swap + first mainnet x402 payment

- **Swap** (first ever): 0.0005 ETH → 0.938325 USDC, Uniswap V3 `SwapRouter02`
  `exactInputSingle` with ETH via `msg.value`, min-out from Chainlink, dry-run first:
  [`0x992263a9…1b68`](https://basescan.org/tx/0x992263a9ad1dfd2724859173511a43bc462bd6acf1da7a4e8ad31fd4514f1b68)
- **x402 on mainnet** (first ever; Sepolia → production): found the x402 Trust Oracle
  ($0.002/call) via the Bazaar discovery API, paid with the fresh USDC — settlement
  [`0xd8f10d01…5a21`](https://basescan.org/tx/0xd8f10d0173d25db1e532d3f907889669d3bbe4527a8fba123828bc81e3e15a21)
  (EIP-3009, gasless for payer). **Debugging story**: client v2.18 sends
  `PAYMENT-SIGNATURE`, live sellers still expect `X-PAYMENT` — dual-header client in
  `agents/ambermind/pay-x402.mjs`; failed attempts cost nothing (settlement happens
  only server-side). Details: `docs/mainnet-explorations.md` §8–9.

## 2026-07-15 — Seven first-time mainnet mechanisms in one session

Full write-up with all hashes: `docs/mainnet-explorations.md`. Headlines:

- **WETH wrap/unwrap** (predeploy): [`0xa0082af5…7dca`](https://basescan.org/tx/0xa0082af5a056146fbbcb6a58e9362c30f47c5ce4294c42be0ee88359b24c7dca), [`0xa976ff34…d969`](https://basescan.org/tx/0xa976ff3417ea875b6f6959999e2775a8aa4b713c014bf26b23aa2c044609d969)
- **Multicall3 atomic batch** (deposit+transfer, one tx): [`0xc5357076…b4ae`](https://basescan.org/tx/0xc53570763e60c4d156461f09ff1416699c038a6a858086e9c29a7e65b12eb4ae)
- **CREATE2 deterministic deploy** — `AmberAnchor` at [`0x7559EaCa…E6A1`](https://basescan.org/address/0x7559EaCa8Eaa1705B5a7C9b25Fd508A41326E6A1), verified; 3 new tests
- **Basename text records** on `evmpirate.base.eth` (`com.github`, `url`) via resolver multicall: [`0x6a566fb1…71a0`](https://basescan.org/tx/0x6a566fb1a36a81ea8c2d40d14ec087b8d0baf42ae6db114901b5daa31df471a0)
- **EAS schema + attestation** of the autonomous run (predeploys `0x…0020/0x…0021`), attestation UID `0x7b8d23cb…d9f2`
- **First ERC-721 transfer** — Cube #1 → helper: [`0xbf147fec…231a`](https://basescan.org/tx/0xbf147fec072b4409ba695fb65d5cc26fa78f4e27c008a53fb7169471fc28231a)
- **EIP-2612 permit on BALT** — offline signature, helper paid gas, allowance 50 BALT: [`0x08b5068d…3ffb`](https://basescan.org/tx/0x08b5068d99352ac2382c66d5a9d56540ad61ae5a95275c9a895fae8a20903ffb)
- **Lesson (recurring, now 3×)**: public RPC serves stale reads right after a receipt — re-read before concluding anything.

## 2026-07-15 — AmberMind's first autonomous action (mainnet) + repo published to GitHub

- **Autonomous sentinel run** (`agents/ambermind/autonomous.mjs`): observe → decide → act,
  no human signing inside the run. Observed ETH/USD **$1880.62** from Chainlink
  `0x71041ddd…Bb70` (feed verified on-chain via `description()`, age 464 s), base fee
  0.005 gwei, inventory 997,800 AMBR → 4/4 policy checks passed → `cheer()` with the
  agent's ERC-8021 suffix: [`0x4111fdce…3142`](https://basescan.org/tx/0x4111fdce3694f4b0c87983859d4227f3051f6662b9bb0f48837549d77f963142),
  cheers 7 → 8, suffix confirmed in calldata. Dry-run mode prints the decision trace only.
- **Lesson**: a `readContract` immediately after `waitForTransactionReceipt` on the
  load-balanced public RPC returned pre-tx state (cheers 7 → "7"); a fresh `cast call`
  confirmed 8 — same stale-node class as the Sepolia nonce lesson.
- **Repo published**: https://github.com/Takatabro926/amberforge (public). Full history
  re-authored to the GitHub-linked email before first push (repo had never left the machine).
- `docs/agents.md` gained the DIY-vs-deferred coverage matrix; `docs/deferred.md` now
  lists exactly what stays parked behind Base Account (passkey) and the substitutes shipped.

## 2026-07-14 — MAINNET: AMBR full lifecycle complete (mirrors Sepolia)

Executed 23:50 local, minutes before the session hit its usage limit — the txs all landed
but went unjournaled; reconstructed and verified from chain on 2026-07-15.

Helper wallet `0x4D0c9faE02a3596Bf1D888D27c2914641Fe0fB5a` (throwaway, key in git-ignored `.env`),
playing the tester role from the Sepolia lifecycle.

| # | Action | Tx |
|---|--------|----|
| 1 | Fund helper with 0.00003 ETH (gas) | [`0xdbb0e677…b586`](https://basescan.org/tx/0xdbb0e677c8e726a4ab893ac40c00bdcc171635627607d646ca8208e2b76fb586) |
| 2 | `transfer` deployer → helper, 1,000 AMBR | [`0x043823d4…a35f`](https://basescan.org/tx/0x043823d48358d38942148236c125711df0eaa8a85272cfa6947d2454688aa35f) |
| 3 | `approve` helper for 500 AMBR | [`0x52e070fd…6c81`](https://basescan.org/tx/0x52e070fd7584c082b9e31a26de7873e81a54a019eacf1beeaf7f073a0d776c81) |
| 4 | `transferFrom` (signed by helper) deployer → helper, 200 AMBR | [`0xb0e033b9…74cd4`](https://basescan.org/tx/0xb0e033b9ed5bafaf2588e743c342806f9e731ffdcffd89d1ed21f1c3ad874cd4) |

(The `burn` step of the Sepolia lifecycle was already done on mainnet earlier the same day —
supply 999,000.)

Final state verified on-chain 2026-07-15 — **identical to Sepolia's end state**:
totalSupply 999,000 AMBR; deployer 997,800; helper 1,200; remaining allowance 300.
No pending txs on any wallet (latest nonce == pending nonce); nothing left mid-flight.

## 2026-07-14 — MAINNET: AMBR deployed to Base Mainnet + Blockscout API assessment

User-approved (explicit "TAK", cost card shown first: ~583k gas ≈ <$0.02).

- **AMBR on Base Mainnet (8453)**: [`0x4Bc12215fd6CB26BbFe1f2960AC025250fa0C6B5`](https://basescan.org/address/0x4Bc12215fd6CB26BbFe1f2960AC025250fa0C6B5)
  — deploy tx [`0x17e5cf73…ed30a`](https://basescan.org/tx/0x17e5cf7346f70ed19d997f149630363df78a27f98324321987d5dffc4b2ed30a), same bytecode as Sepolia (1M AMBR to deployer).
  - **BaseScan**: `Pass - Verified` (Etherscan V2).
  - **Blockscout mainnet** ([page](https://base.blockscout.com/address/0x4Bc12215fd6CB26BbFe1f2960AC025250fa0C6B5)): verification via v2 standard-input API with user's `proapi_` key — **worked, verified in ~20 s** (unlike the Sepolia instance, which still hasn't processed any of our submissions).
- **Blockscout API test results** (mainnet instance):
  - ✅ `smart-contracts` v2 (is_verified, compiler, evm=osaka) — works
  - ✅ legacy `getsourcecode` — works (full source returned)
  - ✅ `transactions/{hash}` — works, includes the constructor-mint token transfer
  - ⏳ `tokens/{addr}` — `Not found` minutes after deploy; token records populate via an async queue
  - ⏳ `addresses/{addr}/counters` — zeros; aggregates are async too (instance reports `indexed_internal_transactions_ratio: 0.58`)
  - Watcher armed for the token record to measure the lag.
- **Lesson**: on Blockscout, "indexed" is layered — raw blocks/txs are immediate, while token registries and counters are derived asynchronously; don't treat `tokens/` 404 as "token doesn't exist".

## 2026-07-14 — MAINNET: AMBR burn + BALT (B20) live — same address as Sepolia

New standing rule from user: no per-tx confirmation below $3; cost card + TAK above.

- **Burn 1,000 AMBR** (supply 1M → 999,000, mirroring Sepolia): [`0xbd1e0b9e…8758`](https://basescan.org/tx/0xbd1e0b9e18cfd5dbbbe6515de2f48561f8d2689f6484fb1e4523e5a809a98758)
- **BALT created on mainnet** via B20 Factory — **deterministic address identical to Sepolia** (`(variant, sender, salt)` derivation is chain-independent): [`0xb2000000000000000000001B288D711aC70Fa6c5`](https://basescan.org/address/0xb2000000000000000000001B288D711aC70Fa6c5)
  - createB20 (MINT_ROLE + cap 1M): [`0xdedb0188…ae44`](https://basescan.org/tx/0xdedb0188eafa7c993a6cdee031ba5057b5bf4885d1498dfb0543196f049dae44)
  - mint 250,000 BALT: [`0xd166dcc7…a6db`](https://basescan.org/tx/0xd166dcc7c7d4bba657358f54d5aa8b6f12bb8b9a486cb1c08dcfaeaf1815a6db)
  - Verified state: supply 250k / cap 1M / initialized ✅. All dry-run via `eth_call` first.
- Total cost of the 3 txs ≈ 0.000006 ETH incl. L1 (deployer balance 0.007662 ETH).

## 2026-07-14 — MAINNET: Amberboard app + contracts + AmberMind #59020

- **AmberBoard** [`0x57E637fcC76B9d2c08E15F6C3e21c4cF77289637`](https://basescan.org/address/0x57E637fcC76B9d2c08E15F6C3e21c4cF77289637) (deploy [`0xe3ce6edf…7bf2`](https://basescan.org/tx/0xe3ce6edfce02d844845d26830d0bc9070984e6da29ea55c9fceda1b4b1547bf2)) and **AmberCubes** [`0x3C509A043C370b79bBd2F15fd5700a8695e348Ff`](https://basescan.org/address/0x3C509A043C370b79bBd2F15fd5700a8695e348Ff) (deploy [`0xc608de61…6a93a`](https://basescan.org/tx/0xc608de61398894798f41c38deb8693340bd2645b28f8f87d273ff246a5d6a93a)) — both verified on **BaseScan and Blockscout** (Blockscout v2 API with `autodetect_constructor_args=true` — verified in ~30 s).
- Board seeded: 3 × cheer ([1](https://basescan.org/tx/0x40e1e807e104c01ac8e246a453f378448a8c79dc9952a00bee73e330faf20452), [2](https://basescan.org/tx/0x666b6d5f633701f44185ba39a84c02774fe11ad999a07b7f82f5961294722597), [3](https://basescan.org/tx/0x691901d9f5d010db26a31ec12ec80a97248273a95c9976023342cffa2edce4b9)) + **Cube #1** ([`0x457abca7…60ec`](https://basescan.org/tx/0x457abca78ea635d4f4ab3a21f7bbadbf6417109a08d3b25bcaa3331e534e60ec)). Same estimation-lag revert as Sepolia — retry loop handled it.
- **App switched to Base Mainnet** (contracts, chainId, explorer links) and redeployed to amberforge-board.vercel.app.
- **AmberMind registered on mainnet registry** `0x8004A169…a432`: [`0xc24f69b0…dfdb`](https://basescan.org/tx/0xc24f69b01fcf97b5583a7121b123018213def297d32a3d80f576f3bbad49dfdb) → **agentId 59020** (dry-run predicted 59019 — someone registered in between; **read the actual ID from the Transfer event, not the dry-run**). Agent card lists both registrations (mainnet 59020 + Sepolia 8095); `tokenURI` points at the hosted card.
- Bridge to Solana intentionally ON HOLD — user will supply the destination address.

## 2026-07-14 — MAINNET: B20 payment with memo + EMBR launched on Flaunch

- **B20 payment**: `transferWithMemo(0x1b66…D57e, 100 BALT, "AMBERFORGE-INV-001")` — [`0x80772687…82b5`](https://basescan.org/tx/0x80772687e797210734847ba8905e9401d9206f5650b4b523077ba82a1d2882b5); emits `Transfer` + `Memo` (payment-with-reference natively in the standard). Balance at recipient confirmed.
- **Amber Ember (EMBR) launched via Flaunch** (launchpad route now executed, not just documented): memecoin [`0xD934dB69…2Fb3`](https://basescan.org/address/0xD934dB69495724D5A642B256B76fF7Bc24902Fb3), tx [`0x01105472…4e92`](https://basescan.org/tx/0x01105472b3f12054afc706bbf715371231e088140668fbc916563941dcac4e92), Flaunch revenue NFT **#113484** to deployer (80/20 split). $1k mcap ⇒ no protocol fee. Script: `scripts/flaunch-embr.mjs`.
- **Lesson**: docs lag protocol — Flaunch's documented 30-min FairLaunch is deprecated on-chain; the SDK error message was the source of truth.
- Blockscout mainnet `tokens/` record for AMBR appeared after **~32 min** (watcher measurement).

## 2026-07-14 — Agent Builder Codes (mainnet) + passkey flows abandoned by user decision

- **User decision**: all passkey-based flows permanently off (biometrics concern; clarified once that passkeys can use PIN/hardware key — decision stands). Base MCP sign-in + tool demo tasks removed; Base Account bundle (SIWB/Base Pay/Sub Accounts/Spend Permissions/subscriptions) not pursued.
- **AmberMind registered as agent** via `api.base.dev/v1/agents/builder-codes` → dedicated code `bc_vsdrc64m` (separate from app's `bc_mlikghsq`). Attribution wired into agent tx path (`agent-tx.mjs`, viem `dataSuffix`); rules in `AGENT_README.md`.
- **Proof tx (mainnet)**: agent `cheer()` [`0x8eb990df…5580`](https://basescan.org/tx/0x8eb990dfeac77707185115e19dff5a5474e2fc743ed4847b530864f955c15580) — calldata carries the agent suffix (verified programmatically).
- Bridge: mainnet root oracle bursty (>2 h behind at times); prove poller re-armed at 10-min interval.

## 2026-07-14 — MAINNET bridge round trip DONE + AA without passkeys (gasless & USDC-gas)

- **Mainnet bridge complete both ways** (details in docs/bridge.md): 0.0005 ETH Base→Solana (root wait ~70 min, prove [`3dKYAsN2…`](https://explorer.solana.com/tx/3dKYAsN26jKc1nAVoqTA248sfaRQir5F3gkAUjWQivLFVm7ydt8otHGeM7veYmaiu2CNAHeRf217KV2XvA1nPo7v), relay [`2j4p9TMy…`](https://explorer.solana.com/tx/2j4p9TMyqtHW5cMzCtdvYKVnYSfD4yHe3Zd6vHnHMFW3bDbrCq4pdyUqsaLkj9ga8Qzbx6DXN2gi8UgBgDcsodn)) → 0.0005 wETH on user's ATA; return 0.00025 wETH burn ([`2nMBLHig…`](https://explorer.solana.com/tx/2nMBLHig4NiZed2KEfeUAA7NbDDQXJ5CY3TfXkkqnC1FR6KXHhvJ6C9dRZL7R5r9SujmEe7yr8pmTyW1TE2TFgpw)) → native 0.00025 ETH delivered to user's `0x1b66…D57e` (gasless for recipient).
- **Gasless (EIP-7702 + Pimlico sponsorship)**: tester EOA delegated to Simple7702Account, sponsored `cheer()` [`0x781d198a…861d`](https://sepolia.basescan.org/tx/0x781d198ae33913c7e8ecbe9857f2718bdc408ecaf1f8a5f8964b6ffdd552861d) — ETH unchanged to the wei.
- **Gas in USDC (ERC-4337 v0.7 + ERC-20 paymaster)**: counterfactual SimpleAccount with 0 ETH ever, first op deployed it + cheered, gas billed 0.005606 USDC ([`0x3dee3f38…a288`](https://sepolia.basescan.org/tx/0x3dee3f382b60326f17bd78465e7b0ffdb282dd2892165253b74e1f96a731a288)).
- **Finding**: Pimlico ERC-20 paymaster mode consistently reverts `postOp` on EntryPoint v0.8/7702 (sponsored mode fine) — documented in docs/account-abstraction.md; v0.7 is the working path.
- Pimlico API key (user-provided, email signup, no phone/KYC) in git-ignored `.env`.
## 2026-07-14 — Phase 4: Amberboard built, contracts live, first CUBE minted

- **Research**: Farcaster-miniapp path is deprecated in Base docs — current flow is a standard web app + Base.dev registration (metadata + Builder Code = discoverability; no manifest).
- **Contracts deployed & verified on Base Sepolia** (5/5 tests green):
  - `AmberBoard` (cheer tally + leaderboard with AMBR balances): [`0x3723A33249C07CC5336aC778Da3fFab85a2d0647`](https://sepolia.basescan.org/address/0x3723A33249C07CC5336aC778Da3fFab85a2d0647)
  - `AmberCubes` (CUBE, ERC-721, mint gated by ≥3 cheers, fully on-chain SVG metadata): [`0xEa501373F771eAaC2F6d93230815c2B389426aD9`](https://sepolia.basescan.org/address/0xEa501373F771eAaC2F6d93230815c2B389426aD9)
- **Amberboard app** (`apps/amberboard`): Next.js 15 + wagmi + viem + coinbaseWallet; reads leaderboard/supply, writes cheer/mint; ERC-8021 Builder Code attribution wired at wagmi-config level via `ox/erc8021` (`NEXT_PUBLIC_BUILDER_CODE` env; note: ox ≥1.0 required — 0.6 lacks the erc8021 module). Serves `/.well-known/agent-card.json` for AmberMind. Production build + smoke test pass.
- **Board seeded**: 3 × `cheer()` ([1](https://sepolia.basescan.org/tx/0x2c3dbce6d3803e3bacf92c4cfabac086d306dec8aea72d18fd35d15c68575084), [2](https://sepolia.basescan.org/tx/0xf2bac54cc2a286bc7d770e7ae4940063a89c228940c76e264b952487f0b3ef77), [3](https://sepolia.basescan.org/tx/0x7566fbc82894f4dcd0a50bf457744cb166ec24b24db7871e0d6fe96450196b5e)) + **Amber Cube #1 minted** ([`0xa9a3f615…6ad1`](https://sepolia.basescan.org/tx/0xa9a3f615ec5e276d35ac532dc1795961e841225da685d105a055566ded6c6ad1)) to deployer.
- **Lesson**: sending a dependent tx (mint gated by prior txs' state) immediately after its prerequisites fails gas estimation against stale state — wait for confirmations before estimating, or pre-set gas.
- `docs/ecosystem.md` written (Builder Rewards / Builder Grants / Base Batches / OP Retro / CDP).
- Remaining (user-side): Builder Code from base.dev, `vercel login` + deploy, Base.dev registration.

## 2026-07-14 — Phase 4: Amberboard LIVE on Vercel + agent identity loop closed

- **Deployed**: [amberforge-board.vercel.app](https://amberforge-board.vercel.app) (project `amberforge-board`, production, aliased). Verified live: page, `base:app_id` verification meta tag, `/.well-known/agent-card.json`.
- Base.dev created the app entry (app_id `6a568090862b3c002cbb65af`); domain verification tag embedded pre-deploy — verify after deploy (chicken-and-egg resolved by deploying first).
- **AmberMind agentURI repointed** from data:base64 URI to the hosted card: [`0xf2e2b878…e203`](https://sepolia.basescan.org/tx/0xf2e2b878c9dd2c9ae3e9c1b01d48ccbbed3f5c896e9f74b3d398bfd2397fe203) — `tokenURI(8095)` now returns `https://amberforge-board.vercel.app/.well-known/agent-card.json`.
- Remaining: user clicks Verify on base.dev, supplies Builder Code (→ env + redeploy), completes app metadata registration.

## 2026-07-14 — Phase 4 wrap: Builder Code attribution PROVEN on-chain

- Builder Code `bc_mlikghsq` received; `ox` accepts the `bc_` format directly.
- **Bug caught by end-to-end test**: first user cheer from the app ([`0xb07c5174…50a6`](https://sepolia.basescan.org/tx/0xb07c51741acf71493c8264b398679fc6d1156e743fd5bd23f6efb1bdef7750a6)) had bare 4-byte calldata — wagmi 2.19 silently ignores config-level `dataSuffix`. Also fixed a wrong-network hazard: writes now pin `chainId: 84532` + UI switch-chain button (user's wallet had popped the tx on another chain).
- Fix: per-call `dataSuffix` (viem `writeContract` param). Second cheer ([`0x6c2c7640…62ec`](https://sepolia.basescan.org/tx/0x6c2c764092013db4ecda87df52a65abb9549a7dd664562c361693a55bd0d62ec)) ends with `62635f…8021×7` — **attribution verified in real calldata**. Deployer cheers: 5.
- `docs/reports/phase-3.md` + `docs/reports/phase-4.md` written. Program complete except user-side: Base.dev metadata finalization + deferred Base MCP sign-in.

## 2026-07-14 — Phase 2 COMPLETE (both directions) + Phase 3 started: AmberMind registered

- **Bridge leg 2 finalized**: devnet root caught up ~35 min after burn; `prove-message` ([`4iQUjcBk…`](https://explorer.solana.com/tx/4iQUjcBkLgvvtAk4ynV9AFzexXLULEq4ty7VGbx42qpPSPEXgAuBJLUTEguqq3PyzZ2RD5mrMwq6VxHeAWLtujmu?cluster=devnet)) then `relay-message` ([`rhMNSDFZ…`](https://explorer.solana.com/tx/rhMNSDFZsSqwoCYMF8gP26iWp1atThkMiAmSFt4MwAGAdgrLjNTAnPbUCCH1WAgKZvwfieAQxBsbyGi8QUgKsCa?cluster=devnet)) released 0.005 SOL from the vault. `docs/reports/phase-2.md` written.
- **Phase 3**: Base MCP installed into Claude Code (`claude mcp add --transport http --scope user base-mcp https://mcp.base.org`) — **auth deferred by user** (resume: `/mcp` → Authenticate with passkey).
- **AmberMind registered in ERC-8004 Identity Registry** (Base Sepolia `0x8004A818…BD9e`, same registry TrailKeeper used — agentId **8095** vs TrailKeeper's 8073):
  - `register(string)` tx: [`0xd9c6de91…0813`](https://sepolia.basescan.org/tx/0xd9c6de91d83a2f5cdbb3e941468aecbdfc62a36b7d91261bd55d221507320813)
  - `setAgentURI` (card with registration binding) tx: [`0xd4ab469f…108f`](https://sepolia.basescan.org/tx/0xd4ab469f473f48bdbda348a4c597d01db6cd4b50bbfadcf773231629d046108f)
  - Agent card embedded as `data:application/json;base64` URI — fully on-chain, zero hosting deps; upgrade to Amberboard URL planned in Phase 4.
- **x402 payment executed**: deployer paid $0.001 testnet USDC for TrailKeeper's paid `GET /report` (trailkeeper-three.vercel.app) via `@x402/fetch` — 402 → EIP-3009 signature → facilitator settled ([`0xbbdd4ded…612f`](https://sepolia.basescan.org/tx/0xbbdd4deda186b79d438b1b1a4d1ea22dc53248d0a6526a0f4e620ed6f9bd612f)), gasless for payer (facilitator `0xd407…` paid gas). Deployer USDC 20 → 19.999 (funded by user via faucet.circle.com). Client lives in `agents/ambermind/pay-report.mjs`.
- `docs/agents.md` written. Phase 3 nearly complete — only MCP sign-in + tool demo pending (user-deferred).

## 2026-07-14 — Phase 2: Base↔Solana bridge — leg 1 complete, leg 2 half-done

- Cloned official [base/bridge](https://github.com/base/bridge) repo (user-approved), bun 1.3.14 installed, TS client built. Env `testnet-prod` = Base Sepolia ↔ Solana Devnet.
- Solana Devnet wallet created CLI-side: `CcBvQTP5PSeqG9gtajJDbAT198edpL1cL4G9yNCJMCyd` (key written straight to `~/.config/solana/id.json`, never displayed; repo's own generate-keypair prints secrets to stdout — avoided). Funded 0.5 SOL via web faucet (RPC airdrop was rate-limited).
- **Solana→Base 0.01 SOL**: lock+relay tx [`5bFiL6q2…`](https://explorer.solana.com/tx/5bFiL6q2D8rNo3xqPcBZ8LVxBSUV7c2UZ7b86uHDXZFEiVrR924wrKewYtYEBrLvL8uktT9CjGapD9csy1UeD4m?cluster=devnet) → mint on Base [`0xb4d83583…`](https://sepolia.basescan.org/tx/0xb4d83583b9ec8fb924f99919b72ae7bcdc3a7b8c7dd3a8d19c7324dc1f347f5b). ~2 min end-to-end.
- **Base→Solana 0.005 SOL**: burn [`0xb424a044…`](https://sepolia.basescan.org/tx/0xb424a044f62e64d4d7f91b788ce1b8e5f1da8d7477b9989934f205fb2347a95e); prove/finalize blocked — devnet Merkle root oracle ~17 days behind (root at Base block 43.4M vs burn at 44.14M). Poller armed (5-min interval, 2h); tokens safe, provable later.
- **Lesson**: read the reference script before copying — its `/1e9` amount scaling is for ETH (18→9 decimals), would zero out a wSOL amount; for CrossChainERC20 `localAmount == remoteAmount`.
- Details in `docs/bridge.md`.

## 2026-07-14 — Phase 1 COMPLETE: BALT (B20) launched, tokens.md, phase report

- **B20 activation confirmed on-chain** (Sepolia): `isActivated(keccak256("base.b20_asset"))` → `true` (Beryl hardfork: Sepolia 2026-06-18, mainnet 2026-06-25).
- **BALT (Baltic) created** via B20 Factory precompile `0xB20f…0000`, Asset variant, salt `keccak256("amberforge-baltic")`:
  - Token (deterministic `0xb20…` address): [`0xb2000000000000000000001B288D711aC70Fa6c5`](https://sepolia.basescan.org/address/0xb2000000000000000000001B288D711aC70Fa6c5)
  - Create tx (initCalls: grant MINT_ROLE + cap 1,000,000): [`0x8bf6b798…9707`](https://sepolia.basescan.org/tx/0x8bf6b79811c0df344aceee25b951c284af87821e22d82766dccef2437aef9707)
  - Mint 250,000 BALT: [`0x494ea21f…333e`](https://sepolia.basescan.org/tx/0x494ea21feb0dd039f7ad010cd06681b940465a0c035da7d4d31043fc1487333e)
  - Verified state: name/symbol/decimals/cap/supply correct; `isB20` + `isB20Initialized` true.
- Params/initCalls encoded manually (`cast abi-encode` + `cast calldata`) after reading `base-std` sources (`B20FactoryLib`, `IB20Factory`); dry-run via `eth_call` before broadcast.
- `docs/tokens.md` written (raw vs launchpads vs B20); `docs/reports/phase-1.md` written — **all Phase 1 acceptance criteria met**.
- **Lesson**: `forge script` can't simulate Base-native precompiles locally (they don't exist in vanilla EVM simulation) — either use `base-forge`/`base-anvil` or skip scripts and go `cast send` with pre-encoded calldata.

## 2026-07-14 — Phase 1 kickoff: environment & repo setup

- **Environment check**: Foundry 1.7.1 (forge/cast), Node v24.18.0, git 2.43.0 — all present, nothing to install.
- **Deployer wallet**: `0x23ddAAd22d030b4a8d0BFbADeaCA11Ed9959D08C`
  - Base Sepolia balance: ~0.49 ETH (no faucet needed)
  - Base Mainnet balance: ~0.0013 ETH
- **Repo initialized** at `BASE2/amberforge` with `contracts/` (Foundry), `apps/`, `agents/`, `docs/`.
- **Dependencies**: forge-std, OpenZeppelin Contracts v5.6.1.
- **Config**: `foundry.toml` with `base-sepolia` (84532) and `base` (8453) RPC endpoints + BaseScan verification config; Etherscan API key reused from a previous project via git-ignored `.env`.
- **Lesson**: `.gitignore` written *before* any secret-bearing file exists, so a leak by accidental commit is impossible from the start.
## 2026-07-14 — Phase 1: AMBR deployed to Base Sepolia

- **Contract**: `AmberforgeToken` (AMBR) — OpenZeppelin ERC20 + ERC20Burnable, fixed supply 1,000,000 × 10^18 minted to deployer, no owner/minting.
- **Tests**: 9/9 green (`forge test`), incl. fuzz transfer (256 runs) and custom-error revert checks (`ERC20InsufficientBalance`, `ERC20InsufficientAllowance`).
- **Deployed to Base Sepolia (84532)**: [`0x85bFC3Cd262D8eFDA7d299BaBf446f054D938382`](https://sepolia.basescan.org/address/0x85bfc3cd262d8efda7d299babf446f054d938382)
  - Deploy tx: [`0x60eaf07d…dfc2c`](https://sepolia.basescan.org/tx/0x60eaf07d5d234cbdc8c53ca7ab4c4af84b5351541b393444914e9ad7cfddfc2c)
  - **Source verified on BaseScan** (`Pass - Verified`).
  - Blockscout verification submitted via v2 standard-input API ([Blockscout page](https://base-sepolia.blockscout.com/address/0x85bfc3cd262d8efda7d299babf446f054d938382)); forge's `--verifier blockscout` GUID polling returned `Unknown UID` — direct API submission used instead.
- **On-chain sanity check** via `cast call`: name/symbol/totalSupply/balanceOf all correct.
- **Lesson**: Etherscan API V1 per-chain endpoints (api-sepolia.basescan.org) are deprecated — foundry's default Etherscan V2 verifier with `chain = 84532` works with a plain `ETHERSCAN_API_KEY`.

## 2026-07-14 — Phase 1: AMBR full lifecycle on Base Sepolia

Tester wallet `0xF4e7A512a5Cfdeb827347011bF3535CC9720f1A6` (throwaway, key in git-ignored `.env`).

| # | Action | Tx |
|---|--------|----|
| 1 | Fund tester with 0.003 ETH (gas) | [`0xcbd3155b…c922`](https://sepolia.basescan.org/tx/0xcbd3155b62cf7197c50b88e3d6399a7370623081b5e17273ce62be922373c922) |
| 2 | `transfer` deployer → tester, 1,000 AMBR | [`0x598dd82d…4078`](https://sepolia.basescan.org/tx/0x598dd82d5b5cbe30bea0b1a35ad98a89b73ab17e4f155c3bdf4c616267d84078) |
| 3 | `approve` tester for 500 AMBR | [`0x1230f4fc…c20e`](https://sepolia.basescan.org/tx/0x1230f4fca2814091ab599d750c1f47daccb2c717684e5a8c6635c123923ac20e) |
| 4 | `transferFrom` (signed by tester) deployer → tester, 200 AMBR | [`0x1bf06ab7…e4be`](https://sepolia.basescan.org/tx/0x1bf06ab7f977d6f354426f780d5f9014dca9cf175b50b4b2fd97723ddca8e4be) |
| 5 | `burn` 1,000 AMBR by deployer | [`0xb6642736…d7f3`](https://sepolia.basescan.org/tx/0xb66427363aedc6d01db4f5034d836cd5eac698679443889945ab067401a2d7f3) |

Final state (all consistent): totalSupply 999,000 AMBR; deployer 997,800; tester 1,200; remaining allowance 300.

- **Lesson (nonce)**: the public `sepolia.base.org` RPC is load-balanced — `getTransactionCount` can lag one tx behind, causing `nonce too low` on rapid sequential sends. Fix: fetch the nonce once (`cast nonce`) and pass `--nonce` explicitly, incrementing locally.
- **Loose end**: Blockscout (base-sepolia.blockscout.com) hasn't picked up verification yet; source is verified on BaseScan and Sourcify, Blockscout usually auto-imports from Sourcify later.

- **Deployer key imported** into Foundry encrypted keystore `amberforge-deployer` (address verified: `0x23dd…D08C`). Keystore password is machine-generated, stored in `~/.foundry/keystores/amberforge-deployer.password` (chmod 600, outside the repo), enabling non-interactive signing via `--password-file`. Trade-off accepted for the testnet phase: anyone with local disk access could sign; before mainnet operations we will re-import with a user-memorized password.
