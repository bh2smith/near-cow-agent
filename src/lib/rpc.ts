import { getClientForChain } from "@bitte-ai/agent-sdk/evm";

import type { EthRpc } from "./types";

export function getClient(chainId: number, alchemyKey?: string): EthRpc {
  // TODO: Return PublicClient<Transport, Chain> from dependency and remove cast.
  return getClientForChain(chainId, alchemyKey) as EthRpc;
}
