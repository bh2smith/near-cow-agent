import type { Order } from "@cowprotocol/contracts";
import { OrderBalance, OrderKind } from "@cowprotocol/contracts";
import { createOrder } from "../app/lib/bridge/common";
import { getAddress, type Address, type WalletClient } from "viem";
import { formatBytes32String } from "../app/lib/bridge/cow-shed";
import { gnosisBridgeCommands } from "../app/lib/weiroll/gnosisNativeBridge";
import { CowShedSdk, type CowShedCall } from "@cowprotocol/cow-sdk";

const ZERO = BigInt(0);
interface OrderInfo {
  buyToken: Address;
  sellToken: Address; // 0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1 WETH GC
  buyAmount: bigint;
  sellAmount: bigint;
  validity?: number;
}

export async function swapAndBridgeExample(
  wallet: WalletClient,
  orderInfo: OrderInfo,
): Promise<void> {
  if (!wallet.account) {
    throw new Error("Missing wallet account");
  }
  if (!wallet.chain) {
    throw new Error("Missing chain");
  }
  const chainId = wallet.chain.id;
  const userAddr = wallet.account.address;

  const shed = new CowShedSdk();
  const shedAccount = getAddress(shed.getCowShedAccount(chainId, userAddr));

  // TODO: We need ot split this.
  const cowShedCall = await shed.signCalls({
    chainId,
    calls: gnosisBridgeCommands(orderInfo.buyToken, shedAccount),
    nonce: formatBytes32String(Date.now().toString()),
  });

  await postSwapAndBridgeOrder(wallet, orderInfo, cowShedCall);
}

export async function postSwapAndBridgeOrder(
  wallet: WalletClient,
  orderInfo: OrderInfo,
  { cowShedAccount, signedMulticall, gasLimit }: CowShedCall,
) {
  const { to, data } = signedMulticall;

  const hooks = {
    post: [{ target: to, callData: data, gasLimit: gasLimit.toString() }],
  };

  const { sellToken, buyToken, sellAmount, buyAmount, validity } = orderInfo;
  const validTo = validity ?? Math.floor(new Date().getTime() / 1000) + 7200;
  const order: Order = {
    sellToken,
    buyToken,
    receiver: cowShedAccount,
    sellAmount,
    buyAmount,
    validTo,
    appData: "",
    feeAmount: ZERO,
    kind: OrderKind.SELL,
    partiallyFillable: true,
    sellTokenBalance: OrderBalance.ERC20,
    buyTokenBalance: OrderBalance.ERC20,
  };

  // create order
  const orderTx = await createOrder(wallet, order, hooks);
  console.log("Create order tx", orderTx.transactionHash);
}
