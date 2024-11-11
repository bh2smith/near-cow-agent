import { Address } from "viem";

interface TokenBalance {
  tokenAddress: string | null; // null for native token
  token: {
    name: string;
    symbol: string;
    decimals: number;
    logoUri: string;
  };
  balance: string;
  fiatBalance: string;
  fiatConversion: string;
}

const SAFE_SERVICE_URLS: { [chainId: number]: string } = {
  1: "https://safe-transaction-mainnet.safe.global",
  42161: "https://safe-transaction-arbitrum.safe.global",
  11155111: "https://safe-transaction-sepolia.safe.global",
  // Add more networks as needed
};

export type TokenBalanceMap = { [symbol: string]: TokenBalance };

export async function getSafeBalances(
  chainId: number,
  address: Address,
): Promise<TokenBalance[]> {
  console.log("getSafeBalances", chainId, address);
  const baseUrl = SAFE_SERVICE_URLS[chainId];
  if (!baseUrl) {
    throw new Error(
      `Chain ID ${chainId} not supported by Safe Transaction Service`,
    );
  }
  const trusted = chainId === 11155111 ? false : true;
  const exclude_spam = chainId === 11155111 ? false : true;
  const url = `${baseUrl}/api/v1/safes/${address}/balances/?trusted=${trusted}&exclude_spam=${exclude_spam}`;

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching Safe balances:", error);
    throw error;
  }
}
