import { SignRequestData } from "near-safe";
import {
  applySlippage,
  buildAndPostAppData,
  createOrder,
  isNativeAsset,
  ParsedQuoteRequest,
  sellTokenApprovalTx,
  setPresignatureTx,
} from "./util/protocol";
import { OrderBookApi } from "@cowprotocol/cow-sdk";
import { signRequestFor } from "../util";

export async function orderRequestFlow({
  chainId,
  quoteRequest,
}: ParsedQuoteRequest): Promise<{
  transaction: SignRequestData;
  meta: { orderUrl: string };
}> {
  if (isNativeAsset(quoteRequest.sellToken)) {
    // TODO: Integrate EthFlow
    throw new Error(
      `This agent does not currently support Native Asset Sell Orders.`,
    );
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

  const slippageBps = BigInt(9950); // 99.50% (100% - 0.5%)
  const scaleFactor = BigInt(10000);
  quoteResponse.quote.buyAmount = (
    (BigInt(quoteResponse.quote.buyAmount) * scaleFactor) /
    slippageBps
  ).toString();
  // Apply Slippage based on OrderKind
  quoteResponse.quote = {
    ...quoteResponse.quote,
    // This is 0.5% slippage (in BPS)
    ...applySlippage(quoteResponse.quote, 50),
  };
  // Post Unsigned Order to Orderbook (this might be spam if the user doesn't sign)
  quoteResponse.quote.appData = await buildAndPostAppData(
    orderbook,
    "bitte.ai/CowAgent",
    "0x8d99F8b2710e6A3B94d9bf465A98E5273069aCBd",
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

  return {
    transaction: signRequestFor({
      chainId,
      metaTransactions: [
        ...(approvalTx ? [approvalTx] : []),
        // Encode setPresignature (this is onchain confirmation of order signature.)
        setPresignatureTx(orderUid),
      ],
    }),
    meta: { orderUrl: `explorer.cow.fi/orders/${orderUid}` },
  };
}
