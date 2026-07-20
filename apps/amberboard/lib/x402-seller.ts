import { x402Version } from "@x402/core";
import { HTTPFacilitatorClient } from "@x402/core/server";
import {
  decodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
} from "@x402/core/http";
import type { Network, PaymentPayload, PaymentRequired, PaymentRequirements } from "@x402/core/types";

/**
 * AmberMind's own x402 seller config — the mirror image of pay-x402.mjs /
 * pay-report.mjs, which only ever paid other agents. Testnet only for now:
 * a mainnet-settling facilitator needs CDP API keys we don't have yet (same
 * gap already open for TrailKeeper on the evmpirate/0x6 side — unrelated
 * accounts, tracked independently here).
 *
 * x402Version matters here: the client's registered exact-evm scheme has a
 * V1 handler (short slugs like "base-sepolia") and a V2 handler (CAIP-2
 * "eip155:*"). Advertising V2-shaped requirements (this repo's `amount`
 * field, not V1's `maxAmountRequired`) but tagging the response
 * `x402Version: 1` made the client pick the V1 handler and crash on a
 * missing field — found by pointing pay-insight.mjs at a live server and
 * reading the mismatch in its own error output. Staying on x402Version 2
 * (imported from `@x402/core`, not hardcoded) keeps the shape and the
 * version tag in sync.
 */
export const X402_NETWORK = (process.env.X402_NETWORK ?? "eip155:84532") as Network;
export const X402_ASSET =
  X402_NETWORK === "eip155:8453"
    ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" // USDC, Base mainnet
    : "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // USDC, Base Sepolia
export const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator";
// $0.001 at 6-decimal USDC.
export const X402_AMOUNT_ATOMIC = "1000";

const PAY_TO = process.env.HELPER_ADDRESS;

export function insightPaymentRequirements(resourceUrl: string): PaymentRequirements {
  if (!PAY_TO) throw new Error("HELPER_ADDRESS env var not set — who should /insight pay out to?");
  return {
    scheme: "exact",
    network: X402_NETWORK,
    asset: X402_ASSET,
    amount: X402_AMOUNT_ATOMIC,
    payTo: PAY_TO,
    maxTimeoutSeconds: 300,
    extra: { name: "USDC", version: "2" },
  };
}

export function paymentRequiredResponse(resourceUrl: string): { body: PaymentRequired; header: string } {
  const requirements = insightPaymentRequirements(resourceUrl);
  const body: PaymentRequired = {
    x402Version,
    resource: {
      url: resourceUrl,
      description: "AmberMind on-chain insight: live AmberBoard/AmberCubes summary",
      mimeType: "application/json",
    },
    accepts: [requirements],
  };
  return { body, header: encodePaymentRequiredHeader(body) };
}

/** Ecosystem header-name drift, mirrored from pay-x402.mjs on the client side:
 *  @x402 v2.x clients send PAYMENT-SIGNATURE, some send the older X-PAYMENT. */
export function readPaymentHeader(getHeader: (name: string) => string | null): string | null {
  return getHeader("payment-signature") ?? getHeader("PAYMENT-SIGNATURE") ?? getHeader("x-payment") ?? getHeader("X-PAYMENT");
}

const facilitator = new HTTPFacilitatorClient({ url: X402_FACILITATOR_URL });

export type SellResult =
  | { ok: true; payer?: string; settlementHeader: string }
  | { ok: false; reason: string };

export async function verifyAndSettle(headerValue: string, resourceUrl: string): Promise<SellResult> {
  let paymentPayload: PaymentPayload;
  try {
    paymentPayload = decodePaymentSignatureHeader(headerValue) as PaymentPayload;
  } catch {
    return { ok: false, reason: "malformed payment header" };
  }

  const requirements = insightPaymentRequirements(resourceUrl);
  // The client echoes back the requirements it accepted; trust our own
  // definition rather than whatever it sent, so a tampered payload can't
  // smuggle a different price or payee past verification.
  const verified = await facilitator.verify(paymentPayload, requirements);
  if (!verified.isValid) {
    return { ok: false, reason: verified.invalidReason ?? "verification failed" };
  }

  const settled = await facilitator.settle(paymentPayload, requirements);
  if (!settled.success) {
    return { ok: false, reason: settled.errorReason ?? "settlement failed" };
  }

  return { ok: true, payer: settled.payer, settlementHeader: encodePaymentResponseHeader(settled) };
}
