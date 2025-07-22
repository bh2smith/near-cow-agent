import { loadTokenMap, type BlockchainMapping } from "@bitte-ai/agent-sdk";
import { unstable_cache } from "next/cache";
import { DEPLOYMENT_URL } from "vercel-url";

const ACCOUNT_ID = process.env.ACCOUNT_ID;

// Set the plugin url in order of BITTE_CONFIG, env, DEPLOYMENT_URL (used for Vercel deployments)
const PLUGIN_URL =
  DEPLOYMENT_URL ||
  `${process.env.NEXT_PUBLIC_HOST || "localhost"}:${process.env.PORT || 3000}`;

if (!PLUGIN_URL) {
  console.error(
    "!!! Plugin URL not found in env, BITTE_CONFIG or DEPLOYMENT_URL !!!",
  );
  process.exit(1);
}

const COW_SUPPORTED_CHAINS = [1, 100, 137, 8453, 42161, 43114, 11155111];

export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value) {
    if (defaultValue) {
      return defaultValue;
    }
    throw new Error(`${key} is not set`);
  }
  return value;
}

export function getZerionKey(): string {
  return getEnvVar("ZERION_KEY");
}

export function getAlchemyKey(): string | undefined {
  return getEnvVar("ALCHEMY_API_KEY");
}

export async function getTokenMap(): Promise<BlockchainMapping> {
  const getCachedTokenMap = unstable_cache(
    async () => {
      console.log("Loading TokenMap...");
      return loadTokenMap(COW_SUPPORTED_CHAINS);
    },
    ["token-map"], // cache key
    {
      revalidate: 86400, // revalidate 24 hours
      tags: ["token-map"],
    },
  );

  return getCachedTokenMap();
}

export { ACCOUNT_ID, PLUGIN_URL, COW_SUPPORTED_CHAINS };
