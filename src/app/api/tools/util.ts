import { NextRequest, NextResponse } from "next/server";
import { validateRequest as innerValidate } from "@bitteprotocol/agent-sdk";
import { safeSaltNonce } from "../constants";

export async function validateRequest(
  req: NextRequest,
): Promise<NextResponse | null> {
  if (!safeSaltNonce) {
    throw new Error("SAFE_SALT_NONCE is not set");
  }
  return innerValidate<NextRequest, NextResponse>(req, safeSaltNonce);
}
