import { NextRequest, NextResponse } from "next/server";
import { parseEther, toHex } from "viem";
import { validateWethInput } from "../utils";
import { signRequestFor } from "../../util";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const search = req.nextUrl.searchParams;
  console.log("wrap/", search);
  try {
    const { chainId, amount, wethAddress } = validateWethInput(search);
    const signRequest = signRequestFor({
      chainId,
      metaTransactions: [
        {
          to: wethAddress,
          value: toHex(parseEther(amount.toString())),
          // methodId for weth.deposit
          data: "0xd0e30db0",
        },
      ],
    });
    return NextResponse.json(signRequest, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : `Unknown error occurred ${String(error)}`;
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
