import { handleRequest } from "@bitte-ai/agent-sdk";
import type { OrderQuoteResponse } from "@cowprotocol/cow-sdk";
import { OrderBookApi } from "@cowprotocol/cow-sdk";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { basicParse } from "../cowswap/util/parse";
import { getTokenMap } from "../util";

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("quote/", req.url);
  console.log("quote/", req.body);
  return handleRequest(req, logic, (result) => NextResponse.json(result));
}

async function logic(req: NextRequest): Promise<OrderQuoteResponse> {
  const parsedRequest = await basicParse(req, await getTokenMap());
  console.log("POST Request for quote:", parsedRequest.chainId);
  const orderBookApi = new OrderBookApi({ chainId: parsedRequest.chainId });

  const response = await orderBookApi.getQuote(parsedRequest.quoteRequest);
  console.log("POST Response for quote:", response);
  return response;
}
