import { getChainById } from "@bitte-ai/agent-sdk";
import { formatUnits } from "viem";

import { externalPriceFeed } from "./external";
import { isNativeAsset } from "./protocol/util";

import type { TokenInfo } from "@bitte-ai/agent-sdk";
import type { SwapFTData } from "@bitte-ai/types";
import type { OrderParameters } from "@cowprotocol/cow-sdk";

interface SwapDetails {
  chainId: number;
  tokenData: { buy: TokenInfo; sell: TokenInfo };
  quote: OrderParameters;
}
const bucketUrl = "https://storage.googleapis.com/bitte-public";
const tokensUrl = `${bucketUrl}/intents/tokens`;
const chainsUrl = `${bucketUrl}/intents/chains`;

export const NATIVE_ASSET_ICONS: Record<number, string> = {
  1: `${tokensUrl}/eth_token.svg`,
  100: `${tokensUrl}/xdai_token.svg`,
  137: `${chainsUrl}/polygon.svg`, // TODO: GET TOKEN.
  8453: `${tokensUrl}/eth_token.svg`,
  42161: `${tokensUrl}/eth_token.svg`,
  43114: `${chainsUrl}/avax.svg`, // TODO: GET TOKEN.
  11155111: `${tokensUrl}/eth_token.svg`,
};

export const CHAIN_ICONS: Record<number, string> = {
  1: `${chainsUrl}/eth.svg`,
  100: `${chainsUrl}/gnosis.svg`,
  137: `${chainsUrl}/polygon.svg`,
  8453: `${chainsUrl}/base.svg`,
  42161: `${chainsUrl}/arbi.svg`,
  43114: `${chainsUrl}/avax.svg`,
  11155111: `${chainsUrl}/eth.svg`,
};

export async function getCoWLogo(
  address: string,
  chainId: number,
): Promise<string | undefined> {
  if (isNativeAsset(address)) {
    return NATIVE_ASSET_ICONS[chainId];
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

  const [sellPrice, buyPrice] = await Promise.all([
    externalPriceFeed({ chainId, address: quote.sellToken }),
    externalPriceFeed({ chainId, address: quote.buyToken }),
  ]);
  console.log(
    `Retrieved Prices: sellTokenPrice:${sellPrice}, buyTokenPrice:${buyPrice}`,
  );
  const sellAmount = formatUnits(
    BigInt(quote.sellAmount),
    tokenData.sell.decimals,
  );
  const buyAmount = formatUnits(
    BigInt(quote.buyAmount),
    tokenData.buy.decimals,
  );

  return {
    network: {
      name: chain.name,
      icon: CHAIN_ICONS[chainId] ?? "",
    },
    type: "swap",
    fee: quote.feeAmount,
    tokenIn: {
      contractAddress: quote.sellToken,
      amount: sellAmount,
      usdValue: parseFloat(sellAmount) * (sellPrice ?? 0),
      ...tokenData.sell,
    },
    tokenOut: {
      contractAddress: quote.buyToken,
      amount: buyAmount,
      usdValue: parseFloat(buyAmount) * (buyPrice ?? 0),
      ...tokenData.buy,
    },
  };
}
