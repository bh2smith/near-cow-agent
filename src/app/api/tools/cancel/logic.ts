import { EcdsaSigningScheme, OrderBookApi } from "@cowprotocol/sdk-order-book";
import { OrderSigningUtils } from "@cowprotocol/sdk-order-signing";
import { getAddress } from "viem";

import { withCowErrorHandling } from "@/src/lib/error";
import { CancelOrderSchema, parseRequest } from "@/src/lib/schema";

import type { CancelOrderInput } from "@/src/lib/schema";
import type { SignRequest } from "@bitte-ai/agent-sdk/evm";
import type { NextRequest } from "next/server";

export async function logic(req: NextRequest): Promise<SignRequest | void> {
  const data = parseRequest(req, CancelOrderSchema);
  return handleCancellationRequest(data);
}

export async function handleCancellationRequest({
  chainId,
  orderUid,
  signature,
}: CancelOrderInput): Promise<SignRequest | void> {
  const orderBookApi = new OrderBookApi({ chainId });

  if (!signature) {
    console.log("Preparing Order Cancellation", orderUid);
    return buildCancelOrderData(orderBookApi, orderUid);
  } else {
    console.log("Cancelling order", orderUid);
    return withCowErrorHandling(
      orderBookApi.sendSignedOrderCancellations({
        orderUids: [orderUid],
        signature,
        signingScheme: EcdsaSigningScheme.EIP712,
      }),
    );
  }
}

// TODO(bh2smith): multiple simultaneous order cancellations.
export async function buildCancelOrderData(
  orderbook: OrderBookApi,
  orderUid: string,
): Promise<SignRequest> {
  const chainId = orderbook.context.chainId;
  // 1. Check for order: This will throw with not found if order doesn't exist.
  const order = await withCowErrorHandling(
    orderbook.getOrderMultiEnv(orderUid),
  );
  // 2. Create Signable Order Cancellation Payload.
  const typedData = {
    domain: await OrderSigningUtils.getDomain(chainId),
    types: {
      OrderCancellations: [{ name: "orderUids", type: "bytes[]" }],
    },
    primaryType: "OrderCancellations",
    message: {
      orderUids: [orderUid],
    },
  };
  return {
    method: "eth_signTypedData_v4",
    chainId,
    params: [getAddress(order.owner), JSON.stringify(typedData)],
  };
}
