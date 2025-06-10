import type { Order } from "@cowprotocol/contracts";
import { computeOrderUid } from "@cowprotocol/contracts";
import type { v1_1_0 } from "@cowprotocol/app-data";
import { MetadataApi } from "@cowprotocol/app-data";
import type { Hex, TransactionReceipt, WalletClient } from "viem";
import { parseAbi, publicActions } from "viem";

const SETTLEMENT_CONTRACT = "0x9008D19f58AAbD9eD0D60971565AA8510560ab41";

// TODO: This should be replaced with COW SDK create/post order.
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
  // TODO: We should also post the order.
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
