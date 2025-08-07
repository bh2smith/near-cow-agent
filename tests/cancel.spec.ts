import { handleCancellationRequest } from "@/src/app/api/tools/cancel/logic";

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

  // domain: OrderSigningUtils.getDomain(parsedRequest.chainId),
});
