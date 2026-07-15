// Flashblocks probe on Base mainnet public RPC (HTTP only — no WS subscriptions).
// Sends a 0-ETH self-transfer, then polls three signals every 50 ms:
//   * base_transactionStatus (Flashblocks-specific)
//   * eth_getTransactionCount with the "pending" tag (preconfirmed state, ~200ms batches)
//   * eth_getTransactionReceipt (canonical 2s block inclusion)
// Reports the latency of each signal relative to send time.
//
// Usage: PRIVATE_KEY=0x... node flashblocks-probe.mjs

import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const RPC = "https://mainnet.base.org";
const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const publicClient = createPublicClient({ chain: base, transport: http(RPC) });
const walletClient = createWalletClient({ account, chain: base, transport: http(RPC) });

let rpcId = 1;
async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: rpcId++, method, params }),
  });
  return res.json();
}

const nonceBefore = await publicClient.getTransactionCount({ address: account.address });
console.log("nonce (latest):", nonceBefore);

// sign locally first so the timer starts at raw-send dispatch, not after prep
const request = await walletClient.prepareTransactionRequest({
  to: account.address,
  value: 0n,
  nonce: nonceBefore,
});
const serialized = await walletClient.signTransaction(request);
const tSent = performance.now();
const sendPromise = rpc("eth_sendRawTransaction", [serialized]);
sendPromise.then((r) =>
  console.log(`sendRawTransaction ack @ ${(performance.now() - tSent).toFixed(0)}ms`, r.error ?? ""),
);
const hash = (await import("viem")).keccak256(serialized);
console.log("tx hash (local):", hash);

const seen = { pendingNonce: null, receipt: null };
let lastStatus = "";
while (!seen.receipt) {
  const t = () => `${(performance.now() - tSent).toFixed(0)}ms`;
  const [st, pn, rc] = await Promise.all([
    rpc("base_transactionStatus", [hash]),
    rpc("eth_getTransactionCount", [account.address, "pending"]),
    rpc("eth_getTransactionReceipt", [hash]),
  ]);
  const status = JSON.stringify(st.result ?? st.error);
  if (status !== lastStatus) {
    lastStatus = status;
    console.log(`base_transactionStatus -> ${status} @ ${t()}`);
  }
  if (!seen.pendingNonce && parseInt(pn.result, 16) > nonceBefore) {
    seen.pendingNonce = true;
    console.log(`pending-tag nonce bump (preconfirmed state) @ ${t()}`);
  }
  if (rc.result) {
    seen.receipt = true;
    console.log(`receipt (block ${parseInt(rc.result.blockNumber, 16)}) @ ${t()}`);
  }
  await new Promise((r) => setTimeout(r, 50));
}
