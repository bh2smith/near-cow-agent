import type { TokenInfo } from "@bitte-ai/agent-sdk";
import type { SwapFTData } from "@bitte-ai/types";
import type { OrderParameters } from "@cowprotocol/cow-sdk";
import { formatUnits } from "viem";

interface SwapDetails {
  chainId: number;
  tokenData: { buy: TokenInfo; sell: TokenInfo };
  quote: OrderParameters;
}

export function parseSwapData({
  chainId,
  tokenData,
  quote,
}: SwapDetails): SwapFTData {
  return {
    network: {
      name: chainId.toString(),
      icon: "",
    },
    type: "swap",
    tokenIn: {
      name: tokenData.sell.symbol,
      icon: "",
      amount: formatUnits(BigInt(quote.sellAmount), tokenData.sell.decimals),
      usdValue: 0,
    },
    tokenOut: {
      name: tokenData.buy.symbol,
      icon: "",
      amount: formatUnits(BigInt(quote.buyAmount), tokenData.buy.decimals),
      usdValue: 0,
    },
  };
}
