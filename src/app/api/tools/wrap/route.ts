import { refineWethInput, wrapMetaTransaction } from "./util";
import { validateQuery, WethSchema, isInvalid } from "./schema";
import { NextRequest, NextResponse } from "next/server";
import { SignRequest } from "@bitte-ai/agent-sdk/evm";

export async function GET(req: NextRequest): Promise<NextResponse> {
  console.log("status/", req.url);
  const input = validateQuery(req, WethSchema);
  if (isInvalid(input)) {
    return NextResponse.json({ error: input.error });
  }
  const {
    chainId,
    amount,
    balances: { native },
  } = await refineWethInput(input.query);
  const response: SignRequest = {
    chainId,
    method: "eth_sendTransaction",
    params: [wrapMetaTransaction(chainId, amount > native ? native : amount)],
  };
  console.log("Wrap response", response);
  return NextResponse.json(
    {
      response,
    },
    { status: 200 },
  );
}
