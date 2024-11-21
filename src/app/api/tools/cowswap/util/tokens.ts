import { Address, erc20Abi, getAddress, isAddress } from "viem";
import tokenMap from "../../../../../../public/tokenMap.json";
import { getClient } from "near-safe";

export interface TokenInfo {
  address: Address;
  decimals: number;
}

type SymbolMapping = Record<string, TokenInfo>;
type ChainId = number;
export type BlockchainMapping = Record<ChainId, SymbolMapping>;

export async function getTokenDetails(
  chainId: number,
  symbolOrAddress: string,
): Promise<TokenInfo> {
  if (isAddress(symbolOrAddress, { strict: false })) {
    return {
      address: symbolOrAddress,
      decimals: await getTokenDecimals(chainId, symbolOrAddress),
    };
  }
  console.log("Seeking TokenMap for Symbol", symbolOrAddress);
  return (tokenMap as BlockchainMapping)[chainId][
    // TokenMap has lower cased (sanitized) symbols
    symbolOrAddress.toLowerCase()
  ];
}

// Function to request token decimals
async function getTokenDecimals(
  chainId: number,
  tokenAddress: string,
): Promise<number> {
  const client = getClient(chainId);
  try {
    const decimals = await client.readContract({
      address: getAddress(tokenAddress),
      abi: erc20Abi,
      functionName: "decimals",
    });

    return decimals as number;
  } catch (error: unknown) {
    throw new Error(`Error fetching token decimals: ${error}`);
  }
}
