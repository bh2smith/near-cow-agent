import { NextResponse } from "next/server";

import { withRedactedErrorHandling } from "@/src/lib/error";
import { parseRequest, QuoteRequestSchema } from "@/src/lib/schema";

import { logic } from "./logic";

import type { NextRequest } from "next/server";

export async function GET(req: NextRequest): Promise<NextResponse> {
  console.log("quote/", req.url);
  const data = parseRequest(req, QuoteRequestSchema);
  try {
    const result = await withRedactedErrorHandling(logic(data));
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { message: (error as Error).message },
      { status: 500 },
    );
  }
}
