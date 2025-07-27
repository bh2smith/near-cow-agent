export * from "./icon";
export * from "./types";

import { getChainById } from "@bitte-ai/agent-sdk";
import { formatUnits } from "viem";

import { externalPriceFeed } from "../external";

import { CHAIN_ICONS, CowIcons, getIcon, IconArchive } from "./icon";

import type { TokenQuery } from "./types";
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
  // TODO: Multi Query.
  const sellData = await getPriceAndIcon({
    chainId,
    address: quote.sellToken as Address,
  });
  const buyData = await getPriceAndIcon({
    chainId,
    address: quote.buyToken as Address,
  });

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
    fee: quote.feeAmount,
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
  return {
    price: (await externalPriceFeed(args)) || 0,
    // TODO: Use Price/Token Agent for Icons.
    icon: (await getIcon(args)) || "",
  };
}
