import {
  Address,
  encodeFunctionData,
  getAddress,
  Hex,
  isHex,
  parseAbi,
  parseUnits,
} from "viem";
import { NextRequest } from "next/server";
import {
  OrderBookApi,
  OrderCreation,
  OrderQuoteRequest,
  OrderQuoteResponse,
  OrderQuoteSideKindSell,
  SigningScheme,
  OrderParameters,
  OrderKind,
} from "@cowprotocol/cow-sdk";
import { getClient, MetaTransaction } from "near-safe";
import { getTokenDetails } from "./tokens";
// @ts-expect-error: something is wrong with the app-data package
import { MetadataApi } from "@cowprotocol/app-data";
import { extractAccountId } from "../../util";

const MAX_APPROVAL = BigInt(
  "115792089237316195423570985008687907853269984665640564039457584007913129639935",
);

// CoW (and many other Dex Protocols use this to represent native asset).
export const NATIVE_ASSET = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const GPV2SettlementContract = "0x9008D19f58AAbD9eD0D60971565AA8510560ab41";
const GPv2VaultRelayer = "0xC92E8bdf79f0507f65a392b0ab4667716BFE0110";

export interface ParsedQuoteRequest {
  quoteRequest: OrderQuoteRequest;
  chainId: number;
}

export async function parseQuoteRequest(
  req: NextRequest,
): Promise<ParsedQuoteRequest> {
  // TODO - Add Type Guard on Request (to determine better if it needs processing below.)
  const requestBody = await req.json();
  console.log("Raw Request Body:", requestBody);
  // TODO: Validate input with new validation tools:
  const { sellToken, buyToken, chainId, sellAmountBeforeFee } = requestBody;
  if (sellAmountBeforeFee === "0") {
    throw new Error("Sell amount cannot be 0");
  }
  const [buyTokenData, sellTokenData] = await Promise.all([
    getTokenDetails(chainId, buyToken),
    getTokenDetails(chainId, sellToken),
  ]);

  const { safeAddress: sender } = await extractAccountId(req);

  return {
    chainId,
    quoteRequest: {
      sellToken: sellTokenData.address,
      buyToken: buyTokenData.address,
      sellAmountBeforeFee: parseUnits(
        sellAmountBeforeFee,
        sellTokenData.decimals,
      ).toString(),
      // TODO - change this when we want to enable buy orders.
      kind: OrderQuoteSideKindSell.SELL,
      // TODO - change this when we want to enable alternate recipients.
      receiver: sender,
      from: sender,
      // manually add PRESIGN (since this is a safe);
      signingScheme: SigningScheme.PRESIGN,
    },
  };
}

export function setPresignatureTx(orderUid: string): MetaTransaction {
  if (!isHex(orderUid)) {
    throw new Error(`Invalid OrderUid (not hex): ${orderUid}`);
  }
  return {
    to: GPV2SettlementContract,
    value: "0x0",
    data: encodeFunctionData({
      abi: parseAbi([
        "function setPreSignature(bytes calldata orderUid, bool signed) external",
      ]),
      functionName: "setPreSignature",
      args: [orderUid, true],
    }),
  };
}

export async function sellTokenApprovalTx(args: {
  from: string;
  sellToken: string;
  chainId: number;
  sellAmount: string;
}): Promise<MetaTransaction | null> {
  const { from, sellToken, chainId, sellAmount } = args;

  const allowance = await checkAllowance(
    getAddress(from),
    getAddress(sellToken),
    GPv2VaultRelayer,
    chainId,
  );

  if (allowance < BigInt(sellAmount)) {
    // Insufficient allowance
    return {
      to: sellToken,
      value: "0x0",
      data: encodeFunctionData({
        abi: parseAbi([
          "function approve(address spender, uint256 amount) external",
        ]),
        functionName: "approve",
        args: [GPv2VaultRelayer, MAX_APPROVAL],
      }),
    };
  }
  return null;
}

export function isNativeAsset(token: string): boolean {
  return token.toLowerCase() === NATIVE_ASSET.toLowerCase();
}

export function createOrder(quoteResponse: OrderQuoteResponse): OrderCreation {
  return {
    ...quoteResponse.quote,
    signature: "0x",
    signingScheme: SigningScheme.PRESIGN,
    quoteId: quoteResponse.id,
    // Add from to PRESIGN: {"errorType":"MissingFrom","description":"From address must be specified for on-chain signature"}%
    from: quoteResponse.from,
    // TODO: Orders are expiring presumably because of this.
    // Override the Fee amount because of {"errorType":"NonZeroFee","description":"Fee must be zero"}%
    feeAmount: "0",
  };
}

type SlippageOrderParameters = Pick<
  OrderParameters,
  "kind" | "buyAmount" | "sellAmount"
>;

export function applySlippage(
  order: SlippageOrderParameters,
  bps: number,
): { buyAmount?: string; sellAmount?: string } {
  const scaleFactor = BigInt(10000);
  if (order.kind === OrderKind.SELL) {
    const slippageBps = BigInt(10000 - bps); // 99.50% (100% - 0.5%)
    return {
      buyAmount: (
        (BigInt(order.buyAmount) * slippageBps) /
        scaleFactor
      ).toString(),
    };
  } else if (order.kind === OrderKind.BUY) {
    const slippageBps = BigInt(10000 + bps); // 99.50% (100% - 0.5%)
    return {
      sellAmount: (
        (BigInt(order.sellAmount) * slippageBps) /
        scaleFactor
      ).toString(),
    };
  }
  return order;
}

// Helper function to check token allowance
async function checkAllowance(
  owner: Address,
  token: Address,
  spender: Address,
  chainId: number,
): Promise<bigint> {
  return getClient(chainId).readContract({
    address: token,
    abi: parseAbi([
      "function allowance(address owner, address spender) external view returns (uint256)",
    ]),
    functionName: "allowance",
    args: [owner, spender],
  });
}

// This function stays out here for now because of a bug with app-data package
// https://github.com/cowprotocol/app-data/issues/68
export async function generateAppData(
  appCode: string,
  referrerAddress: string,
): Promise<{ hash: Hex; data: string; cid: string }> {
  const metadataApi = new MetadataApi();
  const appDataDoc = await metadataApi.generateAppDataDoc({
    appCode,
    metadata: { referrer: { address: referrerAddress } },
  });
  const appData = await metadataApi.appDataToCid(appDataDoc);

  // Viem Equivalent
  // const appHash = keccak256(toBytes(JSON.stringify(appDataDoc)));
  console.log(`Constructed AppData with Hash ${appData.appDataHex}`);

  return {
    cid: appData.cid,
    hash: appData.appDataHex,
    data: appData.appDataContent,
  };
}

export async function buildAndPostAppData(
  orderbook: OrderBookApi,
  appCode: string,
  referrerAddress: string,
): Promise<Hex> {
  const appData = await generateAppData(appCode, referrerAddress);

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
  if (!exists) {
    await orderbook.uploadAppData(appData.hash, appData.data);
  }
  return appData.hash;
}
