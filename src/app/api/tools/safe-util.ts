import { Address, checksumAddress } from "viem";
import { UserToken, ZerionAPI } from "zerion-sdk";

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

const SAFE_NETWORKS: { [chainId: number]: string } = {
  1: "mainnet",
  10: "optimism",
  56: "binance",
  100: "gnosis-chain",
  137: "polygon",
  8453: "base",
  42161: "arbitrum",
  11155111: "sepolia",
};

export function safeTxServiceUrlFor(chainId: number): string | undefined {
  const network = SAFE_NETWORKS[chainId];
  if (!network) {
    console.warn(`Unsupported Safe Transaction Service chainId=${chainId}`);
    return undefined;
  }
  return `https://safe-transaction-${network}.safe.global`;
}

export type TokenBalanceMap = { [symbol: string]: TokenBalance };

export async function getSafeBalances(
  chainId: number,
  address: Address,
): Promise<TokenBalance[]> {
  const baseUrl = safeTxServiceUrlFor(chainId);
  if (!baseUrl) {
    console.warn(
      `Chain ID ${chainId} not supported by Safe Transaction Service`,
    );
    return [];
  }
  const trusted = chainId === 11155111 ? false : true;
  const exclude_spam = chainId === 11155111 ? false : true;
  const url = `${baseUrl}/api/v1/safes/${checksumAddress(address)}/balances/?trusted=${trusted}&exclude_spam=${exclude_spam}`;

  try {
    console.log(`Fetching Safe balances for ${address} from ${url}`);
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
    });
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Safe not found for ${address}: Using Zerion`);
        // Not a Safe, try Zerion
        try {
          const zerion = new ZerionAPI(process.env.ZERION_API_KEY!);
          // TODO(bh2smith): This is not super efficient, but it works for now.
          // Zerion API has its own network filter (but its not by chainID).
          const balances = await zerion.ui.getUserBalances(address, {
            options: { supportedChains: [chainId] },
          });
          return zerionToTokenBalances(balances.tokens);
        } catch {
          return [];
        }
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Safe balances:", error);
    throw error;
  }
}

export function balancesMap(balances: TokenBalance[]): TokenBalanceMap {
  return balances.reduce((acc, balance) => {
    acc[balance.token.symbol] = balance;
    return acc;
  }, {} as TokenBalanceMap);
}

// TODO(bh2smith): Move this into Zerion SDK
function zerionToTokenBalance(userToken: UserToken): TokenBalance {
  const { meta, balances } = userToken;

  return {
    tokenAddress: meta.contractAddress || null,
    token: {
      name: meta.name,
      symbol: meta.symbol,
      decimals: meta.decimals,
      logoUri: meta.tokenIcon || "",
    },
    balance: balances.balance.toFixed(), // Convert number to string
    fiatBalance: balances.usdBalance.toFixed(2),
    fiatConversion: (balances.price || 0).toFixed(2),
  };
}

// Helper function to convert array of UserTokens to TokenBalances
export function zerionToTokenBalances(userTokens: UserToken[]): TokenBalance[] {
  return userTokens
    .filter((token) => !token.meta.isSpam) // Filter out spam tokens
    .map(zerionToTokenBalance);
}
