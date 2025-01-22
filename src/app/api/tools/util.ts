import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import {
  loadTokenMap,
  validateRequest,
  BlockchainMapping,
} from "@bitte-ai/agent-sdk";
import { SignRequestData } from "near-safe";

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

export function getSafeSaltNonce(): string {
  const bitteProtocolSaltNonce = "130811896738364156958237239906781888512";
  return process.env.SAFE_SALT_NONCE || bitteProtocolSaltNonce;
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

export async function handleRequest<T>(
  logic: () => Promise<T>,
): Promise<NextResponse> {
  try {
    const result = await logic();
    console.log("Responding with", result);
    return NextResponse.json(result, { status: 200 });
  } catch (e: unknown) {
    const message = (e as Error).message;
    console.error(message);
    return NextResponse.json({ message }, { status: 400 });
  }
}

export interface TxData {
  transaction: SignRequestData;
  meta?: unknown;
}
