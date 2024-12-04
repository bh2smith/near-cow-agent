import { NextRequest, NextResponse } from "next/server";
import { formatUnits } from "viem";
import {
  signRequestFor,
  unwrapMetaTransaction,
  validateWethInput,
} from "@bitteprotocol/agent-sdk";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const search = req.nextUrl.searchParams;
  console.log("unwrap/", search);
  try {
    const {
      chainId,
      amount,
      nativeAsset: { symbol, scanUrl, decimals },
    } = validateWethInput(search);
    return NextResponse.json(
      {
        transaction: signRequestFor({
          chainId,
          metaTransactions: [unwrapMetaTransaction(chainId, amount)],
        }),
        meta: {
          description: `Withdraws ${formatUnits(amount, decimals)} ${symbol} from contract ${scanUrl}.`,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : `Unknown error occurred ${String(error)}`;
    console.error("unwrap/ error", message);
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
