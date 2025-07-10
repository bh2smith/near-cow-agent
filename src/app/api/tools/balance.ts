import { getClient } from "near-safe";
import { erc20Abi, type Address } from "viem";
import { NATIVE_ASSET } from "./cowswap/util/protocol";

export async function sufficientSellTokenBalance(
  chainId: number,
  wallet: Address,
  sellAmount: bigint,
  tokenAddress?: Address,
): Promise<{ sufficient: boolean; balance: bigint | null }> {
  console.log(
    "Check Sell Token Balance",
    chainId,
    wallet,
    sellAmount,
    tokenAddress,
  );
  try {
    const client = getClient(chainId);
    let balance: bigint;
    if (!tokenAddress || tokenAddress === NATIVE_ASSET) {
      balance = await client.getBalance({ address: wallet });
    } else {
      balance = await client.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [wallet],
      });
    }
    console.log("Balance", balance);
    const sufficient = balance >= sellAmount;
    return { sufficient, balance };
  } catch (error) {
    console.error(
      `Couldn't read wallet balance for token ${tokenAddress} assuming sufficient: ${error}`,
    );
    return { sufficient: true, balance: null };
  }
}
