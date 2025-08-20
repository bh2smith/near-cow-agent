import {
  getNativeAsset,
  loadTokenMap,
  signRequestFor,
} from "@bitte-ai/agent-sdk";
import { OrderBookApi, OrderSigningUtils } from "@cowprotocol/cow-sdk";
import { getAddress, type Address } from "viem";
import { isNativeAsset } from "zerion-sdk";

import { COW_SUPPORTED_CHAINS, getAlchemyKey } from "@/src/app/config";
import { withCowErrorHandling } from "@/src/lib/error";
import { basicParseQuote, preliminarySteps } from "@/src/lib/protocol/quote";
import { applySlippage, setPresignatureTx } from "@/src/lib/protocol/util";
import { getClient } from "@/src/lib/rpc";
import { parseWidgetData } from "@/src/lib/ui";

import type { ParsedQuoteRequest } from "@/src/lib/types";
import type { MetaTransaction, SignRequest, SwapFTData } from "@bitte-ai/types";
import type { OrderParameters, OrderQuoteResponse } from "@cowprotocol/cow-sdk";
import type { NextRequest } from "next/server";

type ResponseData = {
  meta: { quote: OrderQuoteResponse; ui: SwapFTData };
  summary: string;
  transaction: SignRequest[];
};

export async function logic(req: NextRequest): Promise<ResponseData> {
  const requestBody = await req.json();
  // Early Extract ChainId
  const client = getClient(requestBody.chainId, getAlchemyKey());
  const parsed = await basicParseQuote(
    client,
    requestBody,
    // Temporarily disable tokenMap Caching
    await loadTokenMap(COW_SUPPORTED_CHAINS),
  );
  return handleQuoteRequest(parsed);
}

export async function handleQuoteRequest({
  chainId,
  quoteRequest,
  tokenData,
  slippageBps,
}: ParsedQuoteRequest): Promise<ResponseData> {
  // TODO: Instantiate only one chainId
  const client = getClient(chainId, getAlchemyKey());
  console.log("Parsed Quote Request", quoteRequest);
  // Flag used a few times later.
  const nativeSell = isNativeAsset(quoteRequest.sellToken);
  if (nativeSell) {
    quoteRequest.sellToken = getNativeAsset(chainId).address;
  }
  const orderBookApi = new OrderBookApi({ chainId });

  // WARNING: Do not unpack this result as { quote, ...}. It causes confusion due to modifications.
  const result = await withCowErrorHandling(
    orderBookApi.getQuote(quoteRequest),
  );

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
    // // TODO: This shit is too Slow.
    // appData: await buildAndPostAppData(
    //   orderbook,
    //   "bitte.ai/CowAgent",
    //   referralAddress,
    //   {
    //     recipient: partnerAddress,
    //     bps: partnerBps,
    //   },
    // );
  };
  console.log("Modified Quote", result.quote);
  const notes: string[] = [];
  const from = getAddress(quoteRequest.from);
  const steps = await preliminarySteps(
    client,
    from,
    {
      ...result.quote,
      // Put back the original sell token (in case it was substituted) for the wrapping.
      sellToken: quoteRequest.sellToken,
    },
    notes,
    nativeSell,
  );
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
      ui: await parseWidgetData({
        chainId,
        tokenData,
        quote: result.quote,
      }),
    },
    summary: summarizeNotes(notes),
    transaction,
  };
  console.log("Response Payload", JSON.stringify(responsePayload));
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
