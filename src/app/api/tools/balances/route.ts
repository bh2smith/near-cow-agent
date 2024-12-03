import { NextRequest, NextResponse } from "next/server";
import { Address } from "viem";
import { validateRequest } from "../util";
import {
  addressField,
  FieldParser,
  getSafeBalances,
  numberField,
  validateInput,
} from "@bitteprotocol/agent-sdk";
import { getZerionKey } from "../../constants";

interface Input {
  chainId: number;
  safeAddress: Address;
}

const parsers: FieldParser<Input> = {
  chainId: numberField,
  safeAddress: addressField,
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const headerError = await validateRequest(req);
  if (headerError) return headerError;

  const search = req.nextUrl.searchParams;
  console.log("Request: balances/", search);
  try {
    const { chainId, safeAddress } = validateInput<Input>(search, parsers);
    const balances = await getSafeBalances(
      chainId,
      safeAddress,
      getZerionKey(),
    );
    console.log(`Retrieved ${balances.length} balances for ${safeAddress}`);
    return NextResponse.json(balances, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : `Unknown error occurred ${String(error)}`;
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
