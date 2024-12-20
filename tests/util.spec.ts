import { NextRequest } from "next/server";
import { validateNextRequest } from "@/src/app/api/tools/util";
import { zeroAddress } from "viem";

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
});
