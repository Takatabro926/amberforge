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
## 2026-07-14 — Phase 1: AMBR deployed to Base Sepolia

- **Contract**: `AmberforgeToken` (AMBR) — OpenZeppelin ERC20 + ERC20Burnable, fixed supply 1,000,000 × 10^18 minted to deployer, no owner/minting.
- **Tests**: 9/9 green (`forge test`), incl. fuzz transfer (256 runs) and custom-error revert checks (`ERC20InsufficientBalance`, `ERC20InsufficientAllowance`).
- **Deployed to Base Sepolia (84532)**: [`0x85bFC3Cd262D8eFDA7d299BaBf446f054D938382`](https://sepolia.basescan.org/address/0x85bfc3cd262d8efda7d299babf446f054d938382)
  - Deploy tx: [`0x60eaf07d…dfc2c`](https://sepolia.basescan.org/tx/0x60eaf07d5d234cbdc8c53ca7ab4c4af84b5351541b393444914e9ad7cfddfc2c)
  - **Source verified on BaseScan** (`Pass - Verified`).
  - Blockscout verification submitted via v2 standard-input API ([Blockscout page](https://base-sepolia.blockscout.com/address/0x85bfc3cd262d8efda7d299babf446f054d938382)); forge's `--verifier blockscout` GUID polling returned `Unknown UID` — direct API submission used instead.
- **On-chain sanity check** via `cast call`: name/symbol/totalSupply/balanceOf all correct.
- **Lesson**: Etherscan API V1 per-chain endpoints (api-sepolia.basescan.org) are deprecated — foundry's default Etherscan V2 verifier with `chain = 84532` works with a plain `ETHERSCAN_API_KEY`.

- **Deployer key imported** into Foundry encrypted keystore `amberforge-deployer` (address verified: `0x23dd…D08C`). Keystore password is machine-generated, stored in `~/.foundry/keystores/amberforge-deployer.password` (chmod 600, outside the repo), enabling non-interactive signing via `--password-file`. Trade-off accepted for the testnet phase: anyone with local disk access could sign; before mainnet operations we will re-import with a user-memorized password.
