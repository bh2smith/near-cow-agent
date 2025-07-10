import { TokenInfo } from "@bitte-ai/agent-sdk";
import { getClient } from "near-safe";
import { erc20Abi, type Address } from "viem";
import type { TokenBalance } from "zerion-sdk";
import { ZerionAPI, zerionToTokenBalances } from "zerion-sdk";
import { NATIVE_ASSET } from "./cowswap/util/protocol";

export async function getBalances(
  address: Address,
  zerionKey: string,
): Promise<TokenBalance[]> {
  try {
    const zerion = new ZerionAPI(zerionKey);
    const balances = await zerion.ui.getUserBalances(address, {
      useStatic: true,
      options: { hideDust: 0.01 },
    });
    return zerionToTokenBalances(balances.tokens);
  } catch (error) {
    console.error("Error fetching Zerion balances:", error);
    return [];
  }
}

export async function sufficientSellTokenBalance(
  chainId: number,
  wallet: Address,
  sellAmount: bigint,
  tokenAddress?: Address,
): Promise<{ sufficient: boolean; balance: bigint | null }> {
  
  try {
    const client = getClient(chainId);
    let balance: bigint;
    if (!tokenAddress || tokenAddress === NATIVE_ASSET) {
      balance = await client.getBalance({address: wallet});
    } else {
      balance = await client.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [wallet],
          });
    }
    
    const sufficient = balance >= sellAmount;
    return { sufficient, balance };
  } catch (error) {
    console.error(
      `Couldn't read wallet balance for token ${tokenAddress} assuming sufficient: ${error}`,
    );
    return { sufficient: true, balance: null };
  }
}