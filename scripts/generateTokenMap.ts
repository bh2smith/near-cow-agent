import { BlockchainMapping } from "@/src/app/api/tools/cowswap/util/tokens";
import csv from "csv-parser";
import * as fs from "fs";
import path from "path";

async function generateTokenMapJson() {
  const filePath = path.join(process.cwd(), "public", "tokenlist.csv");
  const tokenMap = await loadTokenMapping(filePath);
  const outputFile = path.join(process.cwd(), "public", "tokenMap.json");

  fs.writeFileSync(outputFile, JSON.stringify(tokenMap, null, 2));
  console.log("Token map JSON generated at:", outputFile);
}

generateTokenMapJson().catch(console.error);

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
