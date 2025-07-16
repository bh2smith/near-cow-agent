import { getChainById, getNativeAsset } from "@bitte-ai/agent-sdk";
import { formatUnits } from "viem";
import { ZerionAPI } from "zerion-sdk";

import { getZerionKey } from "../app/config";

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

export async function getTokenMeta(
  chainId: number,
  address: string,
): Promise<{ icon?: string; price: number }> {
  const zerion = new ZerionAPI(getZerionKey());
  if (isNativeAsset(address)) {
    // Zerion uses lower case for some reason.
    const wrappedAddress = getNativeAsset(chainId).address.toLowerCase();
    const wrappedToken = await zerion.fungibles(wrappedAddress);
    return {
      icon: NATIVE_ASSET_ICONS[chainId],
      price: wrappedToken.attributes.market_data.price,
    };
  }
  try {
    const token = await zerion.fungibles(address.toLowerCase());
    return {
      icon: token.attributes.icon.url,
      price: token.attributes.market_data.price,
    };
  } catch (error) {
    console.warn("Token Meta", error);
    const icon = await altGetTokenLogoUri(address, chainId);
    return {
      ...(icon !== undefined && { icon }),
      price: 0,
    };
  }
}

export async function parseWidgetData({
  chainId,
  tokenData,
  quote,
}: SwapDetails): Promise<SwapFTData> {
  const chain = getChainById(chainId);

  const [sellTokenDetails, buyTokenDetails] = await Promise.all([
    getTokenMeta(chainId, quote.sellToken),
    getTokenMeta(chainId, quote.buyToken),
  ]);
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
      usdValue: parseFloat(sellAmount) * sellTokenDetails.price,
      ...tokenData.sell,
      ...sellTokenDetails,
    },
    tokenOut: {
      contractAddress: quote.buyToken,
      amount: buyAmount,
      usdValue: parseFloat(buyAmount) * buyTokenDetails.price,
      ...tokenData.buy,
      ...sellTokenDetails,
    },
  };
}
