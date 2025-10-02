import {
  type Address,
  encodeFunctionData,
  getAddress,
  maxUint256,
  parseAbi,
  parseEther,
  toHex,
} from "viem";
import {
  getClientForChain,
  MetaTransaction,
  SignRequest,
} from "@bitte-ai/agent-sdk/evm";
import { WethInput } from "./schema";
import { getWrappedNative } from "./static";

interface Balances {
  native: bigint;
  wrapped: bigint;
}

export async function getBalances(
  address: Address,
  chainId: number,
): Promise<Balances> {
  const client = getClientForChain(chainId);
  const wrappedAddress = getWrappedNative(chainId).address;
  // TODO: Multicall.
  const [native, wrapped] = await Promise.all([
    client.getBalance({ address }),
    client.readContract({
      address: getAddress(wrappedAddress),
      abi: parseAbi([
        "function balanceOf(address owner) view returns (uint256)",
      ]),
      functionName: "balanceOf",
      args: [address],
      // TODO: This is weird shit.
      authorizationList: undefined, // or []
    }),
  ]);
  return {
    native,
    wrapped,
  };
}

export async function refineWethInput(params: WethInput): Promise<{
  chainId: number;
  amount: bigint;
  balances: Balances;
}> {
  const { chainId, amount, evmAddress, all } = params;
  const balances = await getBalances(evmAddress, chainId);
  console.log("balances", balances);
  return {
    chainId,
    // Exceeds balances.
    amount: all ? maxUint256 : parseEther(amount.toString()),
    balances,
  };
}

export const unwrapMetaTransaction = (
  chainId: number,
  amount: bigint,
): MetaTransaction => {
  return {
    to: getWrappedNative(chainId).address,
    value: "0x0",
    data: encodeFunctionData({
      abi: parseAbi(["function withdraw(uint wad)"]),
      functionName: "withdraw",
      args: [amount],
    }),
  };
};

export const wrapMetaTransaction = (
  chainId: number,
  amount: bigint,
): MetaTransaction => {
  return {
    to: getWrappedNative(chainId).address,
    value: toHex(amount),
    // methodId for weth.deposit
    data: "0xd0e30db0",
  };
};

export interface SignRequestResponse {
  transaction: SignRequest;
  meta: { description: string };
}
