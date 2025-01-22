import { parseQuoteRequest } from "@/src/app/api/tools/cowswap/util/parse";
import { type NextRequest, NextResponse } from "next/server";
import { orderRequestFlow, OrderResponse } from "./orderFlow";
import {
  validateNextRequest,
  getZerionKey,
  getTokenMap,
  handleRequest,
} from "../util";

// Refer to https://api.cow.fi/docs/#/ for Specifics on Quoting and Order posting.

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("swap/", req.url);
  const headerError = await validateNextRequest(req);
  if (headerError) {
    console.error("Header Error", headerError);
    return headerError;
  }
  return handleRequest<OrderResponse>(() => logic(req));
}

async function logic(req: NextRequest): Promise<OrderResponse> {
  const parsedRequest = await parseQuoteRequest(
    req,
    await getTokenMap(),
    getZerionKey(),
  );
  console.log("POST Request for quote:", parsedRequest);
  return orderRequestFlow(parsedRequest);
}
