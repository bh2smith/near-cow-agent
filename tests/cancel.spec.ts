import {
  buildCancelOrderData,
  handleCancellationRequest,
} from "@/src/app/api/tools/cancel/logic";
import { OrderBookApi } from "@cowprotocol/cow-sdk";
import { getAddress, recoverTypedDataAddress } from "viem";

const mainnetOrder =
  "0xf944f0de097e6c3724ebbd4e18881df348ca6e8fc388b322e76b5aa139a819fcb00b4c1e371dee4f6f32072641430656d3f7c0646884e57b";
const nonExistentOrder =
  "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

describe("Order Cancellation Route", () => {
  it("Should handle Order Cancellation paths", async () => {
    await expect(
      handleCancellationRequest({ chainId: 1, orderUid: mainnetOrder }),
    ).resolves;
    await expect(
      handleCancellationRequest({
        chainId: 11155111,
        orderUid: nonExistentOrder,
      }),
    ).rejects.toThrow("NotFound: Order was not found");
  });

  it("Real Order from Chat", async () => {
    const chainId = 1;
    const orderUid =
      "0xe46e8c19e371fbcc3797898796292cba68eb8cc27ca32d35305e0087d8d9c46ab00b4c1e371dee4f6f32072641430656d3f7c0646899c71e";
    const signature =
      "0x895934d2b2d72b4592192644d8638ef0802411694799f2ddcbda0620dff164a31dd6cad552bf07bc34b49e2a7f83f8fe11458f33d51f43712c87d1380bf315b41b";
    const orderBookApi = new OrderBookApi({ chainId });

    const typedData = await buildCancelOrderData(orderBookApi, orderUid);
    console.log(typedData.params[1]);
    const recoveredAddress = await recoverTypedDataAddress({
      ...JSON.parse(typedData.params[1] as string),
      signature,
    });
    expect(recoveredAddress).toBe(typedData.params[0]);

    await expect(
      handleCancellationRequest({
        chainId,
        orderUid,
        signature,
      }),
    ).rejects.toThrow("AlreadyCancelled: Order is already cancelled");
  });
});
