// Pays AmberMind's own /api/insight endpoint — the seller-side mirror of
// pay-x402.mjs, which only ever paid *other* agents. Useful to smoke-test the
// seller after a deploy, from any wallet with the network's USDC.
//
// Usage: PRIVATE_KEY=0x... node pay-insight.mjs <url>

import { x402Client, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const url = process.argv[2];
if (!url) {
  console.error("usage: PRIVATE_KEY=0x... node pay-insight.mjs <url>");
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
console.log(`Challenge: ${accepted?.amount} atomic units of ${accepted?.asset} on ${accepted?.network} -> ${accepted?.payTo}`);

const payload = await client.createPaymentPayload(pr);
const sig = http.encodePaymentSignatureHeader(payload)["PAYMENT-SIGNATURE"];

const paid = await fetch(url, { headers: { "PAYMENT-SIGNATURE": sig } });
console.log("HTTP", paid.status);
console.log("Body:", await paid.text());

const settle = paid.headers.get("payment-response") ?? paid.headers.get("x-payment-response");
if (settle) {
  console.log("Settlement:", Buffer.from(settle, "base64").toString());
} else {
  console.log("No settlement header returned.");
}
