import {
  type OrderCreation,
  OrderKind,
  type OrderParameters,
  type OrderQuoteResponse,
  SigningScheme,
} from "@cowprotocol/cow-sdk";
import {
  type Address,
  encodeFunctionData,
  getAddress,
  type PublicClient,
  isHex,
  parseAbi,
} from "viem";

import type { MetaTransaction } from "@bitte-ai/types";

const MAX_APPROVAL = BigInt(
  "115792089237316195423570985008687907853269984665640564039457584007913129639935",
);

// CoW (and many other Dex Protocols use this to represent native asset).
export const NATIVE_ASSET = getAddress(
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
);
const SettlementContract = getAddress(
  "0x9008D19f58AAbD9eD0D60971565AA8510560ab41",
);
const GPv2VaultRelayer = "0xC92E8bdf79f0507f65a392b0ab4667716BFE0110";

export function setPresignatureTx(orderUid: string): MetaTransaction {
  if (!isHex(orderUid)) {
    throw new Error(`Invalid OrderUid (not hex): ${orderUid}`);
  }
  return {
    to: SettlementContract,
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
  client: PublicClient;
  sellAmount: string;
}): Promise<MetaTransaction | null> {
  const { from, sellToken, client, sellAmount } = args;
  console.log(
    `Checking approval for account=${from}, token=${sellToken} on chainId=${client.chain?.id}`,
  );
  const allowance = await checkAllowance(
    getAddress(from),
    getAddress(sellToken),
    GPv2VaultRelayer,
    client,
  );

  if (allowance < BigInt(sellAmount)) {
    // Insufficient allowance
    return {
      to: getAddress(sellToken),
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
    const slippageBps = BigInt(10000 - bps);
    return {
      buyAmount: (
        (BigInt(order.buyAmount) * slippageBps) /
        scaleFactor
      ).toString(),
    };
  } else if (order.kind === OrderKind.BUY) {
    const slippageBps = BigInt(10000 + bps);
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
  client: PublicClient,
): Promise<bigint> {
  return client.readContract({
    address: token,
    abi: parseAbi([
      "function allowance(address owner, address spender) external view returns (uint256)",
    ]),
    functionName: "allowance",
    args: [owner, spender],
  });
}
