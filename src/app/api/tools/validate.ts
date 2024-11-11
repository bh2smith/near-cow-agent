import { Address, getAddress } from "viem";

export type FieldParser<T> = Record<keyof T, FieldValidator<T[keyof T]>>;
export function validateInput<T>(
  params: URLSearchParams,
  validatorMapping: FieldParser<T>,
): T {
  const fields = createFields<T>(validatorMapping);
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => {
      const { paramName, validator } = value as {
        paramName: string;
        validator: FieldValidator<T[keyof T]>;
      };
      return [key, validator(params.get(paramName), paramName)];
    }),
  ) as T;
}
export function addressField(param: string | null, name: string): Address {
  return parseField(param, name, getAddress, "Invalid Address field");
}

export function addressOrSymbolField(
  param: string | null,
  name: string,
): Address | string {
  return parseField(
    param,
    name,
    (value) => {
      try {
        return getAddress(value);
      } catch {
        return value;
      }
    },
    "Invalid Address or Symbol field",
  );
}

export function numberField(param: string | null, name: string): number {
  const value = parseField(param, name, parseInt, "Invalid Float field");
  if (isNaN(value)) {
    throw new Error(`Invalid Integer field '${name}': Not a number`);
  }
  return value;
}

export function floatField(param: string | null, name: string): number {
  const value = parseField(param, name, parseFloat, "Invalid Float parameter");
  if (isNaN(value)) {
    throw new Error(`Invalid Float parameter '${name}': Not a number`);
  }
  return value;
}

type FieldValidator<T> = (param: string | null, name: string) => T;

function createFields<T>(
  validatorMapping: Record<keyof T, FieldValidator<unknown>>,
): Record<keyof T, { paramName: string; validator: FieldValidator<unknown> }> {
  return Object.fromEntries(
    (Object.keys(validatorMapping) as (keyof T)[]).map((key) => [
      key,
      { paramName: key as string, validator: validatorMapping[key] },
    ]),
  ) as Record<
    keyof T,
    { paramName: string; validator: FieldValidator<unknown> }
  >;
}

function exists(param: string | null, name: string): string {
  if (!param) {
    throw new Error(`Missing required field: '${name}'`);
  }
  return param;
}

function parseField<T>(
  param: string | null,
  name: string,
  parser: (value: string) => T,
  errorMessage: string,
): T {
  const value = exists(param, name);
  try {
    return parser(value);
  } catch {
    throw new Error(`${errorMessage} '${name}': ${value}`);
  }
}
