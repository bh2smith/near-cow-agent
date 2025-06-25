import type { Order } from "@cowprotocol/contracts";
import { OrderBalance, OrderKind } from "@cowprotocol/contracts";
import { createOrder } from "../app/lib/weiroll/common";
import type { Hash, Hex, PrivateKeyAccount } from "viem";
import {
  getAddress,
  hashTypedData,
  pad,
  publicActions,
  toBytes,
  toHex,
  type Address,
  type WalletClient,
} from "viem";
import type { ICoWShedCall, QuoteBridgeRequest } from "@cowprotocol/cow-sdk";
import {
  AcrossBridgeProvider,
  CowShedHooks,
  CowShedSdk,
  type CowShedCall,
} from "@cowprotocol/cow-sdk";
import type { TypedDataDomain } from "ethers";

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
  swapBrigeRequest: QuoteBridgeRequest,
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

  const acrossProvider = new AcrossBridgeProvider();
  const quote = await acrossProvider.getQuote(swapBrigeRequest);
  const depositCall = await acrossProvider.getUnsignedBridgeCall(
    swapBrigeRequest,
    quote,
  );
  const intermediateTokens =
    await acrossProvider.getIntermediateTokens(swapBrigeRequest);
  const orderInfo: OrderInfo = {
    // Use the intermediate token for the cowswap order.
    buyToken: getAddress(intermediateTokens[0].address),
    sellToken: getAddress(swapBrigeRequest.sellTokenAddress),
    buyAmount: BigInt(0), // TODO: This should not be zero!
    sellAmount: swapBrigeRequest.amount,
  };

  // const calls = gnosisBridgeCommands(orderInfo.buyToken, shedAccount);
  const nonce = formatBytes32String(Date.now().toString());
  const deadline = BigInt(
    orderInfo.validity ?? Math.floor(new Date().getTime() / 1000) + 7200,
  );
  const calls = [
    {
      allowFailure: false,
      isDelegateCall: true,
      target: depositCall.to,
      callData: depositCall.data,
      value: depositCall.value,
    },
  ];
  const hooksSdk = new CowShedHooks(chainId);
  const { infoToSign, hashToSign } = getSigningData(
    hooksSdk,
    calls,
    nonce,
    deadline,
    shedAccount,
  );
  console.log(infoToSign);
  // Here is where the agent must request signature!
  const signature = await (wallet.account as PrivateKeyAccount).sign({
    hash: hashToSign,
  });

  const callData = hooksSdk.encodeExecuteHooksForFactory(
    calls,
    nonce,
    deadline,
    wallet.account.address,
    signature,
  );

  const factoryCall = {
    to: getAddress(hooksSdk.getFactoryAddress()),
    data: toHex(callData),
    value: BigInt(0),
  };
  const gasLimit = await wallet.extend(publicActions).estimateGas(factoryCall);

  const cowShedCall: CowShedCall = {
    cowShedAccount: factoryCall.to,
    signedMulticall: factoryCall,
    gasLimit,
  };
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

export function formatBytes32String(text: string): Hash {
  const bytes = toBytes(text);

  if (bytes.length > 31) {
    throw new Error("bytes32 string must be less than 32 bytes");
  }

  return toHex(pad(bytes, { size: 32 })); // pads with zeros to 32 bytes
}

function getSigningData(
  hooksSdk: CowShedHooks,
  calls: ICoWShedCall[],
  nonce: Hex,
  deadline: bigint,
  shedAccount: Address,
): { infoToSign: CoWTypedData; hashToSign: Hash } {
  const ethersInfoToSign = hooksSdk.infoToSign(
    calls,
    nonce,
    deadline,
    shedAccount,
  );
  const { name, version, verifyingContract, chainId } = ethersInfoToSign.domain;
  const hashToSign = hashTypedData({
    domain: {
      name,
      chainId: chainId ? BigInt(chainId.toString()) : undefined,
      version,
      verifyingContract: verifyingContract
        ? toHex(verifyingContract)
        : undefined,
    },
    types: ethersInfoToSign.types,
    primaryType: "ExecuteHooks",
    message: ethersInfoToSign.message,
  });

  return { infoToSign: ethersInfoToSign, hashToSign };
}

interface CoWTypedData {
  domain: TypedDataDomain;
  types: {
    ExecuteHooks: {
      type: string;
      name: string;
    }[];
    Call: {
      type: string;
      name: string;
    }[];
  };
  message: {
    calls: ICoWShedCall[];
    nonce: string;
    deadline: bigint;
  };
}
