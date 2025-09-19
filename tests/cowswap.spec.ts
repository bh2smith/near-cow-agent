import {
  appDataExists,
  applySlippage,
  createOrder,
  generateAppData,
  isNativeAsset,
  NATIVE_ASSET,
  sellTokenApprovalTx,
  setPresignatureTx,
} from "@/src/lib/protocol/util";
import { getClient } from "@/src/lib/rpc";
import { basicParseQuote } from "@/src/lib/protocol/quote";
import {
  BuyTokenDestination,
  OrderBookApi,
  OrderKind,
  OrderQuoteResponse,
  OrderQuoteSideKindSell,
  SellTokenSource,
  SigningScheme,
} from "@cowprotocol/sdk-order-book";
import { checksumAddress, getAddress, zeroAddress } from "viem";
import { loadTokenMap } from "@bitte-ai/agent-sdk/evm";
import { COW_SUPPORTED_CHAINS } from "@/src/app/config";
import { CowIcons } from "@/src/lib/ui";
import { QuoteRequestInput } from "@/src/lib/schema";

const SEPOLIA_DAI = getAddress("0xb4f1737af37711e9a5890d9510c9bb60e170cb0d");
const SEPOLIA_COW = getAddress("0x0625afb445c3b6b7b929342a04a22599fd5dbb59");
// Safe Associated with neareth-dev.testnet on Bitte Wallet.
const DEPLOYED_SAFE = getAddress("0x5E1E315D96BD81c8f65c576CFD6E793aa091b480");

const tokenData = {
  sell: {
    address: SEPOLIA_DAI,
    decimals: 18,
    symbol: "DAI",
    name: "DAI Token",
  },
  buy: {
    address: SEPOLIA_COW,
    decimals: 6,
    symbol: "COW",
    name: "CoW Protocol Token",
  },
};

const chainId = 11155111;

const client = getClient(chainId);
const quoteRequest = {
  chainId,
  evmAddress: DEPLOYED_SAFE,
  sellToken: tokenData.sell.address,
  buyToken: tokenData.buy.address,
  receiver: DEPLOYED_SAFE,
  kind: OrderQuoteSideKindSell.SELL,
  sellAmountBeforeFee: "2000000000000000000",
};

describe("CowSwap Plugin", () => {
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
        sellToken: tokenData.sell.address,
        sellAmount: "100",
        client,
      }),
    ).toStrictEqual(null);
  });

  it("sellTokenApprovalTx: not null - not approved", async () => {
    // Not approved
    expect(
      await sellTokenApprovalTx({
        from: zeroAddress, // Will never be approved
        sellToken: tokenData.sell.address,
        sellAmount: "100",
        client,
      }),
    ).toStrictEqual({
      to: tokenData.sell.address,
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
        client,
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

  it("basicParseQuote", async () => {
    const tokenMap = await loadTokenMap(COW_SUPPORTED_CHAINS);
    const request: QuoteRequestInput = {
      amount: 1,
      chainId: 8453,
      buyToken: "ETH",
      receiver: "0x968dc7336Ba79cA4304549089345F9292bBA65bB",
      orderKind: "sell",
      sellToken: "USDC",
      evmAddress: getAddress("0x968dc7336Ba79cA4304549089345F9292bBA65bB"),
      slippageBps: 50,
      validFor: 1800,
    };
    const client = getClient(request.chainId);
    const parsed = await basicParseQuote(client, request, tokenMap);
    console.log(tokenMap[1] === tokenMap[8453]);
    expect(parsed.quoteRequest).toStrictEqual({
      sellToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      buyToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      sellAmountBeforeFee: "1000000",
      kind: "sell",
      receiver: "0x968dc7336Ba79cA4304549089345F9292bBA65bB",
      from: "0x968dc7336Ba79cA4304549089345F9292bBA65bB",
      signingScheme: "eip712",
      validFor: 1800,
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

    expect(await appDataExists(orderbook, appData)).toBe(false);
  });

  it("getTokenLogoUri", async () => {
    const chainId = 1;
    const gno = "0x6810e776880c02933d47db1b9fc05908e5386b96";
    const cow = "0xdef1ca1fb7fbcdc777520aa7f396b4e015f497ab";
    const eth = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const cowIcons = new CowIcons();
    await Promise.all([
      cowIcons.getIcon({ address: gno, chainId }),
      cowIcons.getIcon({ address: cow, chainId }),
      cowIcons.getIcon({ address: eth, chainId }),
    ]);
  });
});
