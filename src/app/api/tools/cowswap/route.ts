import { parseQuoteRequest } from "@/src/app/api/tools/cowswap/util/parse";
import { type NextRequest, NextResponse } from "next/server";
import { orderRequestFlow, type OrderResponse } from "./orderFlow";
import { validateNextRequest, getTokenMap } from "../util";
import { handleRequest } from "@bitte-ai/agent-sdk";

// Refer to https://api.cow.fi/docs/#/ for Specifics on Quoting and Order posting.

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("swap/", req.url);
  const headerError = await validateNextRequest(req);
  if (headerError) {
    console.error("Header Error", headerError);
    return headerError;
  }
  return handleRequest(req, logic, (result) => NextResponse.json(result));
}

async function logic(req: NextRequest): Promise<OrderResponse> {
  const parsedRequest = await parseQuoteRequest(req, await getTokenMap());
  console.log("POST Request for quote:", parsedRequest);
  const result = await orderRequestFlow(parsedRequest);
  console.log("POST Response for quote:", result);
  return result;
}
