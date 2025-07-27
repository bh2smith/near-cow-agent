import { externalPriceFeed } from "@/src/lib/external";

describe.skip("x402 External Price Feed", () => {
  it("externalPriceFeed", async () => {
    const chainId = 8453;
    // 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913 USDC
    const priceWETH = await externalPriceFeed({
      chainId,
      address: "0x4200000000000000000000000000000000000006",
    });
    expect(priceWETH).toBeGreaterThan(3000);
  }, 10000);
});
