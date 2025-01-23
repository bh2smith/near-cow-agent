import { NextRequest, NextResponse } from "next/server";
import { formatUnits } from "viem";
import {
  signRequestFor,
  unwrapMetaTransaction,
  validateWethInput,
  handleRequest,
  TxData,
} from "@bitte-ai/agent-sdk";

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handleRequest(req, logic, (result) => NextResponse.json(result));
}

async function logic(req: NextRequest): Promise<TxData> {
  const search = req.nextUrl.searchParams;
  console.log("unwrap/", search);
  const {
    chainId,
    amount,
    nativeAsset: { symbol, scanUrl, decimals },
  } = validateWethInput(search);
  return {
    transaction: signRequestFor({
      chainId,
      metaTransactions: [unwrapMetaTransaction(chainId, amount)],
    }),
    meta: {
      description: `Withdraws ${formatUnits(amount, decimals)} ${symbol} from contract ${scanUrl}.`,
    },
  };
}
