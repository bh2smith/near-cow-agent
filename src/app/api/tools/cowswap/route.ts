import { parseQuoteRequest } from "@/src/app/api/tools/cowswap/util/parse";
import { type NextRequest, NextResponse } from "next/server";
import { orderRequestFlow } from "./orderFlow";

// Refer to https://api.cow.fi/docs/#/ for Specifics on Quoting and Order posting.

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const parsedRequest = await parseQuoteRequest(req);
    console.log("POST Request for quote:", parsedRequest);
    const orderData = await orderRequestFlow(parsedRequest);
    return NextResponse.json(orderData, { status: 200 });
  } catch (e: unknown) {
    if (
      e instanceof Error &&
      "body" in e &&
      e.body instanceof Object &&
      "errorType" in e.body &&
      "description" in e.body
    ) {
      const errorMessage = `${e.body.errorType}: ${e.body.description}`;
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const message = e instanceof Error ? e.message : String(e);
    console.error(message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
