import { handleRequest } from "@bitte-ai/agent-sdk";
import type { OrderQuoteResponse } from "@cowprotocol/cow-sdk";
import { OrderBookApi } from "@cowprotocol/cow-sdk";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { basicParseQuote } from "../cowswap/util/parse";
import { getTokenMap } from "../util";
import { setPresignatureTx } from "../cowswap/util/protocol";
import { OrderSigningUtils } from "@cowprotocol/cow-sdk";
import { getAddress } from "viem";
import type { SignRequest, SwapFTData } from "@bitte-ai/types";
import { parseWidgetData } from "../cowswap/util/ui";

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("quote/", req.url);
  return handleRequest(req, logic, (result) => NextResponse.json(result));
}

async function logic(req: NextRequest): Promise<{
  meta: { quote: OrderQuoteResponse; ui: SwapFTData };
  transaction: SignRequest;
}> {
  const parsedRequest = await basicParseQuote(req, await getTokenMap());
  console.log("Parsed Quote Request", parsedRequest);
  const orderBookApi = new OrderBookApi({ chainId: parsedRequest.chainId });

  const response = await orderBookApi.getQuote(parsedRequest.quoteRequest);
  console.log("POST Response for quote:", response);
  const { chainId } = parsedRequest;
  const { from, quote } = response;
  if (from === undefined) {
    throw new Error("owner unspecified");
  }
  const owner = getAddress(from);
  const { orderId, orderDigest } = await OrderSigningUtils.generateOrderId(
    chainId,
    {
      sellToken: quote.sellToken,
      buyToken: quote.buyToken,
      sellAmount: quote.sellAmount,
      buyAmount: quote.buyAmount,
      validTo: quote.validTo,
      appData:
        "0x5a8bb9f6dd0c7f1b4730d9c5a811c2dfe559e67ce9b5ed6965b05e59b8c86b80",
      feeAmount: quote.feeAmount,
      kind: quote.kind,
      partiallyFillable: quote.partiallyFillable,
    },
    { owner },
  );
  console.log("Order Digest", orderDigest);
  console.log("Order Uid", orderId);
  let signRequest: SignRequest;
  if (response.quote.signingScheme === "eip712") {
    const typedData = {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        ...OrderSigningUtils.getEIP712Types(),
      },
      domain: await OrderSigningUtils.getDomain(parsedRequest.chainId),
      primaryType: "Order",
      message: response.quote,
    };
    signRequest = {
      method: "eth_signTypedData_v4",
      chainId: parsedRequest.chainId,
      params: [owner, JSON.stringify(typedData)],
    };
  } else {
    signRequest = {
      method: "eth_sendTransaction",
      chainId: parsedRequest.chainId,
      params: [{ from: owner, ...setPresignatureTx(orderId) }],
    };
  }

  return {
    meta: {
      quote: response,
      ui: parseWidgetData({
        chainId,
        tokenData: parsedRequest.tokenData,
        quote: response.quote,
      }),
    },
    transaction: signRequest,
  };
}
