import type { NextRequest } from "next/server";
import type { OrderQuoteSide } from "@cowprotocol/cow-sdk";
import {
  type OrderQuoteRequest,
  OrderQuoteSideKindBuy,
  OrderQuoteSideKindSell,
  SigningScheme,
} from "@cowprotocol/cow-sdk";
import { parseUnits } from "viem";
import { getTokenDetails } from "@bitte-ai/agent-sdk";
import type { BlockchainMapping, TokenInfo } from "@bitte-ai/agent-sdk";
import { assertSufficientBalance } from "../../balance";
import { getClient, isEOA } from "../../util";

export interface ParsedQuoteRequest {
  quoteRequest: OrderQuoteRequest;
  chainId: number;
  tokenData: { buy: TokenInfo; sell: TokenInfo };
}

// TODO(bh2smith): Deprecate this function (or merge with basicParseQuote)
export async function parseQuoteRequest(
  req: NextRequest,
  tokenMap: BlockchainMapping,
): Promise<ParsedQuoteRequest> {
  // TODO - Add Type Guard on Request (to determine better if it needs processing below.)
  const requestBody = await req.json();
  console.log("Raw Request Body:", requestBody);
  // TODO: Validate input with new validation tools:
  const {
    sellToken,
    buyToken,
    chainId,
    sellAmountBeforeFee,
    evmAddress: sender,
  } = requestBody;
  if (sellAmountBeforeFee === "0") {
    throw new Error("Sell amount cannot be 0");
  }
  const client = getClient(chainId);
  const [sellTokenData, buyTokenData] = await Promise.all([
    getTokenDetails(chainId, sellToken, tokenMap, client),
    getTokenDetails(chainId, buyToken, tokenMap, client),
  ]);

  // const sellTokenData = sellTokenAvailable(chainId, balances, sellToken);
  if (!buyTokenData) {
    throw new Error(
      `Buy Token not found '${buyToken}': supply address if known`,
    );
  }
  if (!sellTokenData) {
    throw new Error(
      `Sell Token not found '${sellToken}': supply address if known`,
    );
  }

  const sellAmount = parseUnits(sellAmountBeforeFee, sellTokenData.decimals);
  await assertSufficientBalance(client, sender, sellAmount, sellTokenData);

  return {
    chainId,
    quoteRequest: {
      sellToken: sellTokenData.address,
      buyToken: buyTokenData.address,
      sellAmountBeforeFee: sellAmount.toString(),
      // TODO - change this when we want to enable buy orders.
      kind: OrderQuoteSideKindSell.SELL,
      // TODO - change this when we want to enable alternate recipients.
      receiver: sender,
      from: sender,
      // manually add PRESIGN (since this is a safe);
      signingScheme: SigningScheme.PRESIGN,
    },
    tokenData: {
      buy: buyTokenData,
      sell: sellTokenData,
    },
  };
}

export async function basicParseQuote(
  req: NextRequest,
  // TODO: Replace with Data Provider.
  tokenMap: BlockchainMapping,
): Promise<ParsedQuoteRequest> {
  const requestBody = await req.json();
  const {
    sellToken,
    buyToken,
    chainId,
    amount,
    orderKind,
    evmAddress: sender,
    receiver,
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
  const senderIsEoa = await isEOA(chainId, sender);

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
