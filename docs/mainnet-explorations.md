# Mainnet Explorations — first-time transaction types (2026-07-15)

One session, seven mechanisms the project had never touched before, all on Base
Mainnet, each costing a fraction of a cent. What each one teaches is the point;
the txs are the receipts.

## 1. WETH wrap / unwrap (predeploy `0x4200…0006`)

ETH itself is not an ERC-20; WETH is the canonical adapter every DEX and DeFi
protocol composes against. On OP-Stack chains it is a **predeploy**, not a
third-party contract.

- `deposit()` 0.0002 ETH → [`0xa0082af5…7dca`](https://basescan.org/tx/0xa0082af5a056146fbbcb6a58e9362c30f47c5ce4294c42be0ee88359b24c7dca)
- `withdraw()` 0.0003 WETH → [`0xa976ff34…d969`](https://basescan.org/tx/0xa976ff3417ea875b6f6959999e2775a8aa4b713c014bf26b23aa2c044609d969)
  (0.0003 because Multicall3 below added 0.0001)

## 2. Multicall3 atomic write batch (`0xcA11…CA11`)

Two state changes in one transaction via `aggregate3Value`: `deposit()` 0.0001 ETH
into WETH **and** `transfer` the resulting WETH out to the deployer — atomic,
all-or-nothing: [`0xc5357076…b4ae`](https://basescan.org/tx/0xc53570763e60c4d156461f09ff1416699c038a6a858086e9c29a7e65b12eb4ae)
(2 events: Deposit + Transfer).

**Caveat learned by design**: inside the batch `msg.sender` is Multicall3, not the
EOA — so this only works for calls where sender identity doesn't matter (or where
value/tokens flow through the multicall contract, as here).

## 3. Deterministic CREATE2 deploy — AmberAnchor

`contracts/src/AmberAnchor.sol` (an on-chain pointer to the repo, app, and agent
ids) deployed **through the canonical CREATE2 factory** `0x4e59…956C` with salt
`keccak256("amberforge-anchor")`:

- Address (pure function of factory+salt+initcode, same on any EVM chain):
  [`0x7559EaCa8Eaa1705B5a7C9b25Fd508A41326E6A1`](https://basescan.org/address/0x7559EaCa8Eaa1705B5a7C9b25Fd508A41326E6A1) — **verified**
- Deploy tx: [`0x62e06c41…9d83`](https://basescan.org/tx/0x62e06c41c5d3c44daea47b92e82e6fc3b78c24a6ff1e1ec41d470c5e6ccb9d83)

Same discovery pattern B20 uses under the hood, done by hand. **Lesson**: BaseScan
verification of factory-deployed contracts fails if attempted before the internal
creation tx is indexed — the identical command passed on retry a minute later.

## 4. Basename text records (`evmpirate.base.eth`)

Onchain identity now points at the builder's public surfaces — one tx via the
**resolver's own `multicall`** (two `setText` in one):
[`0x6a566fb1…71a0`](https://basescan.org/tx/0x6a566fb1a36a81ea8c2d40d14ec087b8d0baf42ae6db114901b5daa31df471a0)

- `com.github` → `Takatabro926`
- `url` → `https://amberforge-board.vercel.app`

## 5. EAS — schema + attestation (predeploys `0x…0020` / `0x…0021`)

The Ethereum Attestation Service is an OP-Stack predeploy (the same rail Coinbase
onchain verifications ride). Registered a schema and attested a verifiable claim
about AmberMind's autonomous run:

- Schema `string action,bytes32 txRef`, UID `0xa50f4253…6f9d`:
  [`0xd0d105e5…0e7f`](https://basescan.org/tx/0xd0d105e5aa7fa01c14f463102db5db6008492be1dca6aa70fe46fe78b1f10e7f)
- Attestation `("autonomous-sentinel-run", 0x4111fdce…3142)`, UID
  [`0x7b8d23cb…d9f2`](https://base.easscan.org/attestation/view/0x7b8d23cbe384df5f02ef23ede95b6d8744c33ed4064fa0e40bbc3be8dd02d9f2):
  [`0x53b3f00a…193a`](https://basescan.org/tx/0x53b3f00a73457d6f1308d45f5e55c52394cba7e46b38414f350e52d36bd4193a)

The agent's action is now a third-party-readable onchain claim, not just a journal line.

## 6. First ERC-721 *transfer* (mints only, until now)

Cube #1 `safeTransferFrom` deployer → helper wallet:
[`0xbf147fec…231a`](https://basescan.org/tx/0xbf147fec072b4409ba695fb65d5cc26fa78f4e27c008a53fb7169471fc28231a)
— `ownerOf(1)` = `0x4D0c…fB5a` confirmed.

## 7. EIP-2612 `permit` on BALT — gasless approval

B20 tokens ship ERC-5267 + EIP-2612 (`eip712Domain()` → name "Baltic", version "1").
The deployer signed the Permit typed data **offline** (keystore, no tx); the helper
submitted it and paid the gas:
[`0x08b5068d…3ffb`](https://basescan.org/tx/0x08b5068d99352ac2382c66d5a9d56540ad61ae5a95275c9a895fae8a20903ffb)
→ allowance deployer→helper = 50 BALT, `nonces(deployer)` 0→1. This is the same
signature-instead-of-approval-tx idea x402/EIP-3009 uses, in its ERC-20-native form.

## Recurring lesson of the day

Three separate times a `view` read **immediately after** a confirmed tx returned
pre-tx state (cheers 7→"7", allowance "0", earlier the Sepolia nonce): the public
load-balanced RPC serves reads from nodes that momentarily lag the head. Never
alarm on a stale read right after a receipt — re-read, or pin a node.
