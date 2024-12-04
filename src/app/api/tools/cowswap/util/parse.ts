import { NextRequest } from "next/server";
import {
  OrderQuoteRequest,
  OrderQuoteSideKindSell,
  SigningScheme,
} from "@cowprotocol/cow-sdk";
import { getAddress, isAddress, parseUnits } from "viem";
import { NATIVE_ASSET } from "./protocol";
import {
  BlockchainMapping,
  getSafeBalances,
  getTokenDetails,
  TokenBalance,
  TokenInfo,
} from "@bitteprotocol/agent-sdk";

export interface ParsedQuoteRequest {
  quoteRequest: OrderQuoteRequest;
  chainId: number;
}

export async function parseQuoteRequest(
  req: NextRequest,
  tokenMap: BlockchainMapping,
  zerionKey?: string,
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
    safeAddress: sender,
  } = requestBody;
  if (sellAmountBeforeFee === "0") {
    throw new Error("Sell amount cannot be 0");
  }

  const [balances, buyTokenData] = await Promise.all([
    getSafeBalances(chainId, sender, zerionKey),
    getTokenDetails(chainId, buyToken, tokenMap),
  ]);
  const sellTokenData = sellTokenAvailable(balances, sellToken);

  return {
    chainId,
    quoteRequest: {
      sellToken: sellTokenData.address,
      buyToken: buyTokenData.address,
      sellAmountBeforeFee: parseUnits(
        sellAmountBeforeFee,
        sellTokenData.decimals,
      ).toString(),
      // TODO - change this when we want to enable buy orders.
      kind: OrderQuoteSideKindSell.SELL,
      // TODO - change this when we want to enable alternate recipients.
      receiver: sender,
      from: sender,
      // manually add PRESIGN (since this is a safe);
      signingScheme: SigningScheme.PRESIGN,
    },
  };
}

function sellTokenAvailable(
  balances: TokenBalance[],
  sellTokenSymbolOrAddress: string,
): TokenInfo {
  let balance: TokenBalance | undefined;
  if (isAddress(sellTokenSymbolOrAddress, { strict: false })) {
    balance = balances.find(
      (b) =>
        getAddress(b.tokenAddress || NATIVE_ASSET) ===
        getAddress(sellTokenSymbolOrAddress),
    );
  } else {
    balance = balances.find(
      (b) =>
        b.token?.symbol.toLowerCase() ===
        sellTokenSymbolOrAddress.toLowerCase(),
    );
  }
  if (balance) {
    return {
      address: getAddress(balance.tokenAddress || NATIVE_ASSET),
      decimals: balance.token?.decimals || 18,
      symbol: balance.token?.symbol || "UNKONWN",
    };
  }
  throw new Error("Sell token not found in balances");
}
