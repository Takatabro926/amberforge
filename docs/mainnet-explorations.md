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

## 8. First DEX swap — ETH → USDC on Uniswap V3 (2026-07-15, session 2)

`exactInputSingle` on **SwapRouter02** `0x2626664c…e481` (identity triple-checked:
BaseScan name, `WETH9()`, `factory()` + pool existence), paying with raw ETH via
`msg.value` (the router wraps internally). 0.0005 ETH → **0.938325 USDC** on the
0.05% WETH/USDC pool; min-out derived from the Chainlink price (0.92), dry-run via
`eth_call` said 0.938093 — execution landed slightly better:
[`0x992263a9…1b68`](https://basescan.org/tx/0x992263a9ad1dfd2724859173511a43bc462bd6acf1da7a4e8ad31fd4514f1b68)

The deployer now holds mainnet USDC — which unlocked:

## 9. First mainnet x402 payment — via the Bazaar

Discovered live sellers through the **x402 Bazaar** discovery API
(`api.cdp.coinbase.com/platform/v2/x402/discovery/resources`, 138 Base-mainnet
listings) and paid the cheapest useful one: **x402 Trust Oracle**
(`api.x402oracle.com/v1/trade-check`, $0.002/call — a reputation check *about
other x402 resources*: liveness, price drift, payTo stability).

- Settlement (EIP-3009 `transferWithAuthorization`, gasless for payer):
  [`0xd8f10d01…5a21`](https://basescan.org/tx/0xd8f10d0173d25db1e532d3f907889669d3bbe4527a8fba123828bc81e3e15a21)
  — 0.002 USDC deployer → oracle's `payTo`.
- **Interop lesson**: the wild is mid-migration on the payment header name.
  `@x402` v2.18 emits `PAYMENT-SIGNATURE`; this seller (and others) still reads
  `X-PAYMENT`. Failed attempts cost nothing (signature ≠ settlement — money moves
  only when the seller's facilitator executes the authorization). Fix shipped in
  `agents/ambermind/pay-x402.mjs`: send the same encoded payload under **both**
  names.
- Meta-proof: asked the oracle to trade-check **its own endpoint** — it reported
  100% success rate and a stable payTo. Vouched for itself; the USDC transfer
  agrees.

## 10. Approval-family completions (2026-07-15, session 3)

Three mechanisms from the ERC-20/721 approval family the project had documented
but never exercised on mainnet:

- **`burnFrom`** (ERC20Burnable's second path): deployer approved 100 AMBR
  ([`0x2a8ba1f9…1d76`](https://basescan.org/tx/0x2a8ba1f91d88835ade68a50b24b38d4cdae99aaf40b3f1e84c05cbe8cca91d76)),
  helper burned 50 **from the deployer's balance** — supply 998,950 now:
  [`0xc498da7f…c7b8`](https://basescan.org/tx/0xc498da7f590609c9fe3fb505289aced7dc2cf626e2f85c10dc2d8d591049c7b8)
- **Spending a permit allowance**: yesterday's offline-signed permit (50 BALT)
  got used for real — helper `transferFrom` 25 BALT, allowance 50 → 25:
  [`0x9805119d…a4e7`](https://basescan.org/tx/0x9805119dfa21e8b0316c7d4a5712798f4d6dbae95bdac4d65425b8c7e32aa4e7)
- **ERC-721 `approve` + third-party `transferFrom`**: helper approved the
  deployer for Cube #1 ([`0x683aed7a…d1da`](https://basescan.org/tx/0x683aed7a9403898d5421db38f2cd44a6324250d1d19b88cdf9424a3cc42cd1da)),
  deployer pulled it back **as approved spender, not owner**:
  [`0x0694343c…5879`](https://basescan.org/tx/0x0694343cfdd691cd82cc8c83c19d44dd04a98edc74af907943d1bd6e58d55879)

## 11. EIP-7702 on mainnet — sponsored delegation + native EOA batching

The Sepolia AA demo, graduated to production. Implementation address recovered
**from the Sepolia tester's own delegation designator** (`0xef0100…`), then
confirmed byte-for-byte as verified `Simple7702Account` on mainnet.

- **Type-4 delegation tx, sponsored**: the helper signed the EIP-7702
  authorization offline; the **deployer** sent the transaction and paid its gas
  (auth nonce = helper's account nonce, consumed on execution — nonce 5 → 6):
  [`0xfe53f357…fce4`](https://basescan.org/tx/0xfe53f357c8e488e9f67da2936ce036a99eaf708603c9ad56ade25aad550ffce4)
  — helper's code is now `0xef0100e6cae83b…555b`; it is still an EOA.
- **Atomic batch from an EOA**: helper called `executeBatch` **on itself**
  (`msg.sender == address(this)` satisfies Simple7702Account's guard):
  `cheer()` on AmberBoard **and** a 1 AMBR transfer in one transaction:
  [`0xf3bde33f…2c02`](https://basescan.org/tx/0xf3bde33fd59ea7476140fcb062da20e81c9a4632e684ef9307740312a38d2c02)

This is the primitive smart wallets are converging on: an EOA that can batch,
without deploying a contract account or changing address.

## Recurring lesson of the day

Four separate times a read **immediately after** a confirmed tx returned
pre-tx state (cheers 7→"7", allowance "0", the 7702 delegation code "0x", earlier
the Sepolia nonce): the public load-balanced RPC serves reads from nodes that
momentarily lag the head. Never alarm on a stale read right after a receipt —
re-read, or pin a node.
