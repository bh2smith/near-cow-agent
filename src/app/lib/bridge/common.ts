import type { Order } from "@cowprotocol/contracts";
import { computeOrderUid } from "@cowprotocol/contracts";
import type { v1_1_0 } from "@cowprotocol/app-data";
import { MetadataApi } from "@cowprotocol/app-data";
import type {
  Address,
  Hex,
  PublicClient,
  TransactionReceipt,
  WalletClient,
} from "viem";
import { erc20Abi, parseAbi, publicActions } from "viem";

const SETTLEMENT_CONTRACT = "0x9008D19f58AAbD9eD0D60971565AA8510560ab41";

export const DEFAULT_GAS_COST_FOR_HOOK_ESTIMATION = BigInt(200_000); // Based on https://dashboard.tenderly.co/shoom/project/simulator/a5e29dac-d0f2-407f-9e3d-d1b916da595b

export const estimateGasForExecuteHooks = async (
  provider: PublicClient,
  to: Address,
  calldata: Hex,
) => {
  try {
    return provider.estimateGas({ to, data: calldata });
  } catch (err) {
    // TODO: Extract from quote provider.
    console.warn(`Couldn't estimate Hook gas - (using fallback): ${err}`);
    return DEFAULT_GAS_COST_FOR_HOOK_ESTIMATION;
  }
};

export const getTokenBalance = async (
  provider: PublicClient,
  token: Address,
  owner: Address,
) => {
  return provider.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [owner],
  });
};

// sets presignature for given order for given user. it uses the appdata package
// to compute the appdata hash using the hooks data
export const createOrder = async (
  wallet: WalletClient,
  order: Order,
  hooks: v1_1_0.OrderInteractionHooks,
): Promise<TransactionReceipt> => {
  if (!wallet.account) {
    throw new Error("Wallet Client missing account!");
  }
  const owner = wallet.account.address;
  console.log(`Creating order for user: ${owner}`, order);
  const metadataApi = new MetadataApi();
  const appDataDoc = await metadataApi.generateAppDataDoc({
    appCode: "CoW Swap",
    environment: "production",
    metadata: {
      hooks,
    },
  });
  const { appDataHex } = await metadataApi.getAppDataInfo(appDataDoc);
  order.appData = appDataHex;

  const domain = {
    name: "Gnosis Protocol",
    version: "v2",
    chainId: 1,
    verifyingContract: SETTLEMENT_CONTRACT,
  };
  const orderId = computeOrderUid(domain, order, owner) as Hex;
  // TODO wallet.simulateTransaction first.
  const txHash = await wallet.writeContract({
    abi: parseAbi(["function setPreSignature(bytes,bool)"]),
    functionName: "setPreSignature",
    args: [orderId, true],
    address: SETTLEMENT_CONTRACT,
    chain: wallet.chain,
    account: owner,
  });
  const receipt = await wallet
    .extend(publicActions)
    .waitForTransactionReceipt({ hash: txHash });
  if (receipt.status === "reverted")
    throw new Error(`create order failed: ${txHash}`);
  return receipt;
};
