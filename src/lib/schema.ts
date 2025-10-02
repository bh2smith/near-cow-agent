import * as z from "zod";

import type { NextRequest } from "next/server";
import type { ZodTypeAny } from "zod"; // TODO: says deprecated, but I can't see where or an alternative.

export function parseRequest<T extends ZodTypeAny>(
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
  });

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

export const BuildCancelOrderSchema = z.object({
  chainId: chainIdSchema,
  orderUid: orderUidSchema,
  // signature: signatureSchema.optional(),
});

export type BuildCancelOrderInput = z.infer<typeof BuildCancelOrderSchema>;

export const SendCancelOrderSchema = z.object({
  cancellationData: z.string(),
  signature: signatureSchema,
});

export type SendCancelOrderInput = z.infer<typeof SendCancelOrderSchema>;

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
