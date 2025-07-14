import type { TokenInfo } from "@bitte-ai/agent-sdk";
import type { OrderParameters } from "@cowprotocol/cow-sdk";
import { formatUnits } from "viem";
import type { SwapFTData } from "@bitte-ai/types";
import { getChainById } from "@bitte-ai/agent-sdk";

interface SwapDetails {
  chainId: number;
  tokenData: { buy: TokenInfo; sell: TokenInfo };
  quote: OrderParameters;
}

export function parseWidgetData({
  chainId,
  tokenData,
  quote,
}: SwapDetails): SwapFTData {
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
      ...tokenData.sell,
    },
    tokenOut: {
      contractAddress: quote.buyToken,
      amount: formatUnits(BigInt(quote.buyAmount), tokenData.buy.decimals),
      usdValue: 0,
      ...tokenData.buy,
    },
  };
}
