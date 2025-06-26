import type { NextRequest } from "next/server";
import {
  type OrderQuoteRequest,
  OrderQuoteSideKindSell,
  SigningScheme,
} from "@cowprotocol/cow-sdk";
import { getAddress, isAddress, parseUnits } from "viem";
import { NATIVE_ASSET } from "./protocol";
import { getTokenDetails } from "@bitte-ai/agent-sdk";
import type { BlockchainMapping, TokenInfo } from "@bitte-ai/agent-sdk";
import type { TokenBalance } from "zerion-sdk";
import { getBalances } from "../../balance";

export interface ParsedQuoteRequest {
  quoteRequest: OrderQuoteRequest;
  chainId: number;
  tokenData: { buy: TokenInfo; sell: TokenInfo };
}

export async function parseQuoteRequest(
  req: NextRequest,
  tokenMap: BlockchainMapping,
  zerionKey: string,
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

  const [balances, buyTokenData] = await Promise.all([
    getBalances(sender, zerionKey),
    getTokenDetails(chainId, buyToken, tokenMap),
  ]);
  const sellTokenData = sellTokenAvailable(chainId, balances, sellToken);
  if (!buyTokenData) {
    throw new Error(`Buy token not found on chain ${chainId}: ${buyToken}`);
  }
  console.log("WE IS HERE");
  const sellAmt = parseUnits(
    sellAmountBeforeFee,
    sellTokenData.decimals,
  ).toString();
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

function sellTokenAvailable(
  chainId: number,
  allBalances: TokenBalance[],
  sellTokenSymbolOrAddress: string,
): TokenInfo {
  let balance: TokenBalance | undefined;
  const filteredBalances = allBalances.filter((b) => b.chainId === chainId);
  if (isAddress(sellTokenSymbolOrAddress, { strict: false })) {
    balance = filteredBalances.find(
      (b) =>
        getAddress(b.tokenAddress || NATIVE_ASSET) ===
        getAddress(sellTokenSymbolOrAddress),
    );
  } else {
    balance = filteredBalances.find(
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
