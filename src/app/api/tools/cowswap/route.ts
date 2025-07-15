import { parseQuoteRequest } from "@/src/app/api/tools/cowswap/util/parse";
import { type NextRequest, NextResponse } from "next/server";
import { orderRequestFlow, type OrderResponse } from "./orderFlow";
import { validateNextRequest, getTokenMap, getClient } from "../util";
import { handleRequest, loadTokenMap } from "@bitte-ai/agent-sdk";
import { COW_SUPPORTED_CHAINS } from "@/src/app/config";

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
  const parsedRequest = await parseQuoteRequest(req, await loadTokenMap(COW_SUPPORTED_CHAINS));
  console.log(`Request for quote:`, parsedRequest);
  const client = getClient(parsedRequest.chainId);
  const result = await orderRequestFlow(client, parsedRequest);
  console.log("POST Response for quote:", result);
  return result;
}
