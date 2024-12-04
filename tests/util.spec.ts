import { NextRequest } from "next/server";
import {
  getSafeSaltNonce,
  validateNextRequest,
} from "@/src/app/api/tools/util";
import { zeroAddress } from "viem";

describe("validateRequest", () => {
  it("should validate a real request", async () => {
    // Arrange
    const headers = new Headers({
      "mb-metadata": JSON.stringify({
        accountId: "max-normal.near",
        evmAddress: zeroAddress,
      }),
    });

    const request = new NextRequest(
      new Request("https://example.com", {
        method: "POST",
        headers,
        body: JSON.stringify({ test: "data" }),
      }),
    );

    // Act
    const result = await validateNextRequest(request, getSafeSaltNonce());
    console.log(JSON.stringify(result, null, 2));
    // Assert
    expect(result).not.toBeNull();
  });
});
