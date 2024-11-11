import { NextRequest, NextResponse } from "next/server";
import { validateWethInput } from "../utils";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const search = req.nextUrl.searchParams;
  console.log("wrap/", search);
  try {
    const signRequest = validateWethInput(search);
    return NextResponse.json(signRequest, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : `Unknown error occurred ${String(error)}`;
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
