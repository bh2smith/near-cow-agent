import { handleRequest } from "@bitte-ai/agent-sdk";
import { OrderBookApi } from "@cowprotocol/cow-sdk";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("order/", req.url);
  return handleRequest(req, logic, (result) => NextResponse.json(result));
}

async function logic(req: NextRequest): Promise<{ orderUrl: string }> {
  const requestBody = await req.json();
  console.log("Order Request Body", requestBody);
  const orderBookApi = new OrderBookApi({ chainId: requestBody.chainId });

  const orderUid = await orderBookApi.sendOrder(requestBody);
  console.log("Order UID:", orderUid);
  const orderUrl = orderBookApi.getOrderLink(orderUid);
  return { orderUrl };
}
