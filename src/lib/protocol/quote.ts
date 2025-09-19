import { getTokenDetails, wrapMetaTransaction } from "@bitte-ai/agent-sdk/evm";
import {
  OrderQuoteSideKindBuy,
  OrderQuoteSideKindSell,
  SigningScheme,
} from "@cowprotocol/cow-sdk";
import { parseUnits } from "viem";

import { isEOA, sellTokenApprovalTx } from "./util";

import type { QuoteRequestInput } from "../schema";
import type { EthRpc, ParsedQuoteRequest } from "../types";
import type { BlockchainMapping, TokenInfo } from "@bitte-ai/agent-sdk/evm";
import type { MetaTransaction } from "@bitte-ai/types";
import type { OrderParameters, OrderQuoteSide } from "@cowprotocol/cow-sdk";
import type { Address } from "viem";

export async function basicParseQuote(
  client: EthRpc,
  req: QuoteRequestInput,
  // TODO: Replace with Data Provider.
  tokenMap: BlockchainMapping,
): Promise<ParsedQuoteRequest> {
  const {
    sellToken,
    buyToken,
    chainId,
    amount,
    orderKind,
    evmAddress,
    validFor,
    receiver,
    slippageBps,
  } = req;
  console.log("Quote Request", req);

  const [sellTokenData, buyTokenData] = await Promise.all([
    getTokenDetails(chainId, sellToken, tokenMap),
    getTokenDetails(chainId, buyToken, tokenMap),
  ]);
  if (!buyTokenData) {
    throw new Error(`Could not determine buyToken info for: ${buyToken}`);
  }
  if (!sellTokenData) {
    throw new Error(`Could not determine sellToken info for: ${sellToken}`);
  }
  const orderQuoteSide = getOrderQuoteSide(amount.toString(), orderKind, {
    buy: buyTokenData,
    sell: sellTokenData,
  });
  const senderIsEoa = await isEOA(client, evmAddress);

  return {
    chainId,
    quoteRequest: {
      sellToken: sellTokenData.address,
      buyToken: buyTokenData.address,
      ...orderQuoteSide,
      receiver: receiver ?? evmAddress,
      from: evmAddress,
      signingScheme: senderIsEoa ? SigningScheme.EIP712 : SigningScheme.PRESIGN,
      ...(validFor ? { validFor } : {}),
    },
    tokenData: {
      buy: buyTokenData,
      sell: sellTokenData,
    },
    slippageBps,
  };
}

function getOrderQuoteSide(
  amount: string,
  orderKind: string,
  tokenData: { buy: TokenInfo; sell: TokenInfo },
): OrderQuoteSide {
  if (orderKind === OrderQuoteSideKindSell.SELL) {
    const sellAmountBeforeFee = parseUnits(
      amount,
      tokenData.sell.decimals,
    ).toString();
    return { sellAmountBeforeFee, kind: orderKind };
  } else if (orderKind === OrderQuoteSideKindBuy.BUY) {
    const buyAmountAfterFee = parseUnits(
      amount,
      tokenData.buy.decimals,
    ).toString();
    return { buyAmountAfterFee, kind: OrderQuoteSideKindBuy.BUY };
  }
  throw new Error(`Invalid order kind: ${orderKind}`);
}

// This function mutates input data!
// quoteRequest.sellToken & notes.
export async function preliminarySteps(
  client: EthRpc,
  from: Address,
  // Mutated if necessary
  orderParams: OrderParameters,
  notes: string[],
  nativeSell: boolean,
): Promise<MetaTransaction[]> {
  const steps: MetaTransaction[] = [];
  if (nativeSell) {
    // Technically, should only need to wrap their sellAmount - current WETH Balance, but this might be confusing.
    const wrapTx = wrapMetaTransaction(
      client.chain.id,
      BigInt(orderParams.sellAmount),
    );
    steps.push(wrapTx);
    notes.push("Wrap Native Asset for Sell Token.");
  }
  const approvalTx = await sellTokenApprovalTx({
    from,
    sellToken: orderParams.sellToken,
    client,
    sellAmount: orderParams.sellAmount,
  });
  if (approvalTx) {
    notes.push("Set Sell Token Approval");
    steps.push(approvalTx);
  }
  return steps;
}
