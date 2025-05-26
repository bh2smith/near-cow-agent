import type { TokenInfo } from "@bitte-ai/agent-sdk";
import type { OrderParameters } from "@cowprotocol/cow-sdk";
import { formatUnits } from "viem";
import type { BaseSwapFTData } from "@bitte-ai/types";

interface SwapDetails {
  chainId: number;
  tokenData: { buy: TokenInfo; sell: TokenInfo };
  quote: OrderParameters;
}

export function parseWidgetData({
  chainId,
  tokenData,
  quote,
}: SwapDetails): BaseSwapFTData {
  return {
    network: {
      name: chainId.toString(),
      icon: "",
    },
    type: "swap",
    fee: quote.feeAmount,
    tokenIn: {
      contractAddress: quote.sellToken,
      amount: formatUnits(BigInt(quote.sellAmount), tokenData.sell.decimals),
    },
    tokenOut: {
      contractAddress: quote.buyToken,
      amount: formatUnits(BigInt(quote.buyAmount), tokenData.buy.decimals),
    },
  };
}
