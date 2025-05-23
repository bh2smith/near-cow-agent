import { parseQuoteRequest } from "@/src/app/api/tools/cowswap/util/parse";
import { type NextRequest, NextResponse } from "next/server";
import { orderRequestFlow, type OrderResponse } from "./orderFlow";
import { validateNextRequest, getZerionKey, getTokenMap } from "../util";
import { handleRequest } from "@bitte-ai/agent-sdk";
import type { SwapFTData } from "@bitte-ai/types";
import { parseWidgetData } from "./util/ui";

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

async function logic(
  req: NextRequest,
): Promise<OrderResponse & { data: SwapFTData }> {
  const parsedRequest = await parseQuoteRequest(
    req,
    await getTokenMap(),
    getZerionKey(),
  );
  console.log("POST Request for quote:", parsedRequest);
  const result = await orderRequestFlow(parsedRequest);
  return {
    ...result,
    data: parseWidgetData({
      chainId: parsedRequest.chainId,
      tokenData: parsedRequest.tokenData,
      quote: result.meta.quote,
    }),
  };
}
