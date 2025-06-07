import type { OrderBookApi } from "@cowprotocol/cow-sdk";
import type { Hex } from "viem";
import { keccak256, toBytes } from "viem";
import stringify from "json-stringify-deterministic";
import type { v0_11_0 } from "@cowprotocol/app-data";
interface AppData {
  hash: Hex;
  data: string;
}

export async function generateAppData(
  appCode: string,
  referrerAddress: string,
  partnerFee: {
    bps: number;
    recipient: string;
  },
  hooks: v0_11_0.OrderInteractionHooks,
): Promise<AppData> {
  const appDataDoc = stringify({
    appCode,
    metadata: { referrer: { address: referrerAddress }, partnerFee, hooks },
    version: "1.3.0",
  });
  const appDataHash = keccak256(toBytes(appDataDoc));
  console.log(`Constructed AppData with Hash ${appDataHash}`);
  return {
    data: appDataDoc,
    hash: appDataHash,
  };
}

export async function buildAndPostAppData(
  orderbook: OrderBookApi,
  appCode: string,
  referrerAddress: string,
  partnerFee: {
    bps: number;
    recipient: string;
  },
  hooks: v0_11_0.OrderInteractionHooks,
): Promise<Hex> {
  const appData = await generateAppData(
    appCode,
    referrerAddress,
    partnerFee,
    hooks,
  );
  const exists = await appDataExists(orderbook, appData);
  if (!exists) {
    await orderbook.uploadAppData(appData.hash, appData.data);
  }
  return appData.hash;
}

export async function appDataExists(
  orderbook: OrderBookApi,
  appData: AppData,
): Promise<boolean> {
  const exists = await orderbook
    .getAppData(appData.hash)
    .then(() => {
      // If successful, `data` will be the resolved value from `getAppData`.
      return true;
    })
    .catch(() => {
      return false; // Or any default value to indicate the data does not exist
    });
  return exists;
}
