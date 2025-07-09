import { wrapMetaTransaction } from "@bitte-ai/agent-sdk";
import type { MetaTransaction } from "@bitte-ai/types";
import { isNativeAsset, sellTokenApprovalTx } from "../cowswap/util/protocol";
import type { Address } from "viem";
import { getAddress } from "viem";
import type { OrderQuoteRequest } from "@cowprotocol/cow-sdk";

// This function mutates input data!
// quoteRequest.sellToken & notes.
export async function preliminarySteps(
  chainId: number,
  // Mutated if necessary
  quoteRequest: OrderQuoteRequest,
  notes: string[],
): Promise<{
  steps: MetaTransaction[];
  owner: Address;
  wrappedToken?: Address;
}> {
  if (!("sellAmountBeforeFee" in quoteRequest)) {
    throw new Error(
      "Quote Request Missing critical field: sellAmountBeforeFee",
    );
  }
  const steps: MetaTransaction[] = [];
  if (isNativeAsset(quoteRequest.sellToken)) {
    const wrapTx = wrapMetaTransaction(
      chainId,
      BigInt(quoteRequest.sellAmountBeforeFee),
    );
    steps.push(wrapTx);

    // Mutate Quote SellToken from native asset to wrapped version and push to notes.
    quoteRequest.sellToken = wrapTx.to;
    notes.push("Wrap Native Asset for Sell Token.");
  }
  const owner = getAddress(quoteRequest.from);
  const approvalTx = await sellTokenApprovalTx({
    from: owner,
    sellToken: quoteRequest.sellToken,
    chainId,
    sellAmount: quoteRequest.sellAmountBeforeFee,
  });
  if (approvalTx) {
    notes.push("Set Sell Token Approval");
    steps.push(approvalTx);
  }
  return { steps, owner };
}
