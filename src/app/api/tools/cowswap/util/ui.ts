import type { TokenInfo } from "@bitte-ai/agent-sdk";
import type { OrderParameters } from "@cowprotocol/cow-sdk";
import { formatUnits } from "viem";

interface SwapDetails {
  chainId: number;
  tokenData: { buy: TokenInfo; sell: TokenInfo };
  quote: OrderParameters;
}

export interface SwapFTData {
  network: {
    name: string;
    icon: string;
  };
  type: "swap";
  fee: string;
  tokenIn: {
    address: string;
    amount: string;
  };
  tokenOut: {
    address: string;
    amount: string;
  };
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
    tokenIn: {
      address: quote.sellToken,
      amount: formatUnits(BigInt(quote.sellAmount), tokenData.sell.decimals),
    },
    tokenOut: {
      address: quote.buyToken,
      amount: formatUnits(BigInt(quote.buyAmount), tokenData.buy.decimals),
    },
  };
}
