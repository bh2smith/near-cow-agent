import { Address, isAddress } from "viem";
import { z } from "zod";

const evmAddressSchema = z.custom<Address>(
  (val: unknown) => {
    return typeof val === "string" && isAddress(val, { strict: false });
  },
  {
    message: "Invalid EVM address",
  },
);

const parseBoolean = z.preprocess((v) => {
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(s)) return true; // allowed "true" strings
    if (["false", "0", "no", "off", ""].includes(s)) return false; // allowed "false" strings
  }
  return v; // let z.boolean() handle booleans or fail on anything else
}, z.boolean());

export const WethSchema = z.object({
  evmAddress: evmAddressSchema,
  chainId: z.coerce.number(),
  amount: z.coerce.number().positive(),
  all: parseBoolean.optional(),
});

export type WethInput = z.infer<typeof WethSchema>;

export type ValidationResult<T> =
  | { ok: true; query: T }
  | { ok: false; error: object };

export function validateQuery<T extends z.ZodType>(
  req: { url: string },
  schema: T,
): ValidationResult<z.infer<T>> {
  console.log("Raw request", req.url);
  if (req.url.startsWith("/?")) {
    req.url = req.url.slice(2);
  }
  const params = new URLSearchParams(req.url);
  console.log("params", params);
  const result = schema.safeParse(Object.fromEntries(params.entries()));
  console.log("parsed query", result);
  if (!result.success) {
    return { ok: false as const, error: z.treeifyError(result.error) };
  }
  return { ok: true as const, query: result.data };
}

export function isInvalid<T>(
  result: ValidationResult<T>,
): result is { ok: false; error: object } {
  return result.ok === false;
}
