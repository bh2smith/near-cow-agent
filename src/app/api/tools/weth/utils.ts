import { MetaTransaction, Network, SignRequestData } from "near-safe";
import { Address, getAddress, parseEther, toHex } from "viem";
import { signRequestFor } from "../util";

export function validateWethInput(params: URLSearchParams): {
  chainId: number;
  amount: bigint;
  wethAddress: Address;
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
    wethAddress: getWethAddress(chainId),
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
    to: getWethAddress(chainId),
    value: toHex(amount),
    // methodId for weth.deposit
    data: "0xd0e30db0",
  };
};

export function getWethAddress(chainId: number): Address {
  const network = Network.fromChainId(chainId);
  const wethAddress = network.nativeCurrency.wrappedAddress;
  if (!wethAddress) {
    throw new Error(
      `Couldn't find wrapped address for Network ${network.name} (chainId=${chainId})`,
    );
  }
  return getAddress(wethAddress);
}
