import { handleRequest } from "@bitte-ai/agent-sdk";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createOrder } from "./create";

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("order/", req.url);
  return handleRequest(req, logic, (result) => NextResponse.json(result));
}

async function logic(
  req: NextRequest,
): Promise<{ orderUrl?: string; error?: string }> {
  const requestBody = await req.json();
  console.log("Order Request Body", requestBody);
  return createOrder(requestBody);
}
