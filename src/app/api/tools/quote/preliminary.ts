import { getNativeAsset, wrapMetaTransaction } from "@bitte-ai/agent-sdk";
import type { MetaTransaction } from "@bitte-ai/types";
import { isNativeAsset, sellTokenApprovalTx } from "../cowswap/util/protocol";
import type { Address } from "viem";
import { getAddress } from "viem";
import type { OrderQuoteRequest } from "@cowprotocol/cow-sdk";

export async function preliminarySteps(
  quoteRequest: OrderQuoteRequest,
  chainId: number,
): Promise<{ steps: MetaTransaction[]; owner: Address }> {
  if (!("sellAmountBeforeFee" in quoteRequest)) {
    throw new Error(
      "Quote Request Missing critical field: sellAmountBeforeFee",
    );
  }
  const steps: MetaTransaction[] = [];
  if (isNativeAsset(quoteRequest.sellToken)) {
    steps.push(
      wrapMetaTransaction(chainId, BigInt(quoteRequest.sellAmountBeforeFee)),
    );
    quoteRequest.sellToken = getNativeAsset(chainId).address;
  }
  const owner = getAddress(quoteRequest.from);
  const approvalTx = await sellTokenApprovalTx({
    from: owner,
    sellToken: quoteRequest.sellToken,
    chainId,
    sellAmount: quoteRequest.sellAmountBeforeFee,
  });
  if (approvalTx) {
    steps.push(approvalTx);
  }
  return { steps, owner };
}
