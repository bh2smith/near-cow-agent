import type { Address } from "viem";
import type { TokenBalance } from "zerion-sdk";
import { ZerionAPI, zerionToTokenBalances } from "zerion-sdk";

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
