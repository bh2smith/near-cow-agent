import { orderRequestFlow } from "@/src/app/api/tools/cowswap/orderFlow";
import {
  appDataExists,
  applySlippage,
  createOrder,
  generateAppData,
  isNativeAsset,
  NATIVE_ASSET,
  sellTokenApprovalTx,
  setPresignatureTx,
} from "@/src/app/api/tools/cowswap/util/protocol";
import {
  BuyTokenDestination,
  OrderBookApi,
  OrderKind,
  OrderQuoteSideKindSell,
  SellTokenSource,
  SigningScheme,
} from "@cowprotocol/cow-sdk";
import type { OrderQuoteResponse } from "@cowprotocol/cow-sdk";
import { NextRequest } from "next/server";
import { checksumAddress, getAddress, zeroAddress } from "viem";
import { parseQuoteRequest } from "@/src/app/api/tools/cowswap/util/parse";
import { loadTokenMap } from "@bitte-ai/agent-sdk";

const SEPOLIA_DAI = getAddress("0xb4f1737af37711e9a5890d9510c9bb60e170cb0d");
const SEPOLIA_COW = getAddress("0x0625afb445c3b6b7b929342a04a22599fd5dbb59");
// Safe Associated with neareth-dev.testnet on Bitte Wallet.
const DEPLOYED_SAFE = getAddress("0x5E1E315D96BD81c8f65c576CFD6E793aa091b480");

const chainId = 11155111;
const quoteRequest = {
  chainId,
  safeAddress: DEPLOYED_SAFE,
  sellToken: SEPOLIA_DAI,
  buyToken: SEPOLIA_COW,
  receiver: DEPLOYED_SAFE,
  kind: OrderQuoteSideKindSell.SELL,
  sellAmountBeforeFee: "2000000000000000000",
};

