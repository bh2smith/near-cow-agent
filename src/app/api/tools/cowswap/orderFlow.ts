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
import { ParsedQuoteRequest } from "./util/parse";
import { getAddress, zeroAddress } from "viem";
import {
  getNativeAsset,
  wrapMetaTransaction,
  signRequestFor,
} from "@bitte-ai/agent-sdk";

const slippageBps = parseInt(process.env.SLIPPAGE_BPS || "100");
const referralAddress =
  process.env.REFERRAL_ADDRESS || "0x8d99F8b2710e6A3B94d9bf465A98E5273069aCBd";
const partnerAddress =
  process.env.PARTNER_ADDRESS || "0x54F08c27e75BeA0cdDdb8aA9D69FD61551B19BbA";
const partnerBps = parseInt(process.env.PARTNER_BPS || "10");

export interface OrderResponse {
  transaction: SignRequestData;
  meta: { orderUrl: string };
}

export async function orderRequestFlow({
  chainId,
  quoteRequest,
}: ParsedQuoteRequest): Promise<OrderResponse> {
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

  const [quoteResponse, approvalTx] = await Promise.all([
    orderbook.getQuote(quoteRequest),
    sellTokenApprovalTx({
      ...quoteRequest,
      chainId,
      sellAmount: quoteRequest.sellAmountBeforeFee,
    }),
  ]);
  if (approvalTx) {
    metaTransactions.push(approvalTx);
  }

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

  // quoteResponse.quote.appData =
  //   "0x5a8bb9f6dd0c7f1b4730d9c5a811c2dfe559e67ce9b5ed6965b05e59b8c86b80";
  // TODO: This shit is too Slow.
  quoteResponse.quote.appData = await buildAndPostAppData(
    orderbook,
    "bitte.ai/CowAgent",
    referralAddress,
    {
      recipient: partnerAddress,
      bps: partnerBps,
    },
  );
  // Post Unsigned Order to Orderbook (this might be spam if the user doesn't sign)
  console.log("Creating Order with", quoteResponse);
  const order = createOrder(quoteResponse);
  console.log("Built Order", order);

  const orderUid = await orderbook.sendOrder(order);
  console.log("Order Posted", orderbook.getOrderLink(orderUid));

  return {
    transaction: signRequestFor({
      from: getAddress(order.from || zeroAddress),
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
