import { OrderBookApi } from "@cowprotocol/cow-sdk";

import { withCowErrorHandling } from "@/src/lib/error";
import { OrderStatusSchema, parseRequest } from "@/src/lib/schema";

import type { OrderStatusInput } from "@/src/lib/schema";
import type { CompetitionOrderStatus, OrderStatus } from "@cowprotocol/cow-sdk";
import type { NextRequest } from "next/server";

type StatusResponse = {
  order: OrderStatus;
  competition: CompetitionOrderStatus;
};

export async function logic(req: NextRequest): Promise<StatusResponse> {
  const data = parseRequest(req, OrderStatusSchema);
  return handleOrderStatusRequest(data);
}

export async function handleOrderStatusRequest(
  input: OrderStatusInput,
): Promise<StatusResponse> {
  const orderbook = new OrderBookApi({ chainId: input.chainId });
  // Get order: will throw with not found if order doesn't exist.
  const order = await withCowErrorHandling(
    orderbook.getOrderMultiEnv(input.orderUid),
  );
  // Since the above didn't throw =>
  // can retrive competition status because we know the order exists.
  const competition = await orderbook.getOrderCompetitionStatus(input.orderUid);
  console.log("Found competition", competition);
  return { order: order.status, competition };
}
