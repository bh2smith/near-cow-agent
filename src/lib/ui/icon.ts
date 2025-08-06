// https://dd.dexscreener.com/ds-data/tokens/ethereum/0xe485e2f1bab389c08721b291f6b59780fec83fd7.png

import { isNativeAsset } from "../protocol/util";

import type { TokenQuery } from "./types";

const bitteBucket = "https://storage.googleapis.com/bitte-public";
const tokensUrl = `${bitteBucket}/intents/tokens`;
const chainsUrl = `${bitteBucket}/intents/chains`;

export const NATIVE_ASSET_ICONS: Record<number, string> = {
  1: `${tokensUrl}/eth_token.svg`,
  100: `${tokensUrl}/xdai_token.svg`,
  137: `${chainsUrl}/polygon.svg`, // TODO: GET TOKEN.
  8453: `${tokensUrl}/eth_token.svg`,
  42161: `${tokensUrl}/eth_token.svg`,
  43114: `${chainsUrl}/avax.svg`, // TODO: GET TOKEN.
  11155111: `${tokensUrl}/eth_token.svg`,
};

export const CHAIN_ICONS: Record<number, string> = {
  1: `${chainsUrl}/eth.svg`,
  100: `${chainsUrl}/gnosis.svg`,
  137: `${chainsUrl}/polygon.svg`,
  8453: `${chainsUrl}/base.svg`,
  42161: `${chainsUrl}/arbi.svg`,
  43114: `${chainsUrl}/avax.svg`,
  11155111: `${chainsUrl}/eth.svg`,
};

export interface IconFeed {
  name: string;
  getIcon(token: TokenQuery): Promise<string | undefined>;
}

// TODO: This is a shitty unreliable source.
export class DexScreenerIcons implements IconFeed {
  name = "DexScreener";
  bucketUrl = "https://dd.dexscreener.com/ds-data/tokens";
  async getIcon({ address, chainId }: TokenQuery): Promise<string | undefined> {
    if (isNativeAsset(address)) {
      return NATIVE_ASSET_ICONS[chainId];
    }
    const fullUrl = `${this.bucketUrl}/${chainId}/${address}.png`;
    // Check it URL resolves.
    const res = await fetch(fullUrl);
    if (res.ok) {
      return fullUrl;
    }
    return undefined;
  }
}

export class IconArchive implements IconFeed {
  name = "Archive";
  bucketUrl = "https://storage.googleapis.com/bitte-public/tokens";

  async getIcon({ address, chainId }: TokenQuery): Promise<string | undefined> {
    if (isNativeAsset(address)) {
      return NATIVE_ASSET_ICONS[chainId];
    }
    const fullUrl = `${this.bucketUrl}/${chainId}/${address}.png`;
    // Check it URL resolves.
    const res = await fetch(fullUrl);
    if (res.ok) {
      return fullUrl;
    }
    return undefined;
  }
}

export class CowIcons implements IconFeed {
  name = "CoW Feed";
  bucketUrl =
    "https://raw.githubusercontent.com/cowprotocol/token-lists/main/src/public/images";
  async getIcon({ address, chainId }: TokenQuery): Promise<string | undefined> {
    if (isNativeAsset(address)) {
      return NATIVE_ASSET_ICONS[chainId];
    }
    const fullUrl = `${this.bucketUrl}/${chainId}/${address}/logo.png`;
    // Check it URL resolves.
    const res = await fetch(fullUrl);
    if (res.ok) {
      return fullUrl;
    }
    return undefined;
  }
}

const archive = new IconArchive();
const cow = new CowIcons();
const screener = new DexScreenerIcons();

export async function getIcon(args: TokenQuery): Promise<string | undefined> {
  const iconFeeds = [cow, archive, screener];
  const results = await Promise.all(iconFeeds.map((f) => f.getIcon(args)));
  return results.find((icon): icon is string => icon !== undefined);
}
