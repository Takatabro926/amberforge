# Base Ecosystem Map — Funding Paths for Amberforge

Current as of 2026-07-14. Canonical source: [docs.base.org/get-started/get-funded](https://docs.base.org/get-started/get-funded).

## Programs

| Program | What it funds | Amount | Requirements | Apply |
|---------|---------------|--------|--------------|-------|
| **Builder Rewards** (weekly) | Prototypes, experiments, early-stage — "build anything on Base" | 2 ETH distributed weekly | No minimum project size; share work publicly (social); Builder Score profile | [builderscore.xyz](https://www.builderscore.xyz/) |
| **Builder Grants** (retroactive) | Shipped projects with tangible ecosystem value: apps on mainnet, dev tooling, education content | 1–5 ETH | Working code, preferably functional product on **Base mainnet**; nomination via public form ([details](https://paragraph.com/@grants.base.eth/calling-based-builders)) | [gitcoin.co/apps/base-builder-grants](https://gitcoin.co/apps/base-builder-grants) |
| **Base Batches 2026** | Founder program: 8-week virtual incubator → Demo Day (SF) | Top 15 teams: $10k grant; ≥3 teams: $50k investment from Base Ecosystem Fund | **Startup track**: pre-product/pre-seed, <$250k raised; **Student track**: undergrads only | [basebatches.xyz](https://www.basebatches.xyz/) |
| **OP Retro Funding** | Open-source public goods: libraries, frameworks, ecosystem infra | Varies per round | Open source, documented impact/adoption metrics | [atlas.optimism.io](https://atlas.optimism.io/) |
| **CDP Builder Grants** (periodic) | Projects using Coinbase Developer Platform tooling (e.g. [Summer 2025 round, $30k pool](https://www.coinbase.com/developer-platform/discover/launches/summer-grants-2025)) | Varies per round | Uses CDP products; round-specific | CDP site / launches page |

## Fit for Amberforge (and this builder)

1. **Builder Rewards — apply now.** Weekly, prototype-friendly, no mainnet requirement.
   Amberforge is exactly the profile: verified contracts (AMBR, AmberBoard, AmberCubes),
   a B20 launch, a bridged round trip, an ERC-8004 agent, and a live app. Requires building
   a Builder Score profile and sharing progress publicly.
2. **Builder Grants — after Amberboard reaches mainnet.** Retroactive, 1–5 ETH; the previous
   program's mainnet work (TRAIL badges, DustSweep, TrailKeeper agent with paid x402 endpoint)
   plus Amberforge would make a credible nomination portfolio.
3. **Base Batches — only if this becomes a startup.** The Startup track fits a pre-product
   team, but expects founder commitment, not a learning project.
4. **OP Retro / CDP** — watchlist; relevant if any Amberforge tooling is open-sourced as a
   reusable public good or if CDP products get adopted.

## Discoverability prerequisites (done/in progress in Phase 4)

- App registered on [base.dev](https://base.dev) with metadata (name, icon, tagline,
  screenshots, category, primary URL).
- **Builder Code** assigned and wired as ERC-8021 `dataSuffix` — attribution is what links
  onchain activity to the builder for rewards programs.
