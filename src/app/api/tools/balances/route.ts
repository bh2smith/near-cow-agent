import { NextRequest, NextResponse } from "next/server";
import { Address } from "viem";
import { getZerionKey, handleRequest } from "../util";
import {
  addressField,
  FieldParser,
  getSafeBalances,
  numberField,
  TokenBalance,
  validateInput,
} from "@bitte-ai/agent-sdk";

interface Input {
  chainId: number;
  safeAddress: Address;
}

const parsers: FieldParser<Input> = {
  chainId: numberField,
  safeAddress: addressField,
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  console.log(req);
  return handleRequest(() => logic(req));
}

async function logic(req: NextRequest): Promise<TokenBalance[]> {
  // const headerError = await validateNextRequest(req);
  // if (headerError) throw headerError;
  const search = req.nextUrl.searchParams;
  console.log("Request: balances/", search);
  const { chainId, safeAddress } = validateInput<Input>(search, parsers);
  const balances = await getSafeBalances(chainId, safeAddress, getZerionKey());
  console.log(`Retrieved ${balances.length} balances for ${safeAddress}`);
  return balances;
}
