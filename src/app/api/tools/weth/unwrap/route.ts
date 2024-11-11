import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData, formatUnits, parseAbi, parseEther } from "viem";
import { validateWethInput } from "../utils";
import { signRequestFor } from "../../util";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const search = req.nextUrl.searchParams;
  console.log("unwrap/", search);
  try {
    const {
      chainId,
      amount,
      nativeAsset: { address, symbol, scanUrl, decimals },
    } = validateWethInput(search);
    return NextResponse.json(
      {
        transaction: signRequestFor({
          chainId,
          metaTransactions: [
            {
              to: address,
              value: "0x",
              data: encodeFunctionData({
                abi: parseAbi(["function withdraw(uint wad)"]),
                functionName: "withdraw",
                args: [parseEther(amount.toString())],
              }),
            },
          ],
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
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
