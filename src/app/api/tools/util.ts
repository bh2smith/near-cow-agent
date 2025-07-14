import { type NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import {
  getChainById,
  loadTokenMap,
  validateRequest,
  type BlockchainMapping,
} from "@bitte-ai/agent-sdk";
import type { Address, PublicClient } from "viem";
import { createPublicClient, http, isHex } from "viem";

export async function validateNextRequest(
  req: NextRequest,
): Promise<NextResponse | null> {
  return validateRequest<NextRequest, NextResponse>(
    req,
    (data: unknown, init?: { status?: number }) =>
      NextResponse.json(data, init),
  );
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value) {
    if (defaultValue) {
      return defaultValue;
    }
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
      return loadTokenMap(
        getEnvVar(
          "TOKEN_MAP_URL",
          "https://raw.githubusercontent.com/BitteProtocol/core/refs/heads/main/public/tokenMap.json",
        ),
      );
    },
    ["token-map"], // cache key
    {
      revalidate: 86400, // revalidate 24 hours
      tags: ["token-map"],
    },
  );

  return getCachedTokenMap();
}

export async function isEOA(
  chainId: number,
  address: Address,
): Promise<boolean> {
  const codeAt = await getClient(chainId).getCode({ address });
  return !isHex(codeAt);
}

export function getClient(chainId: number): PublicClient {
  const client = createPublicClient({
    chain: getChainById(chainId),
    transport: http(),
  });
  return client;
}
