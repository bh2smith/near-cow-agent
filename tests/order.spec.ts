import { createOrder } from "@/src/app/api/tools/order/create";

describe("Order Route Logic", () => {
  it("should validate a real request", async () => {
    const requestBody = {
      kind: "sell",
      appData:
        "0x5a8bb9f6dd0c7f1b4730d9c5a811c2dfe559e67ce9b5ed6965b05e59b8c86b80",
      chainId: 100,
      validTo: 1751539318,
      buyToken: "0x177127622c4a00f3d409b75571e12cb3c8973d3c",
      receiver: "0xB00b4C1e371DEe4F6F32072641430656D3F7c064",
      buyAmount: "44140355230224502538",
      feeAmount: "465679",
      sellToken: "0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1",
      signature:
        "0x49c1f71a855d203456cfdcdd67b076f7a37d195d2ffd156a3cda6dedb961204d75a73a28df1152e0b4fd533210f738371a1d2fd2ee86044364388f2ffae534311c",
      evmAddress: "0xB00b4C1e371DEe4F6F32072641430656D3F7c064",
      sellAmount: "4999999999534321",
      signingScheme: "eip712",
      partiallyFillable: false,
    };
    const res = await createOrder(requestBody);
    console.log(res);
    // expect(res).toBeDefined();
    // expect(res.orderUrl).toBeDefined();
    // expect(res.orderUrl).toContain("https://cowswap.io/");
  });

  // domain: OrderSigningUtils.getDomain(parsedRequest.chainId),
});
