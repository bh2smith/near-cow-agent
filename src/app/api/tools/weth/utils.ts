import { MetaTransaction, Network, SignRequestData } from "near-safe";
import { Address, getAddress, parseEther, toHex } from "viem";
import { signRequestFor } from "../util";

type NativeAsset = {
  address: Address;
  symbol: string;
  scanUrl: string;
  decimals: number;
};

export function validateWethInput(params: URLSearchParams): {
  chainId: number;
  amount: bigint;
  nativeAsset: NativeAsset;
} {
  const chainIdStr = params.get("chainId");
  const amountStr = params.get("amount");

  // Ensure required fields
  if (!chainIdStr) {
    throw new Error("Missing required parameter: chainId");
  }
  if (!amountStr) {
    throw new Error("Missing required parameter: amount");
  }

  // Validate chainId
  const chainId = parseInt(chainIdStr);
  if (isNaN(chainId)) {
    throw new Error("Invalid chainId, must be a number");
  }

  // Validate amount
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Invalid amount, must be a positive float");
  }

  return {
    chainId,
    amount: parseEther(amount.toString()),
    nativeAsset: getNativeAsset(chainId),
  };
}

export function wrapSignRequest(
  chainId: number,
  amount: bigint,
): SignRequestData {
  return signRequestFor({
    chainId,
    metaTransactions: [wrapMetaTransaction(chainId, amount)],
  });
}

export const wrapMetaTransaction = (
  chainId: number,
  amount: bigint,
): MetaTransaction => {
  return {
    to: getNativeAsset(chainId).address,
    value: toHex(amount),
    // methodId for weth.deposit
    data: "0xd0e30db0",
  };
};

export function getNativeAsset(chainId: number): NativeAsset {
  const network = Network.fromChainId(chainId);
  const wethAddress = network.nativeCurrency.wrappedAddress;
  if (!wethAddress) {
    throw new Error(
      `Couldn't find wrapped address for Network ${network.name} (chainId=${chainId})`,
    );
  }
  return {
    address: getAddress(wethAddress),
    symbol: network.nativeCurrency.symbol,
    scanUrl: `${network.scanUrl}/address/${wethAddress}`,
    decimals: network.nativeCurrency.decimals,
  };
}
