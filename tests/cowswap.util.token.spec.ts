import { getTokenDetails } from "@/src/app/api/tools/cowswap/util/tokens";
import { zeroAddress } from "viem";

describe.skip("getTokenDetails", () => {
  it("should fail to get token details for zero address", async () => {
    await expect(getTokenDetails(100, zeroAddress)).rejects.toThrow(); // or .rejects.toThrow("specific error message") if you want to check the message
  });

  it("should return the token details for a given symbol", async () => {
    const tokenDetails = await getTokenDetails(
      100,
      "0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb",
    );
    expect(tokenDetails).toBeDefined();
  });
});
