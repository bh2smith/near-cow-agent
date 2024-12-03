import { NextRequest, NextResponse } from "next/server";
import { validateRequest as innerValidate } from "@bitteprotocol/agent-sdk";

export async function validateRequest(
  req: NextRequest,
  safeSaltNonce?: string,
): Promise<NextResponse | null> {
  return innerValidate<NextRequest, NextResponse>(req, safeSaltNonce || "0");
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
