import type { NextRequest } from "next/server";
import {
  type OrderQuoteRequest,
  OrderQuoteSideKindSell,
  SigningScheme,
} from "@cowprotocol/cow-sdk";
import { parseUnits } from "viem";
import { getTokenDetails } from "@bitte-ai/agent-sdk";
import type { BlockchainMapping, TokenInfo } from "@bitte-ai/agent-sdk";
import { assertSufficientBalance } from "../../balance";
import { getClientWithAlchemy } from "../../util";

export interface ParsedQuoteRequest {
  quoteRequest: OrderQuoteRequest;
  chainId: number;
  tokenData: { buy: TokenInfo; sell: TokenInfo };
}

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
  const client = getClientWithAlchemy(chainId);
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
  await assertSufficientBalance(chainId, sender, sellAmount, sellTokenData);

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
