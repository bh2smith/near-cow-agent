import type { Address, Hex } from "viem";

export interface EthTransactionParams {
  from: Address;
  to: Address;
  gas?: Hex;
  value?: Hex;
  data?: Hex;
}

export type PersonalSignParams = [Hex, Address];
export type EthSignParams = [Address, Hex];
export type TypedDataParams = [Address, string];

export type SessionRequestParams =
  | EthTransactionParams[]
  | Hex
  | PersonalSignParams
  | EthSignParams
  | TypedDataParams;

export const signMethods = [
  "eth_sign",
  "personal_sign",
  "eth_sendTransaction",
  "eth_signTypedData",
  "eth_signTypedData_v4",
] as const;

export type SignMethod = (typeof signMethods)[number];

export type SignRequestData =
  | {
      method: "eth_sendTransaction";
      chainId: number;
      params: EthTransactionParams[];
    }
  | { method: "personal_sign"; chainId: number; params: PersonalSignParams }
  | { method: "eth_sign"; chainId: number; params: EthSignParams }
  | {
      method: "eth_signTypedData" | "eth_signTypedData_v4";
      chainId: number;
      params: TypedDataParams;
    };
