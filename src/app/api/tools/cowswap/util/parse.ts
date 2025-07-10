import type { NextRequest } from "next/server";
import {
  type OrderQuoteRequest,
  OrderQuoteSideKindSell,
  SigningScheme,
} from "@cowprotocol/cow-sdk";
import { formatUnits, parseUnits } from "viem";
import { getTokenDetails } from "@bitte-ai/agent-sdk";
import type { BlockchainMapping, TokenInfo } from "@bitte-ai/agent-sdk";
import { sufficientSellTokenBalance } from "../../balance";

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
    sellAmountBeforeFee: sellAmount,
    evmAddress: sender,
  } = requestBody;
  if (sellAmount === "0") {
    throw new Error("Sell amount cannot be 0");
  }

  const [sellTokenData, buyTokenData] = await Promise.all([
    getTokenDetails(chainId, sellToken, tokenMap),
    getTokenDetails(chainId, buyToken, tokenMap),
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

  const amount = parseUnits(sellAmount, sellTokenData.decimals);
  const { sufficient, balance } = await sufficientSellTokenBalance(
    chainId,
    sender,
    amount,
    sellTokenData.address,
  );
  if (!sufficient) {
    const have =
      balance !== null
        ? formatUnits(balance, sellTokenData.decimals)
        : "unknown";
    throw new Error(
      `Insufficient SellToken Balance: Have ${have} - Need ${sellAmount}`,
    );
  }
  const sellAmt = parseUnits(sellAmount, sellTokenData.decimals).toString();
  return {
    chainId,
    quoteRequest: {
      sellToken: sellTokenData.address,
      buyToken: buyTokenData.address,
      sellAmountBeforeFee: sellAmt,
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
