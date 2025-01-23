import {
  handleRequest,
  signRequestFor,
  TxData,
  validateWethInput,
  wrapMetaTransaction,
} from "@bitte-ai/agent-sdk";
import { NextRequest, NextResponse } from "next/server";
import { formatUnits } from "viem";

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handleRequest(req, logic, (result) => NextResponse.json(result));
}

async function logic(req: NextRequest): Promise<TxData> {
  const search = req.nextUrl.searchParams;
  console.log("wrap/", search);
  const {
    chainId,
    amount,
    nativeAsset: { symbol, scanUrl, decimals },
  } = validateWethInput(search);
  return {
    transaction: signRequestFor({
      chainId,
      metaTransactions: [wrapMetaTransaction(chainId, amount)],
    }),
    meta: {
      description: `Wraps ${formatUnits(amount, decimals)} ${symbol} to ${scanUrl}.`,
    },
  };
}
