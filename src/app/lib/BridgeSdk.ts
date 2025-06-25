import type { latest } from "@cowprotocol/app-data";
import type {
  AppDataInfo,
  BridgeHook,
  BridgeProvider,
  BridgeQuoteResult,
  BridgeQuoteResults,
  BridgingSdkOptions,
  OrderBookApi,
  QuoteBridgeRequest,
  QuoteBridgeRequestWithoutAmount,
  QuoteResults,
  SwapAdvancedSettings,
  TradeParameters,
  TradingSdk,
  WithPartialTraderParams,
} from "@cowprotocol/cow-sdk";
import {
  postSwapOrderFromQuote,
  areHooksEqual,
  BridgeProviderQuoteError,
  BridgingSdk,
  getHookMockForCostEstimation,
  mergeAppDataDoc,
  OrderKind,
} from "@cowprotocol/cow-sdk";

import type { Signer } from "ethers";
import { Wallet } from "ethers";
import { parseUnits } from "viem";

let logEnabled = false;

export function log(text: string) {
  if (!logEnabled) return;
  console.log(`[COW TRADING SDK] ${text}`);
}

export function enableLogging(enabled: boolean) {
  logEnabled = enabled;
}

export const jsonWithBigintReplacer = (_key: string, value: unknown) => {
  // Handle BigInt
  if (typeof value === "bigint") {
    return value.toString();
  }
  // Handle BigNumber (if you're using ethers.BigNumber)
  if (typeof value === "object" && value !== null && "_isBigNumber" in value) {
    return value.toString();
  }
  return value;
};

export class BridgeSdk extends BridgingSdk {
  private mockSigner: Wallet;

  constructor(readonly options: BridgingSdkOptions) {
    super(options);
    this.mockSigner = Wallet.createRandom();
  }

  async getQuoteCustom(
    quoteBridgeRequest: Omit<QuoteBridgeRequest, "signer">,
    advancedSettings?: SwapAdvancedSettings,
  ): Promise<BridgeQuoteAndPost> {
    const { sellTokenChainId, buyTokenChainId } = quoteBridgeRequest;
    const tradingSdk = this.config.tradingSdk;

    if (sellTokenChainId !== buyTokenChainId) {
      // Cross-chain: use custom logic here
      return this.getQuoteWithBridgeCustom({
        swapAndBridgeRequest: {
          ...quoteBridgeRequest,
          signer: this.mockSigner,
        },
        advancedSettings,
        tradingSdk,
        provider: this.getProviders()[0],
        mockSigner: this.mockSigner,
      });
    } else {
      // fallback to base class method
      throw new Error("Buy & Sell Token Same Chain! Use regular SDK.");
    }
  }

