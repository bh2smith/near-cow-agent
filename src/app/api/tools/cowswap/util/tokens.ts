import * as fs from "fs";
import csv from "csv-parser";
import { Address, erc20Abi, getAddress, isAddress } from "viem";
import { getClient } from "near-safe";
import path from "path";

export interface TokenInfo {
  address: Address;
  decimals: number;
}

type SymbolMapping = Record<string, TokenInfo>;
type ChainId = number;
type BlockchainMapping = Record<ChainId, SymbolMapping>;

const DuneNetworkMap: { [key: string]: number } = {
  ethereum: 1,
  gnosis: 100,
  arbitrum: 42161,
  sepolia: 11155111,
};

export async function loadTokenMapping(
  filePath: string,
): Promise<BlockchainMapping> {
  const mapping: BlockchainMapping = {};
  console.log("Loading token mapping from:", filePath);

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        const { blockchain, address, symbol, decimals } = row;
        const chainId = DuneNetworkMap[blockchain];
        // Ensure blockchain key exists in the mapping
        if (!mapping[chainId]) {
          mapping[chainId] = {};
        }

        // Map symbol to address and decimals
        mapping[chainId][symbol] = {
          address,
          decimals: parseInt(decimals, 10),
        };
      })
      .on("end", () => {
        console.log("CSV file successfully processed");
        resolve(mapping);
      })
      .on("error", (error: unknown) => {
        console.error("Error reading the CSV file:", error);
        reject(error);
      });
  });
}

// type DuneNetwork = "ethereum" | "gnosis" | "arbitrum";
let tokenMap: BlockchainMapping;

// Initialize tokenMap when module is loaded
const initializeTokenMap = async () => {
  const filePath = path.join(process.cwd(), "public", "tokenlist.csv");
  tokenMap = await loadTokenMapping(filePath);
};

// Start loading immediately
const tokenMapPromise = initializeTokenMap();

export async function getTokenDetails(
  chainId: number,
  symbolOrAddress: string,
): Promise<TokenInfo> {
  if (isAddress(symbolOrAddress)) {
    return {
      address: symbolOrAddress as Address,
      decimals: await getTokenDecimals(chainId, symbolOrAddress),
    };
  }
  console.log("Seeking TokenMap for Symbol -> Address conversion");
  if (!tokenMap) {
    await tokenMapPromise;
  }
  return tokenMap[chainId][symbolOrAddress];
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
