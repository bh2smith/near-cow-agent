import type { TokenInfo } from "@bitte-ai/agent-sdk";
import type { OrderParameters } from "@cowprotocol/cow-sdk";
import { formatUnits } from "viem";
import type { SwapFTData } from "@bitte-ai/types";

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
    tokenIn: {
      contractAddress: quote.sellToken,
      amount: formatUnits(BigInt(quote.sellAmount), tokenData.sell.decimals),
      usdValue: 0,
      // TODO(bh2smith): Fetch and return Token Name (https://github.com/BitteProtocol/core/issues/44)
      name: tokenData.sell.symbol,
      ...tokenData.sell,
    },
    tokenOut: {
      contractAddress: quote.buyToken,
      amount: formatUnits(BigInt(quote.buyAmount), tokenData.buy.decimals),
      // TODO: Fix agent-sdk!
      usdValue: 0,
      name: tokenData.buy.symbol,
      ...tokenData.buy,
    },
  };
}
