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
  try {
    const orderUid = await orderBookApi.sendOrder(orderCreation);
    const orderLink = orderBookApi.getOrderLink(orderUid);
    console.log("Order Link", orderLink);
    return { orderUrl: `https://explorer.cow.fi/orders/${orderUid}` };
  } catch (error) {
    // console.error("Error creating order", error);
    return { error: parseCowAPIError(error) };
  }
}

interface CowAPIErrorBody {
  errorType?: string;
  description?: string;
}
/**
 * Parses CoW Protocol API errors to extract meaningful error messages
 * @param error - The error object from the CoW Protocol API
 * @returns A user-friendly error message
 */
function parseCowAPIError(error: unknown): string {
  // Default error message
  let errorMessage = "Failed to create order";

  if (error && typeof error === "object") {
    // Check if it's a CoW Protocol API error with structured response
    if ("body" in error && error.body && typeof error.body === "object") {
      const errorBody = error.body as CowAPIErrorBody;
      if (errorBody.errorType && errorBody.description) {
        errorMessage = `${errorBody.errorType}: ${errorBody.description}`;
      } else if (errorBody.description) {
        errorMessage = errorBody.description;
      }
    }
    // Fallback to standard error message if available
    else if ("message" in error && typeof error.message === "string") {
      errorMessage = error.message;
    }
  }

  return errorMessage;
}
