import { NextRequest, NextResponse } from "next/server";
import { Address, encodeFunctionData, erc20Abi } from "viem";
import { signRequestFor } from "../util";
import { parseUnits } from "viem/utils";
import {
  addressField,
  addressOrSymbolField,
  FieldParser,
  floatField,
  numberField,
  validateInput,
} from "../validate";
import { getTokenDetails } from "../cowswap/util/tokens";

// Declare Route Input
interface Input {
  chainId: number;
  amount: number;
  token: string;
  recipient: Address;
}

const parsers: FieldParser<Input> = {
  chainId: numberField,
  amount: floatField,
  token: addressOrSymbolField,
  recipient: addressField,
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const search = req.nextUrl.searchParams;
  console.log("erc20/", search);
  try {
    const { chainId, amount, token, recipient } = validateInput<Input>(
      search,
      parsers,
    );
    const { decimals } = await getTokenDetails(chainId, token);
    const signRequest = signRequestFor({
      chainId,
      metaTransactions: [
        {
          to: token,
          value: "0x",
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [recipient, parseUnits(amount.toString(), decimals)],
          }),
        },
      ],
    });
    return NextResponse.json({ transaction: signRequest }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : `Unknown error occurred ${String(error)}`;
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