  private async getQuoteWithBridgeCustom<T extends BridgeQuoteResult>(
    params: GetQuoteWithBridgeParams<T>,
  ) {
    const {
      provider,
      swapAndBridgeRequest,
      advancedSettings,
      tradingSdk,
      mockSigner,
    } = params;
    const {
      kind,
      sellTokenChainId,
      sellTokenAddress,
      buyTokenChainId,
      buyTokenAddress,
      amount,
      ...rest
    } = swapAndBridgeRequest;

    if (kind !== OrderKind.SELL) {
      throw new Error("Bridging only support SELL orders");
    }

    log(
      `Cross-chain ${kind} ${amount} ${sellTokenAddress} (source chain ${sellTokenChainId}) for ${buyTokenAddress} (target chain ${buyTokenChainId})`,
    );

    // Get the mocked hook (for estimating the additional swap costs)
    const bridgeRequestWithoutAmount = await getBaseBridgeQuoteRequest({
      swapAndBridgeRequest: swapAndBridgeRequest,
      provider,
    });

    // Get the hook mock for cost estimation
    const hookEstimatedGasLimit = provider.getGasLimitEstimationForHook(
      bridgeRequestWithoutAmount,
    );
    const mockedHook = getHookMockForCostEstimation(hookEstimatedGasLimit);
    log(
      `Using mocked hook for swap gas estimation: ${JSON.stringify(mockedHook)}`,
    );

    const {
      sellTokenAddress: intermediateToken,
      sellTokenDecimals: intermediaryTokenDecimals,
    } = bridgeRequestWithoutAmount;

    // Estimate the expected amount of intermediate tokens received in CoW Protocol's swap
    const swapParams: WithPartialTraderParams<TradeParameters> = {
      ...rest,
      kind,
      chainId: sellTokenChainId,
      sellToken: sellTokenAddress,
      buyToken: intermediateToken,
      buyTokenDecimals: intermediaryTokenDecimals,
      amount: amount.toString(),
    };
    const { ...swapParamsToLog } = swapParams;

    log(
      `Getting a quote for the swap (sell token to buy intermediate token). Delegate to trading SDK with params: ${JSON.stringify(
        swapParamsToLog,
        jsonWithBigintReplacer,
      )}`,
    );

    const advancedSettingsHooks = advancedSettings?.appData?.metadata?.hooks;

    const { result: swapResult } = await tradingSdk.getQuoteResults(
      swapParams,
      {
        ...advancedSettings,
        appData: {
          ...advancedSettings?.appData,
          metadata: {
            hooks: {
              pre: advancedSettingsHooks?.pre,
              post: [...(advancedSettingsHooks?.post || []), mockedHook],
            },
          },
        },
      },
    );

    const intermediateTokenAmount =
      swapResult.amountsAndCosts.afterSlippage.buyAmount; // Estimated, as it will likely have surplus
    log(
      `Expected to receive ${intermediateTokenAmount} of the intermediate token (${parseUnits(
        intermediateTokenAmount.toString(),
        intermediaryTokenDecimals,
      ).toString()})`,
    );

    const defaultGasLimit = mockSigner
      ? BigInt(hookEstimatedGasLimit)
      : undefined;
    log(`Using gas limit: ${defaultGasLimit}`);
    const result = await signHooksAndSetSwapResult(
      mockedHook,
      intermediateTokenAmount,
      provider,
      bridgeRequestWithoutAmount,
      swapAndBridgeRequest,
      swapResult,
      mockSigner,
      BigInt(hookEstimatedGasLimit),
    );
    return {
      swap: result.swapResult,
      bridge: result.bridgeResult,
      // async postSwapOrderFromQuote(advancedSettings?: SwapAdvancedSettings) {
      //   // Sign the hooks with the real signer
      //   const { swapResult } = await signHooksAndSetSwapResult(signer, defaultGasLimit, advancedSettings)

      //   const quoteResults: QuoteResultsWithSigner = {
      //     result: {
      //       ...swapResult,
      //       tradeParameters: getTradeParametersAfterQuote({
      //         quoteParameters: swapResult.tradeParameters,
      //         sellToken: sellTokenAddress,
      //       }),
      //       signer,
      //     },
      //     orderBookApi,
      //   }

      //   return postSwapOrderFromQuote(quoteResults, {
      //     ...advancedSettings,
      //     appData: swapResult.appDataInfo.doc,
      //     quoteRequest: {
      //       ...advancedSettings?.quoteRequest,
      //       // Changing receiver back to account proxy
      //       receiver: swapResult.tradeParameters.receiver,
      //     },
      //   })
      // },
    };
  }
}

export interface BridgeQuoteAndPost {
  /**
   * The quote results for the CoW Protocol order.
   */
  swap: QuoteResults;

  /**
   * The quote results for the bridging.
   *
   * Includes the bridging details.
   */
  bridge: BridgeQuoteResults;

  // TODO: MAKE THIS
  // /**
  //  * Callback to post the swap order.
  //  */
  // postSwapOrderFromQuote(advancedSettings?: SwapAdvancedSettings): Promise<OrderPostingResult>
}

type GetQuoteWithBridgeParams<T extends BridgeQuoteResult> = {
  /**
   * Overall request for the swap and the bridge.
   */
  swapAndBridgeRequest: QuoteBridgeRequest;

  /**
   * Advanced settings for the swap.
   */
  advancedSettings?: SwapAdvancedSettings;

  /**
   * Provider for the bridge.
   */
  provider: BridgeProvider<T>;

  /**
   * Trading SDK.
   */
  tradingSdk: TradingSdk;

  /**
   * For qugote fetching we have to sign bridgin hooks.
   * But we won't do that using users wallet and will use some static PK.
   */
  mockSigner: Wallet;
};