describe("CowSwap Plugin", () => {
  // This posts an order to COW Orderbook.
  it.skip("orderRequestFlow", async () => {
    console.log("Requesting Quote...");
    const response = await orderRequestFlow({
      chainId,
      quoteRequest: { ...quoteRequest, from: DEPLOYED_SAFE },
      buyTokenData: { address: SEPOLIA_COW, decimals: 18, symbol: "COW" },
      sellTokenData: { address: SEPOLIA_DAI, decimals: 18, symbol: "DAI" },
    });

    // Verify the data property has the correct structure
    expect(response.data).toBeDefined();
    expect(response.data).toHaveProperty("network");
    expect(response.data.network).toHaveProperty("name", chainId.toString());
    expect(response.data).toHaveProperty("type", "swap");

    // Verify token information
    expect(response.data).toHaveProperty("tokenIn");
    expect(response.data.tokenIn).toHaveProperty("name", "DAI");
    expect(response.data.tokenIn).toHaveProperty("amount");

    expect(response.data).toHaveProperty("tokenOut");
    expect(response.data.tokenOut).toHaveProperty("name", "COW");
    expect(response.data.tokenOut).toHaveProperty("amount");

    // Verify the token amounts are formatted as expected
    expect(typeof response.data.tokenIn.amount).toBe("string");
    expect(typeof response.data.tokenOut.amount).toBe("string");

    // Verify the final response has a transaction property
    expect(response).toHaveProperty("transaction");

    console.log("SwapFTData:", response.data);
    console.log(
      `https://testnet.wallet.bitte.ai/sign-evm?evmTx=${encodeURI(JSON.stringify(response.transaction))}`,
    );
  });

  // Test with real data to validate swap data
  it("orderRequestFlow returns valid swap data with real API call", async () => {
    console.log("Requesting Quote for swap data validation...");

    // Make a real call to orderRequestFlow
    const response = await orderRequestFlow({
      chainId,
      quoteRequest: { ...quoteRequest, from: DEPLOYED_SAFE },
      buyTokenData: { address: SEPOLIA_COW, decimals: 18, symbol: "COW" },
      sellTokenData: { address: SEPOLIA_DAI, decimals: 18, symbol: "DAI" },
    });

    // Validate swap data structure
    expect(response.data).toBeDefined();
    expect(response.data).toHaveProperty("network");
    expect(response.data.network).toHaveProperty("name", chainId.toString());
    expect(response.data).toHaveProperty("type", "swap");

    // Validate token information
    expect(response.data).toHaveProperty("tokenIn");
    expect(response.data.tokenIn).toHaveProperty("name", "DAI");
    expect(response.data.tokenIn).toHaveProperty("amount");

    expect(response.data).toHaveProperty("tokenOut");
    expect(response.data.tokenOut).toHaveProperty("name", "COW");
    expect(response.data.tokenOut).toHaveProperty("amount");

    // Validate amount formats and values
    expect(typeof response.data.tokenIn.amount).toBe("string");
    expect(typeof response.data.tokenOut.amount).toBe("string");

    // Actual value from API could be formatted differently, log to check
    console.log("TokenIn amount:", response.data.tokenIn.amount);
    console.log("TokenOut amount:", response.data.tokenOut.amount);

    // Check if the amount exists but possibly in a different format
    expect(response.data.tokenIn.amount).toBeTruthy();
    expect(response.data.tokenOut.amount).toBeTruthy();

    // We now know the API returns a formatted amount like "2" instead of "2000000000000000000"
    // So we can't directly compare with the input
    // expect(response.data.tokenIn.amount).toBe(quoteRequest.sellAmountBeforeFee);

    // Instead, check that the output is consistent with ETH units (2 = 2 ETH = 2000000000000000000 wei)
    const inAmount = Number.parseFloat(response.data.tokenIn.amount);
    expect(inAmount).toBe(2); // 2 ETH

    // Check that tokenOut amount is a valid positive number
    const outAmount = Number.parseFloat(response.data.tokenOut.amount);
    expect(outAmount).toBeGreaterThan(0);

    // Validate fee information if present
    if ("fee" in response.data) {
      const fee = response.data.fee as { amount: string };
      expect(fee).toHaveProperty("amount");
      expect(typeof fee.amount).toBe("string");
      expect(/^\d+$/.test(fee.amount)).toBe(true);
    }

    // Validate transaction object
    expect(response).toHaveProperty("transaction");
    console.log("Transaction structure:", JSON.stringify(response.transaction));

    // The transaction appears to be structured differently
    // It has chainId, method and params properties
    const tx = response.transaction as unknown as {
      chainId: number;
      method: string;
      params: Array<{
        to: string;
        data: string;
        from: string;
        value: string;
      }>;
    };

    expect(tx).toHaveProperty("chainId");
    expect(tx).toHaveProperty("method");
    expect(tx).toHaveProperty("params");
    expect(Array.isArray(tx.params)).toBe(true);

    // Check first transaction in params if it exists
    if (tx.params.length > 0) {
      expect(tx.params[0]).toHaveProperty("to");
      expect(tx.params[0]).toHaveProperty("data");
      expect(tx.params[0]).toHaveProperty("from");
      expect(tx.params[0]).toHaveProperty("value");
    }

    // Log the actual response for inspection
    console.log("SwapFTData response:", {
      tokenIn: response.data.tokenIn,
      tokenOut: response.data.tokenOut,
      fee: "fee" in response.data ? response.data.fee : null,
    });

    // Log transaction details
    console.log("Transaction details available in response");
  });

  it("applySlippage", async () => {
    const amounts = { buyAmount: "1000", sellAmount: "1000" };
    // Test SELL orders with different slippage values
    expect(
      applySlippage({ kind: OrderKind.SELL, ...amounts }, 50),
    ).toStrictEqual({
      buyAmount: "995", // 1000 - (1000 * 50 / 10000) = 1000 - 5 = 995
    });
    expect(
      applySlippage({ kind: OrderKind.SELL, ...amounts }, 100),
    ).toStrictEqual({
      buyAmount: "990", // 1000 - (1000 * 100 / 10000) = 1000 - 10 = 990
    });
    expect(
      applySlippage({ kind: OrderKind.SELL, ...amounts }, 200),
    ).toStrictEqual({
      buyAmount: "980", // 1000 - (1000 * 200 / 10000) = 1000 - 20 = 980
    });

    // Test BUY orders with different slippage values
    expect(
      applySlippage({ kind: OrderKind.BUY, ...amounts }, 50),
    ).toStrictEqual({
      sellAmount: "1005", // 1000 + (1000 * 50 / 10000) = 1000 + 5 = 1005
    });
    expect(
      applySlippage({ kind: OrderKind.BUY, ...amounts }, 100),
    ).toStrictEqual({
      sellAmount: "1010", // 1000 + (1000 * 100 / 10000) = 1000 + 10 = 1010
    });
    expect(
      applySlippage({ kind: OrderKind.BUY, ...amounts }, 200),
    ).toStrictEqual({
      sellAmount: "1020", // 1000 + (1000 * 200 / 10000) = 1000 + 20 = 1020
    });

    // Test with small amounts
    const smallAmounts = { buyAmount: "100", sellAmount: "100" };
    expect(
      applySlippage({ kind: OrderKind.BUY, ...smallAmounts }, 100),
    ).toStrictEqual({
      sellAmount: "101", // 100 + (100 * 100 / 10000) = 100 + 1 = 101
    });
    expect(
      applySlippage({ kind: OrderKind.SELL, ...smallAmounts }, 100),
    ).toStrictEqual({
      buyAmount: "99", // 100 - (100 * 100 / 10000) = 100 - 1 = 99
    });

    // Test with zero slippage
    expect(
      applySlippage({ kind: OrderKind.SELL, ...amounts }, 0),
    ).toStrictEqual({
      buyAmount: "1000", // No change with zero slippage
    });
    expect(applySlippage({ kind: OrderKind.BUY, ...amounts }, 0)).toStrictEqual(
      {
        sellAmount: "1000", // No change with zero slippage
      },
    );

    // Test with very large amounts
    const largeAmounts = {
      buyAmount: "10000000000000000000",
      sellAmount: "10000000000000000000",
    };
    expect(
      applySlippage({ kind: OrderKind.SELL, ...largeAmounts }, 50),
    ).toStrictEqual({
      buyAmount: "9950000000000000000", // 0.5% less
    });
    expect(
      applySlippage({ kind: OrderKind.BUY, ...largeAmounts }, 50),
    ).toStrictEqual({
      sellAmount: "10050000000000000000", // 0.5% more
    });

    // Test with very small slippage
    expect(
      applySlippage({ kind: OrderKind.SELL, ...amounts }, 1),
    ).toStrictEqual({
      buyAmount: "999", // 1000 - (1000 * 1 / 10000) = 1000 - 0.1 = 999.9, rounded to 999
    });
  });
  it("isNativeAsset", () => {
    expect(isNativeAsset("word")).toBe(false);
    expect(isNativeAsset(NATIVE_ASSET)).toBe(true);
    expect(isNativeAsset(NATIVE_ASSET.toLowerCase())).toBe(true);
    expect(isNativeAsset(checksumAddress(NATIVE_ASSET))).toBe(true);
    expect(isNativeAsset("0xb4f1737af37711e9a5890d9510c9bb60e170cb0d")).toBe(
      false,
    );
  });

  it("sellTokenApprovalTx: null - already approved", async () => {
    // already approved
    expect(
      await sellTokenApprovalTx({
        from: "0x7fa8e8264985C7525Fc50F98aC1A9b3765405489",
        sellToken: SEPOLIA_DAI,
        sellAmount: "100",
        chainId,
      }),
    ).toStrictEqual(null);
  });

  it("sellTokenApprovalTx: not null - not approved", async () => {
    // Not approved
    expect(
      await sellTokenApprovalTx({
        from: zeroAddress, // Will never be approved
        sellToken: SEPOLIA_COW,
        sellAmount: "100",
        chainId,
      }),
    ).toStrictEqual({
      to: SEPOLIA_COW,
      value: "0x0",
      data: "0x095ea7b3000000000000000000000000c92e8bdf79f0507f65a392b0ab4667716bfe0110ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    });
  });

  it("sellTokenApprovalTx: throws - not a token", async () => {
    // Not a token.
    await expect(
      sellTokenApprovalTx({
        from: DEPLOYED_SAFE,
        sellToken: zeroAddress, // Not a token
        sellAmount: "100",
        chainId,
      }),
    ).rejects.toThrow();
  });
  it("setPresignatureTx", () => {
    const invalidOrderUid = "fart";
    expect(() => setPresignatureTx(invalidOrderUid)).toThrow(
      `Invalid OrderUid (not hex): ${invalidOrderUid}`,
    );

    expect(setPresignatureTx("0x12")).toStrictEqual({
      to: "0x9008D19f58AAbD9eD0D60971565AA8510560ab41",
      value: "0x0",
      data: "0xec6cb13f0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000011200000000000000000000000000000000000000000000000000000000000000",
    });
  });

  it("parseQuoteRequest", async () => {
    const request = new NextRequest("https://fake-url.xyz", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "mb-metadata": JSON.stringify({
          accountId: "neareth-dev.testnet",
        }),
      },
      body: JSON.stringify(quoteRequest),
    });
    const tokenMap = await loadTokenMap(process.env.TOKEN_MAP_URL);
    expect(await parseQuoteRequest(request, tokenMap)).toMatchObject({
      chainId: 11155111,
      quoteRequest: {
        buyToken: SEPOLIA_COW,
        from: DEPLOYED_SAFE,
        kind: "sell",
        receiver: DEPLOYED_SAFE,
        sellAmountBeforeFee: "2000000000000000000000000000000000000",
        sellToken: SEPOLIA_DAI,
        signingScheme: "presign",
      },
    });
  });

  it("createOrder", () => {
    const commonFields = {
      sellToken: SEPOLIA_DAI,
      buyToken: SEPOLIA_COW,
      receiver: DEPLOYED_SAFE,
      sellAmount: "1911566262405367520",
      buyAmount: "1580230386982546854",
      validTo: 1730022042,
      appData:
        "0x0000000000000000000000000000000000000000000000000000000000000000",

      partiallyFillable: false,
    };

    const quoteResponse: OrderQuoteResponse = {
      quote: {
        ...commonFields,
        feeAmount: "88433737594632480",
        kind: OrderKind.SELL,
        sellTokenBalance: SellTokenSource.ERC20,
        buyTokenBalance: BuyTokenDestination.ERC20,
        signingScheme: SigningScheme.PRESIGN,
      },
      from: DEPLOYED_SAFE,
      expiration: "2024-10-27T09:12:42.738162481Z",
      id: 470630,
      verified: true,
    };

    const result = createOrder(quoteResponse);

    // Check all expected fields have exact values
    expect(result).toStrictEqual({
      sellToken: SEPOLIA_DAI,
      buyToken: SEPOLIA_COW,
      receiver: DEPLOYED_SAFE,
      sellAmount: "1911566262405367520",
      buyAmount: "1580230386982546854",
      validTo: 1730022042,
      appData:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      partiallyFillable: false,
      quoteId: 470630,
      from: DEPLOYED_SAFE,
      feeAmount: "0", // Verify fee amount is exactly "0"
      kind: "sell",
      sellTokenBalance: "erc20",
      buyTokenBalance: "erc20",
      signature: "0x",
      signingScheme: "presign",
    });

    // Test with different fee amount
    const quoteResponseWithFee: OrderQuoteResponse = {
      quote: {
        ...commonFields,
        feeAmount: "1000000000000000",
        kind: OrderKind.BUY,
        sellTokenBalance: SellTokenSource.INTERNAL,
        buyTokenBalance: BuyTokenDestination.INTERNAL,
        signingScheme: SigningScheme.EIP712,
      },
      from: DEPLOYED_SAFE,
      expiration: "2024-10-27T09:12:42.738162481Z",
      id: 123456,
      verified: true,
    };

    const resultWithFee = createOrder(quoteResponseWithFee);

    // Check all fields are properly transformed
    expect(resultWithFee).toStrictEqual({
      sellToken: SEPOLIA_DAI,
      buyToken: SEPOLIA_COW,
      receiver: DEPLOYED_SAFE,
      sellAmount: "1911566262405367520",
      buyAmount: "1580230386982546854",
      validTo: 1730022042,
      appData:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      partiallyFillable: false,
      quoteId: 123456,
      from: DEPLOYED_SAFE,
      feeAmount: "0", // Should still be "0" as createOrder sets this
      kind: "buy",
      sellTokenBalance: "internal",
      buyTokenBalance: "internal",
      signature: "0x",
      signingScheme: "presign",
    });
  });

  it("AppData", async () => {
    const orderbook = new OrderBookApi({ chainId });
    // cf: https://v1.docs.cow.fi/cow-sdk/order-meta-data-appdata
    // TODO: Uncomment to Post Agent App Data.
    // const appCode = "Bitte Protocol";
    // const referrer = "0x8d99F8b2710e6A3B94d9bf465A98E5273069aCBd";
    // const appData = await generateAppData(appCode, referrer);
    // await orderbook.uploadAppData(hash, data);
    const appData = await generateAppData(
      "bitte.ai/CowAgent",
      "0x8d99F8b2710e6A3B94d9bf465A98E5273069aCBd",
      { bps: 25, recipient: "0x54F08c27e75BeA0cdDdb8aA9D69FD61551B19BbA" },
    );
    expect(appData.hash).toBe(
      "0x5a8bb9f6dd0c7f1b4730d9c5a811c2dfe559e67ce9b5ed6965b05e59b8c86b80",
    );

    expect(await appDataExists(orderbook, appData)).toBe(false);
  });

  it("validates amount format", () => {
    // Test applySlippage amount format for SELL orders
    const amounts = { buyAmount: "1000", sellAmount: "1000" };
    const sellResult = applySlippage({ kind: OrderKind.SELL, ...amounts }, 50);

    // For SELL orders, we expect buyAmount to be calculated
    expect(sellResult).toHaveProperty("buyAmount");
    if (sellResult.buyAmount) {
      expect(typeof sellResult.buyAmount).toBe("string");
      expect(/^\d+$/.test(sellResult.buyAmount)).toBe(true);
    }

    // Test applySlippage amount format for BUY orders
    const buyResult = applySlippage({ kind: OrderKind.BUY, ...amounts }, 50);

    // For BUY orders, we expect sellAmount to be calculated
    expect(buyResult).toHaveProperty("sellAmount");
    if (buyResult.sellAmount) {
      expect(typeof buyResult.sellAmount).toBe("string");
      expect(/^\d+$/.test(buyResult.sellAmount)).toBe(true);
    }

    // Test createOrder amount formats
    const commonFields = {
      sellToken: SEPOLIA_DAI,
      buyToken: SEPOLIA_COW,
      receiver: DEPLOYED_SAFE,
      sellAmount: "1911566262405367520",
      buyAmount: "1580230386982546854",
      validTo: 1730022042,
      appData:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      partiallyFillable: false,
    };

    const quoteResponse: OrderQuoteResponse = {
      quote: {
        ...commonFields,
        feeAmount: "88433737594632480",
        kind: OrderKind.SELL,
        sellTokenBalance: SellTokenSource.ERC20,
        buyTokenBalance: BuyTokenDestination.ERC20,
        signingScheme: SigningScheme.PRESIGN,
      },
      from: DEPLOYED_SAFE,
      expiration: "2024-10-27T09:12:42.738162481Z",
      id: 470630,
      verified: true,
    };

    const order = createOrder(quoteResponse);

    // Check that amounts are strings
    expect(typeof order.sellAmount).toBe("string");
    expect(typeof order.buyAmount).toBe("string");
    expect(typeof order.feeAmount).toBe("string");

    // Check that amounts contain only digits
    expect(/^\d+$/.test(order.sellAmount)).toBe(true);
    expect(/^\d+$/.test(order.buyAmount)).toBe(true);
    expect(/^\d+$/.test(order.feeAmount)).toBe(true);
  });
});
