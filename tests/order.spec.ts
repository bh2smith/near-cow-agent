import { buildAppData } from "@/src/lib/protocol/appData";
import { createOrder } from "@/src/lib/protocol/order";
import { OrderRequestBody } from "@/src/lib/types";
import { OrderKind, SigningScheme } from "@cowprotocol/cow-sdk";
import { keccak256, toBytes } from "viem";

describe.skip("Order Route Logic", () => {
  // This is a real request, it creates an unsigned order.
  it("should validate a real request", async () => {
    const { appDataContent } = await buildAppData(100);
    const timestampSeconds = Math.floor(Date.now() / 1000);
    const requestBody: OrderRequestBody = {
      kind: OrderKind.SELL,
      appData: appDataContent,
      chainId: 100,
      validTo: timestampSeconds + 1000,
      buyToken: "0x177127622c4a00f3d409b75571e12cb3c8973d3c",
      receiver: "0xB00b4C1e371DEe4F6F32072641430656D3F7c064",
      sellAmount: (BigInt("4999999999534321") + BigInt("465679")).toString(),
      buyAmount: "44140355230224502538",
      feeAmount: "0",
      sellToken: "0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1",
      signature: "0x",
      evmAddress: "0xB00b4C1e371DEe4F6F32072641430656D3F7c064",
      signingScheme: SigningScheme.PRESIGN,
      partiallyFillable: false,
    };
    const res = await createOrder(requestBody);
    console.log(res);
  });
});
