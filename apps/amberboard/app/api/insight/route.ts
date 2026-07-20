import { NextRequest, NextResponse } from "next/server";

import { computeInsight } from "@/lib/insight";
import { paymentRequiredResponse, readPaymentHeader, verifyAndSettle } from "@/lib/x402-seller";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const resourceUrl = req.nextUrl.origin + req.nextUrl.pathname;
  const header = readPaymentHeader((name) => req.headers.get(name));

  if (!header) {
    const { body, header: paymentRequiredHeader } = paymentRequiredResponse(resourceUrl);
    return NextResponse.json(body, { status: 402, headers: { "PAYMENT-REQUIRED": paymentRequiredHeader } });
  }

  const result = await verifyAndSettle(header, resourceUrl);
  if (!result.ok) {
    const { body, header: paymentRequiredHeader } = paymentRequiredResponse(resourceUrl);
    return NextResponse.json(
      { ...body, error: result.reason },
      { status: 402, headers: { "PAYMENT-REQUIRED": paymentRequiredHeader } },
    );
  }

  const insight = await computeInsight();
  return NextResponse.json(insight, {
    headers: { "PAYMENT-RESPONSE": result.settlementHeader, "X-PAYMENT-RESPONSE": result.settlementHeader },
  });
}
