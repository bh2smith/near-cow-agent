import { EcdsaSigningScheme, OrderBookApi } from "@cowprotocol/cow-sdk";

import { withCowErrorHandling } from "@/src/lib/error";
import { CancelOrderSchema, parseRequest } from "@/src/lib/schema";

import type { CancelOrderInput } from "@/src/lib/schema";
import type { NextRequest } from "next/server";

export async function logic(req: NextRequest): Promise<void> {
  const data = parseRequest(req, CancelOrderSchema);
  return handleCancellationRequest(data);
}

export async function handleCancellationRequest({
  chainId,
  orderUid,
  signature,
}: CancelOrderInput): Promise<void> {
  const orderBookApi = new OrderBookApi({ chainId });

  if (!signature) {
    // 1. Check for order: This will throw with not found if order doesn't exist.
    await withCowErrorHandling(orderBookApi.getOrderMultiEnv(orderUid));
    // 2. Create Signable Order Cancellation Payload.
    // TODO
  } else {
    return orderBookApi.sendSignedOrderCancellations({
      orderUids: [orderUid],
      signature,
      signingScheme: EcdsaSigningScheme.EIP712,
    });
  }
}
