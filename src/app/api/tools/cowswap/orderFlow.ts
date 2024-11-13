import { MetaTransaction, SignRequestData } from "near-safe";
import {
  applySlippage,
  buildAndPostAppData,
  createOrder,
  isNativeAsset,
  sellTokenApprovalTx,
  setPresignatureTx,
} from "./util/protocol";
import { OrderBookApi } from "@cowprotocol/cow-sdk";
import { signRequestFor } from "../util";
import { ParsedQuoteRequest } from "./util/parse";
import { getNativeAsset, wrapMetaTransaction } from "../weth/utils";

const slippageBps = parseInt(process.env.SLIPPAGE_BPS || "100");
const referralAddress =
  process.env.REFERRAL_ADDRESS || "0x8d99F8b2710e6A3B94d9bf465A98E5273069aCBd";
const partnerAddress =
  process.env.PARTNER_ADDRESS || "0x54F08c27e75BeA0cdDdb8aA9D69FD61551B19BbA";
const partnerBps = parseInt(process.env.PARTNER_BPS || "10");

export async function orderRequestFlow({
  chainId,
  quoteRequest,
}: ParsedQuoteRequest): Promise<{
  transaction: SignRequestData;
  meta: { orderUrl: string };
}> {
  if (
    !(quoteRequest.kind === "sell" && "sellAmountBeforeFee" in quoteRequest)
  ) {
    throw new Error(`Quote Request is not a sell order`);
  }
  const metaTransactions: MetaTransaction[] = [];
  if (isNativeAsset(quoteRequest.sellToken)) {
    metaTransactions.push(
      wrapMetaTransaction(chainId, BigInt(quoteRequest.sellAmountBeforeFee)),
    );
    quoteRequest.sellToken = getNativeAsset(chainId).address;
  }

  const orderbook = new OrderBookApi({ chainId });
  console.log(`Requesting quote for ${JSON.stringify(quoteRequest, null, 2)}`);
  const quoteResponse = await orderbook.getQuote(quoteRequest);
  console.log("Received quote", quoteResponse);
  const { sellAmount, feeAmount } = quoteResponse.quote;
  // Adjust the sellAmount to account for the fee.
  // cf: https://learn.cow.fi/tutorial/submit-order
  quoteResponse.quote.sellAmount = (
    BigInt(sellAmount) + BigInt(feeAmount)
  ).toString();

  // Apply Slippage based on OrderKind
  quoteResponse.quote = {
    ...quoteResponse.quote,
    ...applySlippage(quoteResponse.quote, slippageBps),
  };
  // Post Unsigned Order to Orderbook (this might be spam if the user doesn't sign)
  quoteResponse.quote.appData = await buildAndPostAppData(
    orderbook,
    "bitte.ai/CowAgent",
    referralAddress,
    {
      recipient: partnerAddress,
      bps: partnerBps,
    },
  );
  const order = createOrder(quoteResponse);
  console.log("Built Order", order);

  const orderUid = await orderbook.sendOrder(order);
  console.log("Order Posted", orderbook.getOrderLink(orderUid));

  // User must approve the sellToken to trade.
  const approvalTx = await sellTokenApprovalTx({
    ...quoteRequest,
    chainId,
    sellAmount: quoteResponse.quote.sellAmount,
  });
  if (approvalTx) {
    metaTransactions.push(approvalTx);
  }

  return {
    transaction: signRequestFor({
      chainId,
      metaTransactions: [
        ...(metaTransactions.length > 0 ? metaTransactions : []),
        // Encode setPresignature (this is onchain confirmation of order signature.)
        setPresignatureTx(orderUid),
      ],
    }),
    meta: { orderUrl: `explorer.cow.fi/orders/${orderUid}` },
  };
}
