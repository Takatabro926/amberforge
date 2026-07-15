// AmberMind x402 client, mainnet-ready. Handles the header-name drift in the
// wild: @x402 v2.18 emits PAYMENT-SIGNATURE, but many live sellers still expect
// the older X-PAYMENT name — we send the same encoded payload under both, and
// the server reads whichever it implements.
//
// Discovered via the x402 Bazaar (api.cdp.coinbase.com/platform/v2/x402/discovery).
//
// Usage: PRIVATE_KEY=0x... node pay-x402.mjs <url>

import { x402Client, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const url = process.argv[2];
if (!url) {
  console.error("usage: PRIVATE_KEY=0x... node pay-x402.mjs <url>");
  process.exit(1);
}

const signer = privateKeyToAccount(process.env.PRIVATE_KEY);
console.log("Paying from:", signer.address);

const client = new x402Client();
registerExactEvmScheme(client, { signer });
const http = new x402HTTPClient(client);

const challenge = await fetch(url);
if (challenge.status !== 402) {
  console.log("No payment required, HTTP", challenge.status);
  console.log((await challenge.text()).slice(0, 400));
  process.exit(0);
}

const pr = http.getPaymentRequiredResponse((n) => challenge.headers.get(n), await challenge.json());
const accepted = pr.accepts?.[0];
console.log(`Challenge: ${accepted?.maxAmountRequired} (base units) on ${accepted?.network} to ${accepted?.payTo}`);

const payload = await client.createPaymentPayload(pr);
const sig = http.encodePaymentSignatureHeader(payload)["PAYMENT-SIGNATURE"];

const paid = await fetch(url, { headers: { "PAYMENT-SIGNATURE": sig, "X-PAYMENT": sig } });
console.log("HTTP", paid.status);

const settle = paid.headers.get("x-payment-response") ?? paid.headers.get("payment-response");
if (settle) {
  try {
    console.log("Settlement:", Buffer.from(settle, "base64").toString());
  } catch {
    console.log("Settlement (raw):", settle.slice(0, 300));
  }
} else {
  console.log("No settlement header — verify the EIP-3009 transfer on-chain (USDC transferWithAuthorization).");
}
console.log("Body:", (await paid.text()).slice(0, 500));
