import { getChainById } from "@bitte-ai/agent-sdk";
import { formatUnits } from "viem";

import { isNativeAsset } from "./protocol/util";

import type { TokenInfo } from "@bitte-ai/agent-sdk";
import type { SwapFTData } from "@bitte-ai/types";
import type { OrderParameters } from "@cowprotocol/cow-sdk";

interface SwapDetails {
  chainId: number;
  tokenData: { buy: TokenInfo; sell: TokenInfo };
  quote: OrderParameters;
}

export interface CowTokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoURI: string;
}
/**
 * Fetches the logoURI for a token from the CoW Swap token list.
 * @param identifier Token address (checksummed, lowercase) or symbol.
 * @param by 'address' | 'symbol' - how to search for the token.
 * @returns logoURI string or undefined if not found.
 */
export async function getTokenLogoUri(
  address: string,
  chainId: number,
): Promise<string | undefined> {
  const res = await fetch("https://files.cow.fi/tokens/CowSwap.json");
  if (!res.ok) return undefined;
  const { tokens } = (await res.json()) as { tokens: CowTokenInfo[] };
  console.log(tokens);
  const token = tokens
    .filter((t) => t.chainId === chainId)
    .find((t) => t.address.toLowerCase() === address.toLowerCase());
  console.log(token);
  return token?.logoURI;
}

export async function altGetTokenLogoUri(
  address: string,
  chainId: number,
): Promise<string | undefined> {
  if (isNativeAsset(address)) {
    // TODO: Get other native logos.
    return "https://cryptologos.cc/logos/ethereum-eth-logo.png?v=040";
  }
  const baseUrl = `https://raw.githubusercontent.com/cowprotocol/token-lists/main/src/public/images/${chainId}/${address}/logo.png`;
  // Check it URL resolves.
  const res = await fetch(baseUrl);
  if (res.ok) {
    return baseUrl;
  }
  return undefined;
}

export async function parseWidgetData({
  chainId,
  tokenData,
  quote,
}: SwapDetails): Promise<SwapFTData> {
  const chain = getChainById(chainId);
  return {
    network: {
      name: chain.name,
      icon: "",
    },
    type: "swap",
    fee: quote.feeAmount,
    tokenIn: {
      contractAddress: quote.sellToken,
      amount: formatUnits(BigInt(quote.sellAmount), tokenData.sell.decimals),
      usdValue: 0,
      icon: await getTokenLogoUri(quote.sellToken, chainId),
      ...tokenData.sell,
    },
    tokenOut: {
      contractAddress: quote.buyToken,
      amount: formatUnits(BigInt(quote.buyAmount), tokenData.buy.decimals),
      usdValue: 0,
      icon: await getTokenLogoUri(quote.buyToken, chainId),
      ...tokenData.buy,
    },
  };
}
