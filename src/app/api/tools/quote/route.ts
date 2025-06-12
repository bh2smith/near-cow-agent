import { handleRequest } from "@bitte-ai/agent-sdk";
import type { OrderQuoteResponse } from "@cowprotocol/cow-sdk";
import { OrderBookApi } from "@cowprotocol/cow-sdk";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { basicParseQuote } from "../cowswap/util/parse";
import { getTokenMap } from "../util";
import type { SignRequestData } from "@bitte-ai/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("quote/", req.url);
  return handleRequest(req, logic, (result) => NextResponse.json(result));
}

async function logic(
  req: NextRequest,
): Promise<{ quote: OrderQuoteResponse; signRequest: SignRequestData }> {
  const parsedRequest = await basicParseQuote(req, await getTokenMap());
  console.log("Parsed Quote Request", parsedRequest);
  const orderBookApi = new OrderBookApi({ chainId: parsedRequest.chainId });

  const response = await orderBookApi.getQuote(parsedRequest.quoteRequest);
  console.log("POST Response for quote:", response);
  return {
    quote: response,
    signRequest: {
      chainId: 0,
      metaTransactions: [],
    },
  };
}
