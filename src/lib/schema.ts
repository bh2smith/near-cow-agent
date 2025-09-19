import { getAddress } from "viem";
import * as z from "zod";

import type { NextRequest } from "next/server";
import type { ZodType } from "zod"; // TODO: says deprecated, but I can't see where or an alternative.

export function parseRequest<T extends ZodType>(
  req: NextRequest,
  schema: T,
): z.infer<T> {
  const { searchParams } = new URL(req.url);
  const parsed = schema.parse(Object.fromEntries(searchParams.entries()));
  return parsed;
}

export const addressSchema = z
  .string()
  .startsWith("0x")
  .refine((sig) => /^0x[0-9a-fA-F]{40}$/.test(sig), {
    message: "Address must be a 20-byte (40 hex char) string starting with 0x",
  })
  .transform((x) => getAddress(x));

export const signatureSchema = z
  .string()
  .startsWith("0x")
  .refine((sig) => /^0x[0-9a-fA-F]{130}$/.test(sig), {
    message:
      "Signature must be a 65-byte (130 hex char) string starting with 0x",
  });

export const orderUidSchema = z
  .string()
  .startsWith("0x")
  .refine((id) => /^0x[0-9a-fA-F]{112}$/.test(id), {
    message:
      "OrderUid must be a 56-byte (112 hex char) string starting with 0x",
  });

export const chainIdSchema = z.coerce.number().int().positive({
  message: "chainId must be a positive integer",
});

export const CancelOrderSchema = z.object({
  chainId: chainIdSchema,
  orderUid: orderUidSchema,
  signature: signatureSchema.optional(),
});

export type CancelOrderInput = z.infer<typeof CancelOrderSchema>;

export const OrderStatusSchema = z.object({
  chainId: chainIdSchema,
  orderUid: orderUidSchema,
});

export type OrderStatusInput = z.infer<typeof OrderStatusSchema>;

export const OrderHistorySchema = z.object({
  chainId: chainIdSchema,
  evmAddress: addressSchema,
});

export type OrderHistoryInput = z.infer<typeof OrderHistorySchema>;

export const QuoteRequestSchema = z.object({
  chainId: chainIdSchema,
  evmAddress: addressSchema,
  buyToken: z.string(),
  sellToken: z.string(),
  amount: z.coerce.number().positive(),
  orderKind: z
    .enum(["buy", "sell"])
    .describe(
      "Whether the order is a buy order or sell order. Usually inferred from the user's text (I want to buy or I want to sell or swap).",
    ),
  validFor: z.coerce
    .number()
    .max(10800, "validFor cannot exceed 10800 seconds (3 hours)")
    .default(1800)
    .describe(
      "Number of seconds (from now) that the order should be valid for. Max 3 hours (10800).",
    ),
  slippageBps: z.coerce
    .number()
    .default(Number.parseInt(process.env.SLIPPAGE_BPS || "100"))
    .describe(
      "The slippage tolerance for the quote, represented as a percentage in basis points (BPS).",
    ),
  receiver: addressSchema.optional(),
});

export type QuoteRequestInput = z.infer<typeof QuoteRequestSchema>;
