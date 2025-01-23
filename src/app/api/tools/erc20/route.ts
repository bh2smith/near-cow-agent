import { parseUnits, type Address } from "viem";
import {
  erc20Transfer,
  addressField,
  floatField,
  numberField,
  validateInput,
  addressOrSymbolField,
  type FieldParser,
  signRequestFor,
  getTokenDetails,
  handleRequest,
  TxData,
} from "@bitte-ai/agent-sdk";
import { NextRequest, NextResponse } from "next/server";
import { getTokenMap } from "../util";

interface Input {
  chainId: number;
  amount: number;
  tokenOrSymbol: string;
  recipient: Address;
}

const parsers: FieldParser<Input> = {
  chainId: numberField,
  // Note that this is a float (i.e. token units)
  amount: floatField,
  tokenOrSymbol: addressOrSymbolField,
  recipient: addressField,
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handleRequest(req, logic, (result) => NextResponse.json(result));
}

async function logic(req: NextRequest): Promise<TxData> {
  const url = new URL(req.url);
  const search = url.searchParams;
  console.log("erc20/", search);
  const {
    chainId,
    amount,
    tokenOrSymbol: token,
    recipient,
  } = validateInput<Input>(search, parsers);
  const tokenDetails = await getTokenDetails(
    chainId,
    token,
    await getTokenMap(),
  );
  if (!tokenDetails) {
    throw new Error(`Token not found on chain ${chainId}: ${token}`);
  }
  const { symbol, decimals, address } = tokenDetails;
  console.log("erc20/ tokenDetails", chainId, symbol, decimals, address);
  return {
    transaction: signRequestFor({
      chainId,
      metaTransactions: [
        erc20Transfer({
          token: address,
          to: recipient,
          amount: parseUnits(amount.toString(), decimals),
        }),
      ],
    }),
  };
}
