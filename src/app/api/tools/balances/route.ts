import { NextRequest, NextResponse } from "next/server";
import {
  addressField,
  FieldParser,
  numberField,
  validateInput,
} from "../validate";
import { getSafeBalances } from "../safe-util";
import { Address } from "viem";

interface Input {
  chainId: number;
  safeAddress: Address;
}

const parsers: FieldParser<Input> = {
  chainId: numberField,
  safeAddress: addressField,
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const search = req.nextUrl.searchParams;
  console.log("Request: balances/", search);
  try {
    const { chainId, safeAddress } = validateInput<Input>(search, parsers);
    const balances = await getSafeBalances(chainId, safeAddress);
    console.log("Response: balances/", balances);
    return NextResponse.json(balances, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : `Unknown error occurred ${String(error)}`;
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
