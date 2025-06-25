import { type NextRequest, NextResponse } from "next/server";
import type { Address } from "viem";
import { getZerionKey, validateNextRequest } from "../util";
import {
  addressField,
  handleRequest,
  validateInput,
} from "@bitte-ai/agent-sdk";
import type { TokenBalance, FieldParser } from "@bitte-ai/agent-sdk";
import { getBalances } from "../balance";

interface Input {
  evmAddress: Address;
}

const parsers: FieldParser<Input> = {
  evmAddress: addressField,
};

async function logic(req: NextRequest): Promise<TokenBalance[]> {
  // Prevent unauthorized spam for balance API.
  const headerError = await validateNextRequest(req);
  if (headerError) throw headerError;
  const search = req.nextUrl.searchParams;
  console.log("Request: balances/", search);
  const { evmAddress } = validateInput<Input>(search, parsers);
  const balances = await getBalances(evmAddress, getZerionKey());
  console.log(`Retrieved ${balances.length} balances for ${evmAddress}`);
  return balances;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handleRequest(req, logic, (result) => NextResponse.json(result));
}
