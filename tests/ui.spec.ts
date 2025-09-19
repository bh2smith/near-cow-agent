import { getPriceAndIcon, parseWidgetData } from "@/src/lib/ui";
import { OrderKind, OrderParameters } from "@cowprotocol/sdk-order-book";
import { getAddress } from "viem";

const GNOSIS_GNO = getAddress("0x9c58bacc331c9aa871afd802db6379a98e80cedb");
const GNOSIS_COW = getAddress("0x177127622c4a00f3d409b75571e12cb3c8973d3c");

const chainId = 100;
const tokenData = {
  sell: {
    address: GNOSIS_GNO,
    decimals: 18,
    symbol: "GNO",
    name: "Gnosis Token",
  },
  buy: {
    address: GNOSIS_COW,
    decimals: 6,
    symbol: "COW",
    name: "CoW Protocol Token",
  },
};

describe("getPriceAndIcon", () => {
  it.skip("known tokens", async () => {
    let data = await getPriceAndIcon({ chainId, ...tokenData.sell });
    console.log(data);

    data = await getPriceAndIcon({ chainId, ...tokenData.buy });
    console.log(data);
  });

  it.skip("parseSwapData", async () => {
    const quote: OrderParameters = {
      sellToken: tokenData.sell.address,
      buyToken: tokenData.buy.address,
      sellAmount: "123456789101112131415161718192345",
      buyAmount: "9876543234567",
      validTo: 0,
      appData: "",
      feeAmount: "123",
      kind: OrderKind.BUY,
      partiallyFillable: false,
    };
    const swapData = await parseWidgetData({
      chainId: 100,
      feeAmount: "123",
      tokenData,
      quote,
    });
    console.log(JSON.stringify(swapData, null, 2));
    // expect(swapData).toStrictEqual({
    //   network: {
    //     name: "Gnosis",
    //     icon: "https://storage.googleapis.com/bitte-public/intents/chains/gnosis.svg",
    //   },
    //   type: "swap",
    //   fee: "123",
    //   tokenIn: {
    //     contractAddress: tokenData.sell.address,
    //     amount: "123456789101112.131415161718192345",
    //     usdValue: 0,
    //     icon: "https://cdn.zerion.io/0x6810e776880c02933d47db1b9fc05908e5386b96.png",
    //     ...tokenData.sell,
    //   },
    //   tokenOut: {
    //     contractAddress: tokenData.buy.address,
    //     amount: "9876543.234567",
    //     icon: "https://cdn.zerion.io/0xdef1ca1fb7fbcdc777520aa7f396b4e015f497ab.png",
    //     usdValue: 0,
    //     ...tokenData.buy,
    //   },
    // });
  });
});
