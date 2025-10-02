import { handleRequest } from "@bitte-ai/agent-sdk";
import { NextResponse } from "next/server";

import { logic } from "./logic";

import type { NextRequest } from "next/server";

export async function GET(req: NextRequest): Promise<NextResponse> {
  console.log("buildCancel/", req.url);
  return handleRequest(req, logic, (result) => NextResponse.json(result));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("sendCancel/", req.url);
  return handleRequest(req, logic, (result) => NextResponse.json(result));
}
