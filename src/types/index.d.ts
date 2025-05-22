import type { TxData as OriginalTxData } from "@bitte-ai/agent-sdk";
import type { TransferFTData } from "@bitte-ai/types";

declare module "@bitte-ai/agent-sdk" {
  interface TxData extends OriginalTxData {
    data?: TransferFTData;
  }
}