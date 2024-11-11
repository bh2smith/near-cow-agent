import { MetaTransaction, SignRequestData } from "near-safe";
import { getAddress, Hex, zeroAddress } from "viem";

export function signRequestFor({
  chainId,
  metaTransactions,
}: {
  chainId: number;
  metaTransactions: MetaTransaction[];
}): SignRequestData {
  console.log("metaTransactions", metaTransactions);
  return {
    method: "eth_sendTransaction",
    chainId,
    params: metaTransactions.map((mt) => ({
      from: zeroAddress,
      to: getAddress(mt.to),
      value: mt.value as Hex,
      data: mt.data as Hex,
    })),
  };
}
