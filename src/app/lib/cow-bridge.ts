import type {
  BridgeQuoteAndPost,
  QuoteBridgeRequest,
} from "@cowprotocol/cow-sdk";
import {
  assertIsBridgeQuoteAndPost,
  AcrossBridgeProvider,
} from "@cowprotocol/cow-sdk";

export async function getQuote(
  parameters: QuoteBridgeRequest,
  // brigeSignerPk: Hex,
): Promise<BridgeQuoteAndPost> {
  const acrossProvider = new AcrossBridgeProvider();
  // TODO: Eventually we can use this again.
  // const sdk = new BridgingSdk({ providers: [acrossProvider] });
  // Get a quote (and the post callback) for a cross-chain swap
  try {
    const quote = await acrossProvider.getQuote(parameters);
    acrossProvider.getUnsignedBridgeCall(parameters, quote);
    // TODO: Need to build BridgeQuoteAndPost from this!
    // @ts-expect-error - TODO: Fix this.
    assertIsBridgeQuoteAndPost(quote);
    return quote;
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
