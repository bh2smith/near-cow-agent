import { NextRequest, NextResponse } from "next/server";
import {
  getTokenDetails,
  loadTokenMap,
  validateRequest,
  BlockchainMapping,
} from "@bitteprotocol/agent-sdk";

export async function validateNextRequest(
  req: NextRequest,
  safeSaltNonce?: string,
): Promise<NextResponse | null> {
  return validateRequest<NextRequest, NextResponse>(
    req,
    safeSaltNonce || "0",
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
  return getEnvVar("ZERION_API_KEY");
}

export function getSafeSaltNonce(): string {
  const bitteProtocolSaltNonce = "130811896738364156958237239906781888512";
  return process.env.SAFE_SALT_NONCE || bitteProtocolSaltNonce;
}

let cachedTokenMap: BlockchainMapping | null = null;

async function getTokenMap(): Promise<BlockchainMapping> {
  if (!cachedTokenMap) {
    console.log("Loading TokenMap...");
    cachedTokenMap = await loadTokenMap(getEnvVar("TOKEN_MAP_URL"));
  }
  return cachedTokenMap;
}

export async function tokenDetails(chainId: number, symbolOrAddress: string) {
  const tokenMap = await getTokenMap();
  return getTokenDetails(chainId, symbolOrAddress, tokenMap);
}
