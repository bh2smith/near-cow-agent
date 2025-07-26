import { type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment } from "x402-fetch";
interface TokenQuery {
  chainId: number;
  address: string;
}

const privateKey = process.env.PRIVATE_KEY as Hex;

if (!privateKey) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const fetchWithPayment = wrapFetchWithPayment(
  fetch,
  privateKeyToAccount(privateKey),
);
// const priceAgentFree = "https://price-agent.vercel.app/api/tools/prices";
const priceAgentUrl =
  "https://price-agent-git-x402-maxnormal.vercel.app/api/tools/prices";

export async function externalPriceFeed(
  query: TokenQuery,
): Promise<number | null> {
  const url = `${priceAgentUrl}?chainId=${query.chainId}&address=${query.address}`;
  console.log("URL", url);
  try {
    const response = await fetchWithPayment(url);

    if (!response.ok) {
      console.error(
        `API call failed: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const { price } = await response.json();

    // Assuming the API returns a number directly
    return typeof price === "number" ? price : null;
  } catch (error) {
    console.error("Error calling price API:", error);
    return null;
  }
}
