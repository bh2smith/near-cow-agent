import { type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment } from "x402-fetch";

import { getEnvVar } from "../app/config";
interface TokenQuery {
  chainId: number;
  address: string;
}

// const priceAgentFree = "https://price-agent.vercel.app/api/tools/prices";
const priceAgentUrl =
  "https://price-agent-git-x402-maxnormal.vercel.app/api/tools/prices";

export async function externalPriceFeed({
  chainId,
  address,
}: TokenQuery): Promise<number | null> {
  const account = privateKeyToAccount(getEnvVar("PRIVATE_KEY") as Hex);
  console.log(
    `Paying for price quote ${chainId}:${address} with ${account.address}`,
  );
  const fetchWithPayment = wrapFetchWithPayment(fetch, account);
  const url = `${priceAgentUrl}?chainId=${chainId}&address=${address}`;
  try {
    const response = await fetchWithPayment(url, {});

    if (!response.ok) {
      console.error(
        `API call failed: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = (await response.json()) as {
      price: number;
      source: string;
    } | null;
    // Assuming the API returns a number directly
    return data?.price || null;
  } catch (error) {
    console.error("Error calling price API:", error);
    return null;
  }
}
