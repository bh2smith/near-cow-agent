import type { TokenInfo } from "@bitte-ai/agent-sdk";
import type { SwapFTData } from "@bitte-ai/types";
import type { OrderParameters } from "@cowprotocol/cow-sdk";
import { formatUnits } from "viem";

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
  return {
    network: {
      name: chainId.toString(),
      icon: "",
    },
    type: "swap",
    fee: quote.feeAmount,
    tokenOut: {
      address: quote.buyToken,
      amount: formatUnits(BigInt(quote.buyAmount), tokenData.buy.decimals),
    },
    tokenIn: {
      address: quote.sellToken,
      amount: formatUnits(BigInt(quote.sellAmount), tokenData.sell.decimals),
    },
  };
}
