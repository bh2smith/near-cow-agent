import {
  getClientForChain,
  loadTokenMap,
  validateRequest,
  type BlockchainMapping,
} from "@bitte-ai/agent-sdk";
import { unstable_cache } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import type { Chain, PublicClient, Transport } from "viem";
import { COW_SUPPORTED_CHAINS } from "@/src/app/config";

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
      return loadTokenMap(COW_SUPPORTED_CHAINS);
    },
    ["token-map"], // cache key
    {
      revalidate: 86400, // revalidate 24 hours
      tags: ["token-map"],
    },
  );

  return getCachedTokenMap();
}

export function getClient(
  chainId: number,
  alchemy: boolean = true,
): PublicClient<Transport, Chain> {
  // TODO: Return PublicClient<Transport, Chain> from dependency and remove cast.
  return getClientForChain(
    chainId,
    alchemy ? getEnvVar("ALCHEMY_API_KEY") : undefined,
  ) as PublicClient<Transport, Chain>;
}
