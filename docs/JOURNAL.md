# Amberforge Journal

Running log of every meaningful action: date, action, tx hash, lessons learned.

---

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
