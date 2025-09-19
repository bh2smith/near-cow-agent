import { OrderBookApi, type Order } from "@cowprotocol/sdk-order-book";

import { withCowErrorHandling } from "@/src/lib/error";
import {
  type OrderHistoryInput,
  OrderHistorySchema,
  parseRequest,
} from "@/src/lib/schema";

import type { NextRequest } from "next/server";

export async function logic(req: NextRequest): Promise<Order[]> {
  const data: OrderHistoryInput = parseRequest(req, OrderHistorySchema);
  return getOrderHistory(data);
}

export async function getOrderHistory({
  chainId, // TODO: Allow undefined and fetch for all supported networks.
  evmAddress,
}: OrderHistoryInput): Promise<Order[]> {
  const orderBookApi = new OrderBookApi({ chainId });

  return withCowErrorHandling(orderBookApi.getOrders({ owner: evmAddress }));
}
