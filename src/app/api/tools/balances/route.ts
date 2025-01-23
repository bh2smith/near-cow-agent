import { NextRequest, NextResponse } from "next/server";
import { Address } from "viem";
import { getZerionKey, validateNextRequest } from "../util";
import {
  addressField,
  FieldParser,
  getSafeBalances,
  handleRequest,
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

async function logic(req: NextRequest): Promise<TokenBalance[]> {
  // Prevent unauthorized spam for balance API.
  const headerError = await validateNextRequest(req);
  if (headerError) throw headerError;
  const search = req.nextUrl.searchParams;
  console.log("Request: balances/", search);
  const { chainId, safeAddress } = validateInput<Input>(search, parsers);
  const balances = await getSafeBalances(chainId, safeAddress, getZerionKey());
  console.log(`Retrieved ${balances.length} balances for ${safeAddress}`);
  return balances;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handleRequest(req, logic, (result) => NextResponse.json(result));
}
