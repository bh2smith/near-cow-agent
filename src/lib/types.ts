import type { TokenInfo } from "@bitte-ai/agent-sdk";
import type {
  OrderQuoteRequest,
  OrderKind,
  SigningScheme,
} from "@cowprotocol/cow-sdk";
import type { Chain, PublicClient, Transport } from "viem";

export interface OrderRequestBody {
  chainId: number;
  sellToken: string;
  buyToken: string;
  receiver: string;
  sellAmount: string;
  buyAmount: string;
  validTo: number;
  feeAmount: string;
  kind: OrderKind;
  partiallyFillable: boolean;
  signingScheme: SigningScheme;
  signature: string;
  appData: string;
  evmAddress: string;
}

export type QuoteRequestBody = {
  sellToken: string;
  buyToken: string;
  chainId: number;
  amount: string;
  orderKind: string;
  evmAddress: `0x${string}`;
  receiver: string;
};
export interface ParsedQuoteRequest {
  quoteRequest: OrderQuoteRequest;
  chainId: number;
  tokenData: { buy: TokenInfo; sell: TokenInfo };
}

export type EthRpc = PublicClient<Transport, Chain>;
