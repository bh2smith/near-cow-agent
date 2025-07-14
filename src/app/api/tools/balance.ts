import { getClientWithAlchemy } from "@/src/app/api/tools/util";
import type { TokenInfo } from "@bitte-ai/agent-sdk";
import { erc20Abi, formatUnits, type Address } from "viem";
import { NATIVE_ASSET } from "./cowswap/util/protocol";

export async function sufficientBalance(
  chainId: number,
  wallet: Address,
  amount: bigint,
  tokenAddress?: Address,
): Promise<{ sufficient: boolean; balance: bigint | null }> {
  console.log(
    "Check Sell Token Balance",
    chainId,
    wallet,
    amount,
    tokenAddress,
  );
  try {
    const client = getClientWithAlchemy(chainId);
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
    const sufficient = balance >= amount;
    return { sufficient, balance };
  } catch (error) {
    console.error(
      `Couldn't read wallet balance for token ${tokenAddress} assuming sufficient: ${error}`,
    );
    return { sufficient: true, balance: null };
  }
}

export async function assertSufficientBalance(
  chainId: number,
  wallet: Address,
  amount: bigint,
  token?: TokenInfo,
): Promise<void> {
  const { sufficient, balance } = await sufficientBalance(
    chainId,
    wallet,
    amount,
    token?.address,
  );
  if (!sufficient) {
    const have =
      balance !== null
        ? formatUnits(balance, token?.decimals ?? 18)
        : "unknown";
    throw new Error(
      `Insufficient SellToken Balance: Have ${have} - Need ${amount}`,
    );
  }
}
