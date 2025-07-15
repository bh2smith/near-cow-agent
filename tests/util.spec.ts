import { NextRequest } from "next/server";
import { validateNextRequest } from "@/src/app/api/tools/util";
import { zeroAddress } from "viem";
import { OrderSigningUtils } from "@cowprotocol/cow-sdk";
import { getTokenDetails, loadTokenMap } from "@bitte-ai/agent-sdk";
import { COW_SUPPORTED_CHAINS } from "@/src/app/config";

describe("validateRequest", () => {
  it("should validate a real request", async () => {
    const request = new NextRequest(
      new Request("https://example.com", {
        method: "POST",
        headers: new Headers({
          "mb-metadata": JSON.stringify({
            accountId: "max-normal.near",
            evmAddress: zeroAddress,
          }),
        }),
        body: JSON.stringify({ test: "data" }),
      }),
    );

    // Act
    const result = await validateNextRequest(request);
    // Assert
    expect(result).toBeNull();
  });

  // domain: OrderSigningUtils.getDomain(parsedRequest.chainId),
});

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
