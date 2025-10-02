import { getChainById } from "@bitte-ai/agent-sdk/evm";
import { type Address } from "viem";

type Asset = {
  address: Address;
  symbol: string;
  decimals: number;
};

type WrappedAsset = {
  chainId: number;
  wrappedNative: Asset;
};

type WrappedMap = Record<number, Asset>;

export type WrappedNative = {
  address: Address;
  symbol: string;
  scanUrl: string;
  decimals: number;
};

const SUPER_CHAIN_WETH = "0x4200000000000000000000000000000000000006";

const wrapped: WrappedAsset[] = [
  {
    // Ethereum Mainnet
    chainId: 1,
    wrappedNative: {
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      symbol: "WETH",
      decimals: 18,
    },
  },
  {
    // Gnosis Chain
    chainId: 100,
    wrappedNative: {
      address: "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d",
      symbol: "WxDAI",
      decimals: 18,
    },
  },
  {
    // Polygon
    chainId: 137,
    wrappedNative: {
      address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      symbol: "WMATIC",
      decimals: 18,
    },
  },
  {
    // Base
    chainId: 8453,
    wrappedNative: {
      address: SUPER_CHAIN_WETH,
      symbol: "WETH",
      decimals: 18,
    },
  },
  {
    // Sepolia
    chainId: 11155111,
    wrappedNative: {
      address: "0xfff9976782d46cc05630d1f6ebab18b2324d6b14",
      symbol: "WETH",
      decimals: 18,
    },
  },
];

export const wrappedMap: WrappedMap = wrapped.reduce((acc, item) => {
  acc[item.chainId] = item.wrappedNative;
  return acc;
}, {} as WrappedMap);

export function getWrappedNative(chainId: number): WrappedNative {
  const chain = getChainById(chainId);

  const weth = wrappedMap[chainId];
  if (!weth) {
    throw new Error(
      `Couldn't find wrapped address for Network ${chain.name} (chainId=${chainId}). Please report to https://github.com/bh2smith/wraptor-agent/issues`,
    );
  }
  return {
    ...weth,
    scanUrl: `${chain.blockExplorers?.default.url}/address/${weth.address}`,
  };
}
