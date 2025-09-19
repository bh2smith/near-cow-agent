import { OrderSigningUtils } from "@cowprotocol/sdk-order-signing";
import {
  getClientForChain,
  getTokenDetails,
  loadTokenMap,
} from "@bitte-ai/agent-sdk/evm";
import { COW_SUPPORTED_CHAINS } from "@/src/app/config";
import { isEOA } from "@/src/lib/protocol/util";
import { zeroAddress } from "viem";
import { EthRpc } from "@/src/lib/types";

describe("CoW Domain", () => {
  it("should get the domain", async () => {
    // This is ASYNC!
    const domain = await OrderSigningUtils.getDomain(100);
    console.log(domain);
    expect(domain).toEqual({
      name: "Gnosis Protocol",
      version: "v2",
      chainId: 100,
      verifyingContract: "0x9008D19f58AAbD9eD0D60971565AA8510560ab41",
    });
  });

  it("getTokenDetails (xDAI) Gnosis", async () => {
    const chainId = 100;
    const tokenMap = await loadTokenMap(COW_SUPPORTED_CHAINS);
    const tokenData = await getTokenDetails(chainId, "XDAI", tokenMap);
    console.log(tokenData);
    expect(tokenData).toEqual({
      address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      decimals: 18,
      symbol: "xDAI",
    });
  });
});

describe("isEOA", () => {
  it("returns true for known EOAs", async () => {
    const client = getClientForChain(8453) as EthRpc;
    const eip7702User = "0x66268791B55e1F5fA585D990326519F101407257";
    expect(await isEOA(client, eip7702User)).toBe(true);

    expect(await isEOA(client, zeroAddress)).toBe(true);
  });

  it("returns false for known contracts", async () => {
    const client = getClientForChain(8453) as EthRpc;
    expect(
      await isEOA(client, "0x4200000000000000000000000000000000000006"),
    ).toBe(false);
  });
});
