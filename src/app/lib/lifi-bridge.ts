// This is all LiFi Bridge: https://li.fi/api-sdk/
import type { v0_11_0 } from "@cowprotocol/app-data";
import type { ChainId, LiFiStep, TransactionRequest } from "@lifi/sdk";
import { createConfig, getQuote } from "@lifi/sdk";
import type { Address } from "viem";

createConfig({ integrator: "bh2smith.eth" });

export interface TokenId {
  chain: ChainId;
  address: Address;
}

export interface BridgeInput {
  account: Address;
  amount: bigint;
  src: TokenId;
  dest: TokenId;
}

export async function bridgeQuote({
  src,
  dest,
  account,
  amount,
}: BridgeInput): Promise<LiFiStep> {
  const quote = await getQuote({
    fromAddress: account,
    fromChain: src.chain,
    toChain: dest.chain,
    fromToken: src.address,
    toToken: dest.address,
    fromAmount: amount.toString(),
  });
  return quote;
}

export function toCowHook(tx: TransactionRequest): v0_11_0.CoWHook | undefined {
  if (!(tx.to && tx.data && tx.gasLimit)) {
    // un-"hookable" tx request
    return;
  }
  return {
    target: tx.to,
    callData: tx.data,
    gasLimit: tx.gasLimit,
  };
}
