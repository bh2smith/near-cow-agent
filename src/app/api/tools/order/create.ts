import { withCowErrorHandling } from "@/src/lib/error";
import type { OrderKind, SigningScheme } from "@cowprotocol/cow-sdk";
import { OrderBookApi } from "@cowprotocol/cow-sdk";

interface OrderRequestBody {
  chainId: number;
  sellToken: string;
  buyToken: string;
  receiver: string;
  sellAmount: string;
  buyAmount: string;
  validTo: number;
  feeAmount: string;
  kind: string;
  partiallyFillable: boolean;
  signingScheme: string;
  signature: string;
  appData: string;
  evmAddress: string;
}

export async function createOrder(
  requestBody: OrderRequestBody,
): Promise<{ orderUrl?: string; error?: string }> {
  const orderBookApi = new OrderBookApi({ chainId: requestBody.chainId });
  const orderCreation = {
    sellToken: requestBody.sellToken,
    buyToken: requestBody.buyToken,
    receiver: requestBody.receiver,
    sellAmount: requestBody.sellAmount,
    buyAmount: requestBody.buyAmount,
    validTo: requestBody.validTo,
    feeAmount: requestBody.feeAmount,
    kind: requestBody.kind as OrderKind,
    partiallyFillable: requestBody.partiallyFillable,
    signingScheme: requestBody.signingScheme as SigningScheme,
    signature: requestBody.signature,
    appData: requestBody.appData,
    from: requestBody.evmAddress,
  };
  console.log("Order Creation", orderCreation);
  const orderUid = await withCowErrorHandling(
    orderBookApi.sendOrder(orderCreation),
  );
  const orderLink = orderBookApi.getOrderLink(orderUid);
  console.log("Order Link", orderLink);
  return { orderUrl: `https://explorer.cow.fi/orders/${orderUid}` };
}
