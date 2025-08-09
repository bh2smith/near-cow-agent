import * as z from "zod";

import type { NextRequest } from "next/server";
import type { ZodTypeAny } from "zod";

export function parseRequest<T extends ZodTypeAny>(
  req: NextRequest,
  schema: T,
): z.infer<T> {
  const { searchParams } = new URL(req.url);
  const parsed = schema.parse(Object.fromEntries(searchParams.entries()));
  return parsed;
}

export const signatureSchema = z
  .string()
  .startsWith("0x")
  .refine((sig) => /^0x[0-9a-fA-F]{130}$/.test(sig), {
    message:
      "Signature must be a 65-byte (130 hex char) string starting with 0x",
  });

export const CancelOrderSchema = z.object({
  chainId: z.coerce.number().int().positive({
    message: "chainId must be a positive integer",
  }),
  orderUid: z
    .string()
    .startsWith("0x")
    .length(66, { message: "orderUid must be a 66-character hex string" }),
  signature: signatureSchema.optional(),
});

export type CancelOrderInput = z.infer<typeof CancelOrderSchema>;
