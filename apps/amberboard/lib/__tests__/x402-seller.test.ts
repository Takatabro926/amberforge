import { beforeEach, describe, expect, it, vi } from "vitest";

const HELPER = "0x4D0c9faE02a3596Bf1D888D27c2914641Fe0fB5a";

describe("x402-seller", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.HELPER_ADDRESS = HELPER;
    delete process.env.X402_NETWORK;
  });

  it("defaults to Base Sepolia with the Sepolia USDC asset", async () => {
    const { X402_NETWORK, X402_ASSET } = await import("../x402-seller");
    expect(X402_NETWORK).toBe("eip155:84532");
    expect(X402_ASSET).toBe("0x036CbD53842c5426634e7929541eC2318f3dCF7e");
  });

  it("switches to the mainnet USDC asset when X402_NETWORK is Base mainnet", async () => {
    process.env.X402_NETWORK = "eip155:8453";
    const { X402_ASSET } = await import("../x402-seller");
    expect(X402_ASSET).toBe("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
  });

  it("builds requirements priced at $0.001 USDC, paid to the agent's revenue wallet", async () => {
    const { insightPaymentRequirements } = await import("../x402-seller");
    const req = insightPaymentRequirements("https://example.test/api/insight");
    expect(req).toMatchObject({
      scheme: "exact",
      network: "eip155:84532",
      amount: "1000",
      payTo: HELPER,
      maxTimeoutSeconds: 300,
    });
  });

  it("throws if HELPER_ADDRESS isn't configured — no accidental payTo=undefined", async () => {
    delete process.env.HELPER_ADDRESS;
    const { insightPaymentRequirements } = await import("../x402-seller");
    expect(() => insightPaymentRequirements("https://example.test/api/insight")).toThrow(/HELPER_ADDRESS/);
  });

  it("wraps the requirements in a 402 body with a matching PAYMENT-REQUIRED header", async () => {
    const { paymentRequiredResponse } = await import("../x402-seller");
    const { body, header } = paymentRequiredResponse("https://example.test/api/insight");
    expect(body.accepts).toHaveLength(1);
    expect(body.resource.url).toBe("https://example.test/api/insight");
    expect(JSON.parse(Buffer.from(header, "base64").toString())).toEqual(body);
  });

  it("reads PAYMENT-SIGNATURE before falling back to X-PAYMENT, case-insensitively", async () => {
    const { readPaymentHeader } = await import("../x402-seller");
    const headers = new Map([
      ["x-payment", "fallback"],
      ["PAYMENT-SIGNATURE", "primary"],
    ]);
    const get = (name: string) => headers.get(name) ?? null;
    expect(readPaymentHeader(get)).toBe("primary");

    headers.delete("PAYMENT-SIGNATURE");
    expect(readPaymentHeader(get)).toBe("fallback");

    headers.delete("x-payment");
    expect(readPaymentHeader(get)).toBeNull();
  });
});
