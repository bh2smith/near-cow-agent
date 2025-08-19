import { handleOrderStatusRequest } from "@/src/app/api/tools/status/logic";

const nonExistentOrder =
  "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
const filledOrder =
  "0xf944f0de097e6c3724ebbd4e18881df348ca6e8fc388b322e76b5aa139a819fcb00b4c1e371dee4f6f32072641430656d3f7c0646884e57b";
const cancelledOrder =
  "0xe46e8c19e371fbcc3797898796292cba68eb8cc27ca32d35305e0087d8d9c46ab00b4c1e371dee4f6f32072641430656d3f7c0646899c71e";
const expiredOrder =
  "0xe78df3254b7b8162f4b025a41f8fa67573575857b0e8c59688f9888342f074f6b00b4c1e371dee4f6f32072641430656d3f7c0646899c054";

// Uncomment to test (makes requests to CoW Orderbook API)
describe.skip("Order Status Route", () => {
  it("Throws on not Found", async () => {
    await expect(
      handleOrderStatusRequest({
        chainId: 1,
        orderUid: nonExistentOrder,
      }),
    ).rejects.toThrow("NotFound: Order was not found");
  });
  it("Retrieves Filled/Traded Order Status", async () => {
    const res = await handleOrderStatusRequest({
      chainId: 1,
      orderUid: filledOrder,
    });
    expect(res).toStrictEqual({
      order: "fulfilled",
      competition: {
        type: "traded",
        value: [
          {
            solver: "quasilabs",
            executedAmounts: {
              sell: "25464867331308488",
              buy: "95075261",
            },
          },
          {
            solver: "quasilabs",
            executedAmounts: null,
          },
          {
            solver: "quasilabs",
            executedAmounts: null,
          },
          {
            solver: "barter",
            executedAmounts: {
              sell: "25464867331308488",
              buy: "95155864",
            },
          },
        ],
      },
    });
  });

  it("Retrieves cancelled Order Status", async () => {
    const res = await handleOrderStatusRequest({
      chainId: 1,
      orderUid: cancelledOrder,
    });
    expect(res).toStrictEqual({
      order: "cancelled",
      competition: {
        type: "cancelled",
      },
    });
  });
  it("Retrieves expired Order Status", async () => {
    const res = await handleOrderStatusRequest({
      chainId: 1,
      orderUid: expiredOrder,
    });
    expect(res).toStrictEqual({
      order: "expired",
      competition: {
        type: "active",
      },
    });
  });
});
