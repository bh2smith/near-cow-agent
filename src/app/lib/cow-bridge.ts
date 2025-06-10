import type {
  BridgeQuoteAndPost,
  QuoteBridgeRequest,
} from "@cowprotocol/cow-sdk";
import {
  BridgingSdk,
  assertIsBridgeQuoteAndPost,
  AcrossBridgeProvider,
} from "@cowprotocol/cow-sdk";
import type { Hex } from "viem";

export async function getQuote(
  parameters: QuoteBridgeRequest,
  brigeSignerPk: Hex,
): Promise<BridgeQuoteAndPost> {
  const acrossProvider = new AcrossBridgeProvider();
  const sdk = new BridgingSdk({ providers: [acrossProvider] });
  // Get a quote (and the post callback) for a cross-chain swap
  try {
    const quote = await acrossProvider.getQuote(parameters);
    acrossProvider.getUnsignedBridgeCall(parameters, quote);
    assertIsBridgeQuoteAndPost(quoteResult);
    return quoteResult;
  } catch (error: unknown) {
    console.error(error);
    try {
      const { body } = error as {
        body: { errorType: string; description: string };
      };
      throw new Error(`${body.errorType}: ${body.description}`);
    } catch (_) {
      console.error(_);
      throw new Error("Broken");
    }
  }
}
