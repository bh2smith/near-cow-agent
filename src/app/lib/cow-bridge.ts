import type {
  BridgeProviderQuoteError,
  BridgeQuoteAndPost,
  QuoteBridgeRequest,
} from "@cowprotocol/cow-sdk";
import {
  BridgingSdk,
  assertIsBridgeQuoteAndPost,
  AcrossBridgeProvider,
} from "@cowprotocol/cow-sdk";

export async function getQuote(
  parameters: QuoteBridgeRequest,
): Promise<BridgeQuoteAndPost> {
  const acrossProvider = new AcrossBridgeProvider();
  const sdk = new BridgingSdk({ providers: [acrossProvider] });
  // Get a quote (and the post callback) for a cross-chain swap
  try {
    const quoteResult = await sdk.getQuote(parameters);
    assertIsBridgeQuoteAndPost(quoteResult);
    return quoteResult;
  } catch (error: unknown) {
    const castErr = error as BridgeProviderQuoteError;
    throw new Error(`${castErr.name}: ${castErr.cause || castErr.message}`);
  }
}
