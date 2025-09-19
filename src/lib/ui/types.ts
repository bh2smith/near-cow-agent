import type { Address } from "viem";

export type TokenQuery = { chainId: number; address: Address };

// Base token information
export interface BaseTokenInfo {
  symbol: string;
  decimals: number;
  name?: string;
  icon?: string;
  contractAddress?: string;
}

export interface TokenInfo extends BaseTokenInfo {
  amount: string;
  usdValue: number;
}
export interface SwapFTData {
  network: {
    name: string;
    icon: string;
  };
  type: "swap";
  fee: string;
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
}
