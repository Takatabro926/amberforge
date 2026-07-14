# Amberforge Journal

Running log of every meaningful action: date, action, tx hash, lessons learned.

---

## 2026-07-14 — Phase 1 kickoff: environment & repo setup

- **Environment check**: Foundry 1.7.1 (forge/cast), Node v24.18.0, git 2.43.0 — all present, nothing to install.
- **Deployer wallet**: `0x23ddAAd22d030b4a8d0BFbADeaCA11Ed9959D08C`
  - Base Sepolia balance: ~0.49 ETH (no faucet needed)
  - Base Mainnet balance: ~0.0013 ETH
- **Repo initialized** at `BASE2/amberforge` with `contracts/` (Foundry), `apps/`, `agents/`, `docs/`.
- **Dependencies**: forge-std, OpenZeppelin Contracts v5.6.1.
- **Config**: `foundry.toml` with `base-sepolia` (84532) and `base` (8453) RPC endpoints + BaseScan verification config; Etherscan API key reused from a previous project via git-ignored `.env`.
- **Lesson**: `.gitignore` written *before* any secret-bearing file exists, so a leak by accidental commit is impossible from the start.
- **Deployer key imported** into Foundry encrypted keystore `amberforge-deployer` (address verified: `0x23dd…D08C`). Keystore password is machine-generated, stored in `~/.foundry/keystores/amberforge-deployer.password` (chmod 600, outside the repo), enabling non-interactive signing via `--password-file`. Trade-off accepted for the testnet phase: anyone with local disk access could sign; before mainnet operations we will re-import with a user-memorized password.
