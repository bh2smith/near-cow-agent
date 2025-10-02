import {
  getNativeAsset,
  loadTokenMap,
  signRequestFor,
} from "@bitte-ai/agent-sdk/evm";
import {
  OrderBookApi,
  OrderSigningUtils,
  setGlobalAdapter,
} from "@cowprotocol/cow-sdk";
import { ViemAdapter } from "@cowprotocol/sdk-viem-adapter";
import { getAddress, type Address } from "viem";
import { isNativeAsset } from "zerion-sdk";

import { COW_SUPPORTED_CHAINS, getAlchemyKey } from "@/src/app/config";
import { withCowErrorHandling } from "@/src/lib/error";
import { basicParseQuote, preliminarySteps } from "@/src/lib/protocol/quote";
import { applySlippage, setPresignatureTx } from "@/src/lib/protocol/util";
import { getClient } from "@/src/lib/rpc";
import { parseWidgetData, type SwapFTData } from "@/src/lib/ui";

import type { EthRpc, ParsedQuoteRequest } from "@/src/lib/types";
import type { MetaTransaction, SignRequest } from "@bitte-ai/agent-sdk/evm";
import type { OrderParameters, OrderQuoteResponse } from "@cowprotocol/cow-sdk";
import type { NextRequest } from "next/server";

type ResponseData = {
  transaction: SignRequest;
  summary: string;
  meta?: { quote: OrderQuoteResponse; ui: SwapFTData };
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
  return handleQuoteRequest(client, parsed);
}

export async function handleQuoteRequest(
  provider: EthRpc,
  { chainId, quoteRequest, tokenData, slippageBps }: ParsedQuoteRequest,
): Promise<ResponseData> {
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
    provider,
    from,
    {
      ...result.quote,
      // Put back the original sell token (in case it was substituted) for the wrapping.
      sellToken: quoteRequest.sellToken,
    },
    notes,
    nativeSell,
  );
  if (steps.length > 0) {
    // Early return with wraps & approvals.
    return {
      transaction: signRequestFor({ chainId, metaTransactions: steps }),
      summary: `Preliminary Steps: ${summarizeNotes(notes)}`,
    };
  }

  const transaction = await buildTransaction(
    provider,
    result.quote,
    chainId,
    from,
  );

  const responsePayload = {
    meta: {
      quote: result,
      ui: await parseWidgetData({
        chainId,
        feeAmount,
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
  provider: EthRpc,
  quote: OrderParameters,
  chainId: number,
  owner: Address,
): Promise<SignRequest> {
  const cowAdapter = new ViemAdapter({ provider });
  // This is required by generateOrderId... (for the ZeroAddress). Seems weird.
  setGlobalAdapter(cowAdapter);
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
    transaction.push(orderRequest);
    // return { meta, summary: summarizeNotes(notes), transaction: orderRequest };
  } else {
    // (Safe) In this case all the steps and the order signing are all transactions.
    transaction.push({
      method: "eth_sendTransaction",
      chainId: chainId,
      params: [{ from: owner, ...setPresignatureTx(orderId) }],
    });
  }
  return transaction[0];
}
