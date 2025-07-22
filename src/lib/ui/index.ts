export * from "./icon";
export * from "./types";

import { getChainById } from "@bitte-ai/agent-sdk";
import { formatUnits } from "viem";
import { ZerionAPI } from "zerion-sdk";

import { getZerionKey } from "@/src/app/config";

import { CHAIN_ICONS } from "./icon";

import type { TokenInfo } from "@bitte-ai/agent-sdk";
import type { SwapFTData } from "@bitte-ai/types";
import type { OrderParameters } from "@cowprotocol/cow-sdk";
import type { Address } from "viem";

interface SwapDetails {
  chainId: number;
  tokenData: { buy: TokenInfo; sell: TokenInfo };
  quote: OrderParameters;
}

export async function parseWidgetData({
  chainId,
  tokenData,
  quote,
}: SwapDetails): Promise<SwapFTData> {
  const chain = getChainById(chainId);
  // TODO(bh2smith): Enable Price Agent https://github.com/bh2smith/price-agent
  // const [sellPrice, buyPrice] = await Promise.all([
  //   externalPriceFeed({ chainId, address: quote.sellToken }),
  //   externalPriceFeed({ chainId, address: quote.buyToken }),
  // ]);
  const zerion = new ZerionAPI(getZerionKey());
  const [sellData, buyData] = await Promise.all([
    zerion.getToken({ chainId, address: quote.sellToken as Address }),
    zerion.getToken({ chainId, address: quote.buyToken as Address }),
  ]);

  const sellPrice = sellData.attributes.market_data.price;
  const buyPrice = buyData.attributes.market_data.price;

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
      icon: sellData.attributes.icon.url,
      ...tokenData.sell,
    },
    tokenOut: {
      contractAddress: quote.buyToken,
      amount: buyAmount,
      usdValue: parseFloat(buyAmount) * (buyPrice ?? 0),
      icon: buyData.attributes.icon.url,
      ...tokenData.buy,
    },
  };
}
