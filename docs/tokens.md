# Token Launch Routes on Base

Three ways to put a token on Base, from raw to native, executed (or evaluated) in Phase 1.

## Route 1 — Raw ERC-20 deploy (done: AMBR)

Write the contract yourself (OpenZeppelin base), test with Foundry, deploy bytecode, verify source.

- **Token**: Amberforge Token (AMBR), fixed supply 1,000,000, 18 decimals, burnable, no owner.
- **Address (Base Sepolia)**: [`0x85bFC3Cd262D8eFDA7d299BaBf446f054D938382`](https://sepolia.basescan.org/address/0x85bfc3cd262d8efda7d299babf446f054d938382) — verified on BaseScan + Sourcify.
- **Cost**: gas only (~0.0000x ETH on Base). No platform fees, no revenue share.
- **Ownership**: you own everything — and are responsible for everything (bugs included).
- **Liquidity**: none out of the box; you create and fund a DEX pool yourself.
- **Best for**: learning, protocol tokens, anything needing custom logic.

## Route 2 — Launchpads (discovery only, no deploy)

Managed platforms that deploy a standard token for you and bundle liquidity + distribution.
What you pay for convenience is fees and reduced control.

| Platform | Model | Fees / revenue | Liquidity | Ownership |
|----------|-------|----------------|-----------|-----------|
| [Flaunch](https://docs.flaunch.gg/) | Uniswap v4 launchpad; 30-min fixed-price "fair launch" window, then bonds to DEX | Flaunching fee ≈ 0.1% of chosen market cap; creator claims up to 1% of each swap in ETH; dev picks revenue split (rest to token-holder treasury) | Reserved supply auto-added to Uniswap v4 pool at bond; LP tokens burned (anti-rug) | Revenue stream tokenized as a transferable NFT |
| [Clawnch](https://www.xt.com/en/blog/post/clawnch-explained-how-agent-only-token-launches-work-on-base) | **Agent-only** launches (AI agents deploy, not humans); moving to Bankr as issuance engine | 80% of trading fees to the issuing agent | Pool created automatically at launch | Agent identity controls the launch |
| [Bankr](https://docs.bankr.bot/token-launching/overview/) | Bot/chat-driven launches (Farcaster/X); historically built on Clanker (60/40 split + protocol fees), now independent | Platform keeps a protocol cut; creator gets a fee share | Automatic pool at launch | Custody via Bankr wallet infrastructure |
| [Zora](https://docs.base.org/get-started/launch-token) | Social-first: every post is a coin (1B supply, 10M to creator) | 1% of trading fees shared to creator | Automatic Uniswap integration | Platform-standard contract |
| [Clanker](https://docs.base.org/get-started/launch-token) | AI agent deploys on Farcaster tag | Protocol fee on swaps | Automatic | Platform-standard contract |

**Trade-offs vs raw deploy**: minutes instead of hours and instant liquidity/distribution,
but platform fee exposure, a standard (non-customizable) contract, and shared economics.
A raw deploy has zero platform fees but you must bootstrap liquidity and users yourself.

## Route 3 — B20, Base-native standard (done: BALT)

B20 (shipped in the **Beryl hardfork**: Sepolia 2026-06-18, mainnet 2026-06-25) is a token
implemented as a **Rust precompile in the chain node itself** — no EVM bytecode is deployed.
You call the singleton factory and the chain materializes a token at a deterministic address.

- **Token**: Baltic (BALT), Asset variant, 18 decimals, supply cap 1,000,000, minted 250,000.
- **Address (Base Sepolia)**: [`0xb2000000000000000000001B288D711aC70Fa6c5`](https://sepolia.basescan.org/address/0xb2000000000000000000001B288D711aC70Fa6c5)
- Create tx: [`0x8bf6b798…9707`](https://sepolia.basescan.org/tx/0x8bf6b79811c0df344aceee25b951c284af87821e22d82766dccef2437aef9707)
- Mint tx: [`0x494ea21f…333e`](https://sepolia.basescan.org/tx/0x494ea21feb0dd039f7ad010cd06681b940465a0c035da7d4d31043fc1487333e)

### How the launch works

1. Factory precompile lives at `0xB20f0000…0000` on every network; feature flags checked via
   Activation Registry `0x84530000…0001` (`isActivated(keccak256("base.b20_asset"))` → `true` on Sepolia).
2. `createB20(variant, salt, params, initCalls)`:
   - `variant`: `ASSET` (decimals 6–18, mint/burn, multiplier) or `STABLECOIN` (fixed 6 decimals, ISO currency code);
   - `params`: ABI-encoded create struct with a leading version byte (v1) — for BALT:
     `(1, "Baltic", "BALT", initialAdmin, 18)`;
   - `initCalls`: setup executed atomically inside creation (we granted `MINT_ROLE` to the
     deployer and set `updateSupplyCap(1_000_000e18)`);
   - address is deterministic from `(variant, sender, salt)` and carries the `0xb20…` prefix
     with the variant encoded in the address bytes.
3. Later minting is a normal call: `mint(address,uint256)`, gated by `MINT_ROLE`.

We encoded the calls manually with `cast abi-encode`/`cast calldata` (see
`base-std`'s `B20FactoryLib` for the canonical Solidity encoders) and dry-ran via `eth_call`
before broadcasting.

### ERC-20 vs B20

| | ERC-20 (AMBR) | B20 (BALT) |
|---|---|---|
| Implementation | Your EVM bytecode | Rust precompile in the node |
| Deploy | `forge create` (bytecode tx) | One call to factory `0xB20f…` |
| Address | From deployer nonce / CREATE2 | Deterministic, `0xb20…` prefix, variant-encoded |
| Gas | Standard contract execution | Cheaper, higher-throughput transfers |
| Interface | ERC-20 | **Superset of ERC-20** — wallets/DEXes work unchanged |
| Extras | Whatever you code | Built-in: roles (mint/burn/pause/metadata/operator), supply cap, memos, policy gating (Policy Registry `0x84530000…0002`), ERC-2612 permit |
| Supply model | Fixed at deploy (our choice) | Cap + role-gated minting (changeable up to cap) |
| Source verification | Needed (BaseScan/Sourcify) | N/A — implementation is the chain itself |
| Custom logic | Unlimited | Not possible — parameterization only |
| Portability | Any EVM chain | **Base-only** |
| Best for | Custom mechanics, multi-chain | Stablecoins, RWA, long-tail tokens wanting cheap native rails |

**Key mental model**: with ERC-20 you ship code; with B20 you fill in a form the chain executes
natively. You trade unlimited customization for speed, cost, and built-in compliance tooling.
