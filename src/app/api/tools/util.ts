import { NextRequest, NextResponse } from "next/server";
import { validateRequest as innerValidate } from "@bitteprotocol/agent-sdk";

export async function validateRequest(
  req: NextRequest,
  safeSaltNonce?: string,
): Promise<NextResponse | null> {
  return innerValidate<NextRequest, NextResponse>(req, safeSaltNonce || "0");
}
