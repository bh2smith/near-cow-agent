import { handleRequest, signRequestFor } from "@bitte-ai/agent-sdk";
import type { OrderQuoteResponse } from "@cowprotocol/cow-sdk";
import { OrderBookApi } from "@cowprotocol/cow-sdk";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { basicParseQuote } from "../cowswap/util/parse";
import { getTokenMap } from "../util";
import { applySlippage, setPresignatureTx } from "../cowswap/util/protocol";
import { OrderSigningUtils } from "@cowprotocol/cow-sdk";
import type { SignRequest, SwapFTData } from "@bitte-ai/types";
import { parseWidgetData } from "../cowswap/util/ui";
import { preliminarySteps } from "./preliminary";

// TODO: Allow User to set Slippage.
const slippageBps = Number.parseInt(process.env.SLIPPAGE_BPS || "100");

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("quote/", req.url);
  return handleRequest(req, logic, (result) => NextResponse.json(result));
}

async function logic(req: NextRequest): Promise<{
  meta: { quote: OrderQuoteResponse; ui: SwapFTData } | string;
  transaction: SignRequest;
}> {
  const { chainId, quoteRequest, tokenData } = await basicParseQuote(
    req,
    await getTokenMap(),
  );
  console.log("Parsed Quote Request", quoteRequest);

  const { steps, owner } = await preliminarySteps(quoteRequest, chainId);
  if (steps.length > 0) {
    return {
      transaction: signRequestFor({
        from: owner,
        chainId,
        metaTransactions: steps,
      }),
      meta: "user must wrap Native asset and/or approve token before continuing",
    };
  }
  const orderBookApi = new OrderBookApi({ chainId });

  const result = await orderBookApi.getQuote(quoteRequest);
  const { from, expiration, verified } = result;
  // This needs to be altered.
  let quote = result.quote;
  console.log("POST Response for quote:", quote);
  if (from === undefined) {
    throw new Error("owner unspecified");
  }

  const { sellAmount, feeAmount } = quote;
  quote = {
    ...quote,
    // Apply Slippage based on OrderKind
    ...applySlippage(quote, slippageBps),
    // Adjust the sellAmount to account for the fee.
    // cf: https://learn.cow.fi/tutorial/submit-order
    sellAmount: (BigInt(sellAmount) + BigInt(feeAmount)).toString(),
    feeAmount: "0",
    // Set Referral Code.
    appData:
      "0x5a8bb9f6dd0c7f1b4730d9c5a811c2dfe559e67ce9b5ed6965b05e59b8c86b80",
  };

  const { orderId, orderDigest } = await OrderSigningUtils.generateOrderId(
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
  console.log("Order Digest", orderDigest);
  console.log("Order Uid", orderId);
  let signRequest: SignRequest;
  if (quote.signingScheme === "eip712") {
    const typedData = {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        ...OrderSigningUtils.getEIP712Types(),
      },
      domain: await OrderSigningUtils.getDomain(chainId),
      primaryType: "Order",
      message: quote,
    };
    signRequest = {
      method: "eth_signTypedData_v4",
      chainId,
      params: [owner, JSON.stringify(typedData)],
    };
  } else {
    signRequest = {
      method: "eth_sendTransaction",
      chainId: chainId,
      params: [{ from: owner, ...setPresignatureTx(orderId) }],
    };
  }

  return {
    meta: {
      quote: {
        from,
        quote,
        expiration,
        verified,
      },
      ui: parseWidgetData({
        chainId,
        tokenData,
        quote,
      }),
    },
    transaction: signRequest,
  };
}
