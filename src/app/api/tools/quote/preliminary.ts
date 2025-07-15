import { wrapMetaTransaction } from "@bitte-ai/agent-sdk";
import type { MetaTransaction } from "@bitte-ai/types";
import { isNativeAsset, sellTokenApprovalTx } from "../cowswap/util/protocol";
import type { Address } from "viem";
import type { OrderParameters } from "@cowprotocol/cow-sdk";
import type { EthRpc } from "../util";

// This function mutates input data!
// quoteRequest.sellToken & notes.
export async function preliminarySteps(
  client: EthRpc,
  from: Address,
  // Mutated if necessary
  orderParams: OrderParameters,
  notes: string[],
): Promise<MetaTransaction[]> {
  const steps: MetaTransaction[] = [];
  if (isNativeAsset(orderParams.sellToken)) {
    const wrapTx = wrapMetaTransaction(
      client.chain.id,
      BigInt(orderParams.sellAmount),
    );
    steps.push(wrapTx);

    // Mutate Quote SellToken from native asset to wrapped version and push to notes.
    orderParams.sellToken = wrapTx.to;
    notes.push("Wrap Native Asset for Sell Token.");
  }
  const approvalTx = await sellTokenApprovalTx({
    from,
    sellToken: orderParams.sellToken,
    client,
    sellAmount: orderParams.sellAmount,
  });
  if (approvalTx) {
    notes.push("Set Sell Token Approval");
    steps.push(approvalTx);
  }
  return steps;
}
