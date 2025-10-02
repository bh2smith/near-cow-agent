import { NextResponse } from "next/server";

import { withRedactedErrorHandling } from "@/src/lib/error";

import { logic } from "./logic";

import type { NextRequest } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("quote/", req.url);
  try {
    const result = await withRedactedErrorHandling(logic(req));
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { message: (error as Error).message },
      { status: 200 },
    );
  }
}
