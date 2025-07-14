import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  soneiumMainnet,
} from "@account-kit/infra";
import {
  loadTokenMap,
  validateRequest,
  type BlockchainMapping,
} from "@bitte-ai/agent-sdk";
import { Network } from "near-safe";
import { unstable_cache } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { createPublicClient, http } from "viem";

export async function validateNextRequest(
  req: NextRequest,
): Promise<NextResponse | null> {
  return validateRequest<NextRequest, NextResponse>(
    req,
    (data: unknown, init?: { status?: number }) =>
      NextResponse.json(data, init),
  );
}

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not set`);
  }
  return value;
}
export function getZerionKey(): string {
  return getEnvVar("ZERION_KEY");
}

export async function getTokenMap(): Promise<BlockchainMapping> {
  const getCachedTokenMap = unstable_cache(
    async () => {
      console.log("Loading TokenMap...");
      return loadTokenMap(getEnvVar("TOKEN_MAP_URL"));
    },
    ["token-map"], // cache key
    {
      revalidate: 86400, // revalidate 24 hours
      tags: ["token-map"],
    },
  );

  return getCachedTokenMap();
}

const ALCHEMY_CHAINS = [
  mainnet,
  base,
  polygon,
  arbitrum,
  optimism,
  soneiumMainnet,
];

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

export const getAlchemyRpcUrl = (chainId: number): string => {
  if (ALCHEMY_API_KEY) {
    console.log("Using Alchemy RPC");
    const alchemyChain = ALCHEMY_CHAINS.find((c) => c.id === chainId);
    const alchemyRpcBase = alchemyChain?.rpcUrls?.alchemy?.http?.[0];
    if (alchemyRpcBase) {
      return `${alchemyRpcBase}/${ALCHEMY_API_KEY}`;
    }
    console.warn("No Alchemy Base URL available");
  }
  console.log("using public RPC for chainId", chainId);
  return Network.fromChainId(chainId).rpcUrl;
};

export const getClientWithAlchemy = (chainId: number) => {
  const chain = ALCHEMY_CHAINS.find((c) => c.id === chainId);
  return createPublicClient({
    chain,
    transport: http(getAlchemyRpcUrl(chainId)),
  });
};
