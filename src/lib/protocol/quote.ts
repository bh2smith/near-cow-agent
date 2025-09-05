import { getTokenDetails, wrapMetaTransaction } from "@bitte-ai/agent-sdk";
import {
  OrderQuoteSideKindBuy,
  OrderQuoteSideKindSell,
  SigningScheme,
} from "@cowprotocol/cow-sdk";
import { isHex, parseUnits } from "viem";

import { sellTokenApprovalTx } from "./util";

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
    validFor,
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
      ...(validFor ? { validFor } : {}),
    },
    tokenData: {
      buy: buyTokenData,
      sell: sellTokenData,
    },
    slippageBps: slippageBps ?? slippageDefault,
  };
}

export async function isEOA(
  client: EthRpc,
  address: Address,
): Promise<boolean> {
  const code = await client.getCode({ address });

  if (!code || code === "0x" || code === "0x0") return true;

  // EIP-7702 delegation indicator: 0xef0100 || <20-byte address>
  // Hex prefix bytes: ef 01 00  => "0xef0100"
  const normalized = code.toLowerCase();
  if (normalized.startsWith("0xef0100")) {
    return true; // EOA with EIP-7702 delegation
  }

  return false; // regular contract account
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
