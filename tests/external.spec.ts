import { externalPriceFeed } from "@/src/lib/external";

describe("External Price Feed", () => {
  it("should validate a real request", async () => {
    const res = await externalPriceFeed({
      chainId: 100,
      address: "0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1",
    });
    console.log(res);
  });
});
