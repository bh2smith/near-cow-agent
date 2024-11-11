import { NextRequest, NextResponse } from "next/server";
import { validateWethInput, wrapSignRequest } from "../utils";
import { formatUnits } from "viem";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const search = req.nextUrl.searchParams;
  console.log("wrap/", search);
  try {
    const {
      chainId,
      amount,
      nativeAsset: { symbol, scanUrl, decimals },
    } = validateWethInput(search);
    return NextResponse.json(
      {
        transaction: wrapSignRequest(chainId, amount),
        meta: {
          description: `Wraps ${formatUnits(amount, decimals)} ${symbol} to ${scanUrl}.`,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : `Unknown error occurred ${String(error)}`;
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