interface GetBridgeResultResult {
  bridgeResult: BridgeQuoteResults;
  bridgeHook: BridgeHook;
  appDataInfo: AppDataInfo;
}

interface BridgeResultContext {
  swapAndBridgeRequest: QuoteBridgeRequest;
  swapResult: QuoteResults;
  intermediateTokenAmount: bigint;
  bridgeRequestWithoutAmount: QuoteBridgeRequestWithoutAmount;
  provider: BridgeProvider<BridgeQuoteResult>;
  signer: Signer;
  mockedHook: latest.CoWHook;
  appDataOverride?: SwapAdvancedSettings["appData"];
  defaultGasLimit?: bigint;
}

async function getBridgeResult(
  context: BridgeResultContext,
): Promise<GetBridgeResultResult> {
  const {
    swapResult,
    bridgeRequestWithoutAmount,
    provider,
    intermediateTokenAmount,
    signer,
    mockedHook,
    appDataOverride,
    defaultGasLimit,
  } = context;

  const bridgeRequest: QuoteBridgeRequest = {
    ...bridgeRequestWithoutAmount,
    amount: intermediateTokenAmount,
  };

  // Get the quote for the bridging of the intermediate token to the final token
  const bridgingQuote = await provider.getQuote(bridgeRequest);

  // Get the bridging call
  const unsignedBridgeCall = await provider.getUnsignedBridgeCall(
    bridgeRequest,
    bridgingQuote,
  );

  // Get the pre-authorized hook
  const bridgeHook = await provider.getSignedHook(
    bridgeRequest.sellTokenChainId,
    unsignedBridgeCall,
    signer,
    defaultGasLimit,
  );

  const swapAppData = await mergeAppDataDoc(
    swapResult.appDataInfo.doc,
    appDataOverride || {},
  );

  const swapResultHooks = swapAppData.doc.metadata.hooks;
  const postHooks = swapResultHooks?.post || [];

  const isBridgeHookAlreadyPresent = postHooks.some((hook) =>
    areHooksEqual(hook, bridgeHook.postHook),
  );

  const appDataInfo = await mergeAppDataDoc(swapAppData.doc, {
    metadata: {
      hooks: {
        pre: swapResultHooks?.pre,
        // Remove the mocked hook from the post hooks after receiving quote
        post: [
          ...(swapResultHooks?.post || []),
          ...(isBridgeHookAlreadyPresent ? [] : [bridgeHook.postHook]),
        ].filter((hook) => !areHooksEqual(hook, mockedHook)),
      },
    },
  });

  // Prepare the bridge result
  const bridgeResult: BridgeQuoteResults = {
    providerInfo: provider.info,
    tradeParameters: bridgeRequest, // Just the bridge (not the swap & bridge)
    bridgeCallDetails: {
      unsignedBridgeCall: unsignedBridgeCall,
      preAuthorizedBridgingHook: bridgeHook,
    },
    isSell: bridgingQuote.isSell,
    expectedFillTimeSeconds: bridgingQuote.expectedFillTimeSeconds,
    fees: bridgingQuote.fees,
    limits: bridgingQuote.limits,
    quoteTimestamp: bridgingQuote.quoteTimestamp,
    amountsAndCosts: bridgingQuote.amountsAndCosts,
  };

  return { bridgeResult, bridgeHook, appDataInfo };
}

