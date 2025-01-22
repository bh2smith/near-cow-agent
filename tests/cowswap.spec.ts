import { orderRequestFlow } from "@/src/app/api/tools/cowswap/orderFlow";
import {
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
  OrderQuoteResponse,
  OrderQuoteSideKindSell,
  SellTokenSource,
  SigningScheme,
} from "@cowprotocol/cow-sdk";
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
    const signRequest = await orderRequestFlow({
      chainId,
      quoteRequest: { ...quoteRequest, from: DEPLOYED_SAFE },
    });
    console.log(signRequest);
    console.log(
      `https://testnet.wallet.bitte.ai/sign-evm?evmTx=${encodeURI(JSON.stringify(signRequest))}`,
    );
  });

  it("applySlippage", async () => {
    const amounts = { buyAmount: "1000", sellAmount: "1000" };
    expect(
      applySlippage({ kind: OrderKind.BUY, ...amounts }, 50),
    ).toStrictEqual({
      sellAmount: "1005",
    });
    expect(
      applySlippage({ kind: OrderKind.SELL, ...amounts }, 50),
    ).toStrictEqual({
      buyAmount: "995",
    });

    const smallAmounts = { buyAmount: "100", sellAmount: "100" };
    expect(
      applySlippage({ kind: OrderKind.BUY, ...smallAmounts }, 100),
    ).toStrictEqual({
      sellAmount: "101",
    });
    expect(
      applySlippage({ kind: OrderKind.SELL, ...smallAmounts }, 100),
    ).toStrictEqual({
      buyAmount: "99",
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
    expect(await parseQuoteRequest(request, tokenMap)).toStrictEqual({
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
    expect(createOrder(quoteResponse)).toStrictEqual({
      ...commonFields,
      quoteId: 470630,
      from: DEPLOYED_SAFE,
      feeAmount: "0",
      kind: "sell",
      sellTokenBalance: "erc20",
      buyTokenBalance: "erc20",
      signature: "0x",
      signingScheme: "presign",
      validTo: 1730022042,
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

    const exists = await orderbook
      .getAppData(appData.hash)
      .then(() => {
        // If successful, `data` will be the resolved value from `getAppData`.
        return true;
      })
      .catch((error) => {
        console.error("Error fetching app data:", error.message);
        return false; // Or any default value to indicate the data does not exist
      });
    expect(exists).toBe(false);
  });
});
