// AmberMind x402 client: pays for a protected API resource with testnet USDC
// on Base Sepolia using the x402 protocol (HTTP 402 challenge -> EIP-3009
// authorization signature -> facilitator settles on-chain, gasless for payer).
//
// Usage: PRIVATE_KEY=0x... node pay-report.mjs [url]

import { x402Client, wrapFetchWithPayment, decodePaymentResponseHeader } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const url = process.argv[2] ?? "https://trailkeeper-three.vercel.app/report";
const signer = privateKeyToAccount(process.env.PRIVATE_KEY);
console.log("Paying from:", signer.address);

const client = new x402Client();
registerExactEvmScheme(client, { signer });
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

const res = await fetchWithPayment(url, { method: "GET" });
console.log("HTTP", res.status);

const paymentHeader = res.headers.get("payment-response") ?? res.headers.get("x-payment-response");
if (paymentHeader) {
  const decoded = decodePaymentResponseHeader(paymentHeader);
  console.log("Payment response:", JSON.stringify(decoded, null, 2));
}

const body = await res.json();
console.log("Body:", JSON.stringify(body).slice(0, 400));
