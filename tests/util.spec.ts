import { NextRequest } from "next/server";
import { getTokenMap, validateNextRequest } from "@/src/app/api/tools/util";
import { zeroAddress } from "viem";
import { OrderSigningUtils } from "@cowprotocol/cow-sdk";
import { getTokenDetails, loadTokenMap } from "@bitte-ai/agent-sdk";

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
    const tokenMap = await loadTokenMap(
      "https://raw.githubusercontent.com/BitteProtocol/core/refs/heads/main/public/tokenMap.json",
    );
    const tokenData = await getTokenDetails(100, "XDAI", tokenMap);
    console.log(tokenData);
    expect(tokenData).toEqual({
      address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      decimals: 18,
      symbol: "xDAI",
    });
  });
});
