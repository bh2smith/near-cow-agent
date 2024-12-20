import { parseQuoteRequest } from "@/src/app/api/tools/cowswap/util/parse";
import { type NextRequest, NextResponse } from "next/server";
import { orderRequestFlow } from "./orderFlow";
import { validateNextRequest, getZerionKey, getTokenMap } from "../util";

// Refer to https://api.cow.fi/docs/#/ for Specifics on Quoting and Order posting.

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("swap/", req.url);
  const headerError = await validateNextRequest(req);
  if (headerError) {
    console.error("Header Error", headerError);
    return headerError;
  }
  try {
    const parsedRequest = await parseQuoteRequest(
      req,
      await getTokenMap(),
      getZerionKey(),
    );
    console.log("POST Request for quote:", parsedRequest);
    const orderData = await orderRequestFlow(parsedRequest);
    console.log("Responding with", orderData);
    return NextResponse.json(orderData, { status: 200 });
  } catch (e: unknown) {
    const message = JSON.stringify(e);
    console.error("CoWSwap Error:", e, JSON.stringify(e));
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
