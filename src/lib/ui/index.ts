export * from "./icon";
export * from "./types";

import { getChainById } from "@bitte-ai/agent-sdk/evm";
import { formatUnits } from "viem";
import { ZerionAPI } from "zerion-sdk";

import { getZerionKey } from "@/src/app/config";

import { CHAIN_ICONS } from "./icon";

import type { TokenQuery, SwapFTData } from "./types";
import type { TokenInfo } from "@bitte-ai/agent-sdk/evm";
import type { OrderParameters } from "@cowprotocol/sdk-order-book";
import type { Address } from "viem";

interface SwapDetails {
  chainId: number;
  feeAmount: string;
  tokenData: { buy: TokenInfo; sell: TokenInfo };
  quote: OrderParameters;
}

export async function parseWidgetData({
  chainId,
  feeAmount,
  tokenData,
  quote,
}: SwapDetails): Promise<SwapFTData> {
  const chain = getChainById(chainId);
  // TODO(bh2smith): Enable Price Agent https://github.com/bh2smith/price-agent
  // const [sellPrice, buyPrice] = await Promise.all([
  //   externalPriceFeed({ chainId, address: quote.sellToken }),
  //   externalPriceFeed({ chainId, address: quote.buyToken }),
  // ]);

  const [sellData, buyData] = await Promise.all([
    getPriceAndIcon({ chainId, address: quote.sellToken as Address }),
    getPriceAndIcon({ chainId, address: quote.buyToken as Address }),
  ]);

  console.log(
    `Retrieved Prices: sellTokenPrice:${sellData.price}, buyTokenPrice:${buyData.price}`,
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
    fee: formatUnits(BigInt(feeAmount), tokenData.sell.decimals),
    tokenIn: {
      // TODO: Remove this duplicated field.
      contractAddress: quote.sellToken,
      amount: sellAmount,
      usdValue: parseFloat(sellAmount) * (sellData.price ?? 0),
      ...sellData,
      ...tokenData.sell,
    },
    tokenOut: {
      contractAddress: quote.buyToken,
      amount: buyAmount,
      usdValue: parseFloat(buyAmount) * (buyData.price ?? 0),
      ...buyData,
      ...tokenData.buy,
    },
  };
}

export async function getPriceAndIcon(
  args: TokenQuery,
): Promise<{ price: number; icon: string }> {
  const zerion = new ZerionAPI(getZerionKey());
  const { attributes } = await zerion.getToken(args);
  return {
    price: attributes.market_data.price || 0,
    icon: attributes.icon?.url || "",
  };
}