// Get the bridge result
async function signHooksAndSetSwapResult(
  mockedHook: latest.CoWHook,
  intermediateTokenAmount: bigint,
  provider: BridgeProvider<BridgeQuoteResult>,
  bridgeRequestWithoutAmount: QuoteBridgeRequestWithoutAmount,
  swapAndBridgeRequest: QuoteBridgeRequest,
  swapResult: QuoteResults,
  signer: Signer,
  defaultGasLimit?: bigint,
  advancedSettings?: SwapAdvancedSettings,
): Promise<{ swapResult: QuoteResults; bridgeResult: BridgeQuoteResults }> {
  const appDataOverride = advancedSettings?.appData;
  const receiverOverride = advancedSettings?.quoteRequest?.receiver;

  const {
    bridgeHook,
    appDataInfo: { doc: appData, fullAppData, appDataKeccak256 },
    bridgeResult,
  } = await getBridgeResult({
    swapAndBridgeRequest: { ...swapAndBridgeRequest, kind: OrderKind.SELL },
    swapResult,
    bridgeRequestWithoutAmount: {
      ...bridgeRequestWithoutAmount,
      receiver: receiverOverride || bridgeRequestWithoutAmount.receiver,
    },
    provider,
    intermediateTokenAmount,
    signer,
    mockedHook,
    appDataOverride,
    defaultGasLimit,
  });
  log(`Bridge hook for swap: ${JSON.stringify(bridgeHook)}`);

  // Update the receiver and appData (both were mocked before we had the bridge hook)
  swapResult.tradeParameters.receiver = bridgeHook.recipient;

  log(
    `App data for swap: appDataKeccak256=${appDataKeccak256}, fullAppData="${fullAppData}"`,
  );
  swapResult.appDataInfo = {
    fullAppData,
    appDataKeccak256,
    doc: appData,
  };

  return {
    bridgeResult,
    swapResult: {
      ...swapResult,
      tradeParameters: {
        ...swapResult.tradeParameters,
        receiver: bridgeHook.recipient,
      },
    },
  };
}

async function getBaseBridgeQuoteRequest<T extends BridgeQuoteResult>(params: {
  swapAndBridgeRequest: QuoteBridgeRequest;
  provider: BridgeProvider<T>;
}): Promise<QuoteBridgeRequestWithoutAmount> {
  const { provider, swapAndBridgeRequest: quoteBridgeRequest } = params;

  const intermediateTokens =
    await provider.getIntermediateTokens(quoteBridgeRequest);

  if (intermediateTokens.length === 0) {
    throw new BridgeProviderQuoteError(
      "No path found (not intermediate token for bridging)",
      {},
    );
  }

  // We just pick the first intermediate token for now
  const intermediateToken = intermediateTokens[0];
  log(`Using ${intermediateToken} as intermediate tokens`);

  // Get the gas limit estimation for the hook
  return {
    ...quoteBridgeRequest,
    sellTokenAddress: intermediateToken.address,
    sellTokenDecimals: intermediateToken.decimals,
  };
}

export async function postSwapOrderFromQuoteCustom(
  mockSigner: Signer,
  swap: QuoteResults,
  orderBookApi: OrderBookApi,
  advancedSettings?: SwapAdvancedSettings,
) {
  // Sign the hooks with the real signer
  // const { swapResult } = await signHooksAndSetSwapResult(signer, defaultGasLimit, advancedSettings)

  const quoteResults: QuoteResultsWithSigner = {
    result: {
      ...swap, // TODO: compare swap with swapResult!
      tradeParameters: getTradeParametersAfterQuote({
        quoteParameters: swap.tradeParameters,
        sellToken: swap.orderToSign.sellToken,
      }),
      signer: mockSigner,
    },
    orderBookApi,
  };

  return postSwapOrderFromQuote(quoteResults, {
    ...advancedSettings,
    appData: swap.appDataInfo.doc,
    quoteRequest: {
      ...advancedSettings?.quoteRequest,
      // Changing receiver back to account proxy
      receiver: swap.tradeParameters.receiver,
    },
  });
}
/**
 * Set sell token to the initial one
 * Because for ETH-flow orders we do quote requests with wrapped token
 */
export function getTradeParametersAfterQuote({
  quoteParameters,
  sellToken,
}: {
  quoteParameters: TradeParameters;
  sellToken: string;
}): TradeParameters {
  return { ...quoteParameters, sellToken };
}

export type QuoteResultsWithSigner = {
  result: QuoteResults & { signer: Signer };
  orderBookApi: OrderBookApi;
};
