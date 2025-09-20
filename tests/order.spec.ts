import { createOrder } from "@/src/lib/protocol/order";
import { getClient } from "@/src/lib/rpc";
import { OrderRequestBody } from "@/src/lib/types";
import { OrderSigningUtils, setGlobalAdapter } from "@cowprotocol/cow-sdk";
import { OrderKind, SigningScheme } from "@cowprotocol/sdk-order-book";
import { ViemAdapter } from "@cowprotocol/sdk-viem-adapter";

describe("Order Route Logic", () => {
  it.skip("should validate a real request", async () => {
    const requestBody: OrderRequestBody = {
      kind: OrderKind.SELL,
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
      signingScheme: SigningScheme.EIP712,
      partiallyFillable: false,
    };
    const res = await createOrder(requestBody);
    console.log(res);
  });

  it("Get OrderUid", async () => {
    const order = {
      sellToken: "0xe485e2f1bab389c08721b291f6b59780fec83fd7",
      buyToken: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      receiver: "0xb00b4c1e371dee4f6f32072641430656d3f7c064",
      sellAmount: "5000000000000000000000",
      buyAmount: "19198960",
      validTo: 1758357817,
      appData:
        "0x5a8bb9f6dd0c7f1b4730d9c5a811c2dfe559e67ce9b5ed6965b05e59b8c86b80",
      feeAmount: "0",
      kind: OrderKind.SELL,
      partiallyFillable: false,
      signingScheme: SigningScheme.EIP712,
    };

    const cowSdkAdapter = new ViemAdapter({
      provider: getClient(1),
    });
    setGlobalAdapter(cowSdkAdapter);

    const orderId = await OrderSigningUtils.generateOrderId(1, order, {
      owner: "0x00000362b4fc1ad6D48a381a19092806019614E1",
    });
    console.log("OrderId", orderId);
  });
});
