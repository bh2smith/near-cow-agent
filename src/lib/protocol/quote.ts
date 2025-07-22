import { getTokenDetails, wrapMetaTransaction } from "@bitte-ai/agent-sdk";
import {
  OrderQuoteSideKindBuy,
  OrderQuoteSideKindSell,
  SigningScheme,
} from "@cowprotocol/cow-sdk";
import { isHex, parseUnits } from "viem";

import { isNativeAsset, sellTokenApprovalTx } from "./util";

import type { EthRpc, ParsedQuoteRequest, QuoteRequestBody } from "../types";
import type { BlockchainMapping, TokenInfo } from "@bitte-ai/agent-sdk";
import type { MetaTransaction } from "@bitte-ai/types";
import type { OrderParameters, OrderQuoteSide } from "@cowprotocol/cow-sdk";
import type { Address } from "viem";

const slippageDefault = Number.parseInt(process.env.SLIPPAGE_BPS || "100");

export async function basicParseQuote(
  client: EthRpc,
  requestBody: QuoteRequestBody,
  // TODO: Replace with Data Provider.
  tokenMap: BlockchainMapping,
): Promise<ParsedQuoteRequest> {
  const {
    sellToken,
    buyToken,
    chainId,
    amount,
    orderKind,
    evmAddress: sender,
    receiver,
    slippageBps,
  } = requestBody;
  console.log("Quote Request Body", requestBody);

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
  const orderQuoteSide = getOrderQuoteSide(amount, orderKind, {
    buy: buyTokenData,
    sell: sellTokenData,
  });
  const senderIsEoa = await isEOA(client, sender);

  return {
    chainId,
    quoteRequest: {
      sellToken: sellTokenData.address,
      buyToken: buyTokenData.address,
      ...orderQuoteSide,
      receiver: receiver ?? sender,
      from: sender,
      signingScheme: senderIsEoa ? SigningScheme.EIP712 : SigningScheme.PRESIGN,
    },
    tokenData: {
      buy: buyTokenData,
      sell: sellTokenData,
    },
    slippageBps: slippageBps ?? slippageDefault,
  };
}

async function isEOA(client: EthRpc, address: Address): Promise<boolean> {
  const codeAt = await client.getCode({ address });
  return !isHex(codeAt);
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
): Promise<MetaTransaction[]> {
  const steps: MetaTransaction[] = [];
  if (isNativeAsset(orderParams.sellToken)) {
    const wrapTx = wrapMetaTransaction(
      client.chain.id,
      BigInt(orderParams.sellAmount),
    );
    steps.push(wrapTx);

    // Mutate Quote SellToken from native asset to wrapped version and push to notes.
    orderParams.sellToken = wrapTx.to;
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
