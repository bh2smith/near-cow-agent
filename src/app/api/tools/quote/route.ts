import { handleRequest, signRequestFor } from "@bitte-ai/agent-sdk";
import type { OrderParameters, OrderQuoteResponse } from "@cowprotocol/cow-sdk";
import { OrderBookApi } from "@cowprotocol/cow-sdk";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { basicParseQuote } from "../cowswap/util/parse";
import { getTokenMap } from "../util";
import { applySlippage, setPresignatureTx } from "../cowswap/util/protocol";
import { OrderSigningUtils } from "@cowprotocol/cow-sdk";
import type { MetaTransaction, SignRequest, SwapFTData } from "@bitte-ai/types";
import { parseWidgetData } from "../cowswap/util/ui";
import { preliminarySteps } from "./preliminary";
import { getAddress, type Address } from "viem";

// TODO: Allow User to set Slippage.
const slippageBps = Number.parseInt(process.env.SLIPPAGE_BPS || "100");

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("quote/", req.url);
  return handleRequest(req, logic, (result) => NextResponse.json(result));
}

async function logic(req: NextRequest): Promise<{
  meta: { quote: OrderQuoteResponse; ui: SwapFTData };
  summary: string;
  transaction: SignRequest[];
}> {
  const { chainId, quoteRequest, tokenData } = await basicParseQuote(
    req,
    await getTokenMap(),
  );
  console.log("Parsed Quote Request", quoteRequest);
  const notes: string[] = [];
  const orderBookApi = new OrderBookApi({ chainId });

  // WARNING: Do not unpack this result as { quote, ...}. It causes confusion due to modifications.
  const result = await orderBookApi.getQuote(quoteRequest);

  console.log("POST Response for quote:", result.quote);
  if (result.from === undefined) {
    throw new Error("owner unspecified");
  }

  const { sellAmount, feeAmount } = result.quote;
  result.quote = {
    ...result.quote,
    // Apply Slippage based on OrderKind
    ...applySlippage(result.quote, slippageBps),
    // Adjust the sellAmount to account for the fee.
    // cf: https://learn.cow.fi/tutorial/submit-order
    sellAmount: (BigInt(sellAmount) + BigInt(feeAmount)).toString(),
    feeAmount: "0",
    // Set Referral Code.
    appData:
      "0x5a8bb9f6dd0c7f1b4730d9c5a811c2dfe559e67ce9b5ed6965b05e59b8c86b80",
  };
  console.log("Modified Quote", result.quote);
  const from = getAddress(quoteRequest.from);
  const steps = await preliminarySteps(chainId, from, result.quote, notes);
  console.log("Preliminary Steps", steps);
  const transaction = await buildTransaction(
    result.quote,
    notes,
    chainId,
    from,
    steps,
  );

  const responsePayload = {
    meta: {
      quote: result,
      ui: parseWidgetData({
        chainId,
        tokenData,
        quote: result.quote,
      }),
    },
    summary: summarizeNotes(notes),
    transaction,
  };
  console.log("Response Payload", responsePayload);
  return responsePayload;
}

function summarizeNotes(notes: string[]): string {
  return notes.map((note, i) => `${i + 1}. ${note}`).join("\n");
}

async function buildTransaction(
  quote: OrderParameters,
  notes: string[],
  chainId: number,
  owner: Address,
  steps: MetaTransaction[],
): Promise<SignRequest[]> {
  const { orderId } = await OrderSigningUtils.generateOrderId(
    chainId,
    {
      sellToken: quote.sellToken,
      buyToken: quote.buyToken,
      sellAmount: quote.sellAmount,
      feeAmount: quote.feeAmount,
      buyAmount: quote.buyAmount,
      validTo: quote.validTo,
      appData: quote.appData,
      kind: quote.kind,
      partiallyFillable: quote.partiallyFillable,
    },
    { owner },
  );
  console.log("Order Uid", orderId);

  const transaction: SignRequest[] = [];
  if (quote.signingScheme === "eip712") {
    notes.push("Off Chain Order Placement (EIP712)");
    const typedData = {
      types: {
        // EIP712Domain: [
        //   { name: "name", type: "string" },
        //   { name: "version", type: "string" },
        //   { name: "chainId", type: "uint256" },
        //   { name: "verifyingContract", type: "address" },
        // ],
        ...OrderSigningUtils.getEIP712Types(),
      },
      domain: await OrderSigningUtils.getDomain(chainId),
      primaryType: "Order",
      message: quote,
    };

    const orderRequest: SignRequest = {
      method: "eth_signTypedData_v4",
      chainId,
      params: [owner, JSON.stringify(typedData)],
    };

    if (steps.length > 0) {
      transaction.push(signRequestFor({ chainId, metaTransactions: steps }));
    }
    transaction.push(orderRequest);
    // return { meta, summary: summarizeNotes(notes), transaction: orderRequest };
  } else {
    // (Safe) In this case all the steps and the order signing are all transactions.
    notes.push("On Chain Order Signing via setPresignature");
    transaction.push({
      method: "eth_sendTransaction",
      chainId: chainId,
      params: [...steps, { from: owner, ...setPresignatureTx(orderId) }],
    });
  }
  return transaction;
}
