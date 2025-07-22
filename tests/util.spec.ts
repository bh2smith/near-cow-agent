import { OrderSigningUtils } from "@cowprotocol/cow-sdk";
import { getTokenDetails, loadTokenMap } from "@bitte-ai/agent-sdk";
import { COW_SUPPORTED_CHAINS } from "@/src/app/config";

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
