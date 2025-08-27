import { getPriceAndIcon, parseWidgetData } from "@/src/lib/ui";
import { getTokenDetails } from "@bitte-ai/agent-sdk";
import { TokenInfo } from "@bitte-ai/types";
import { OrderKind, OrderParameters } from "@cowprotocol/cow-sdk";
import { getAddress } from "viem";

const GNOSIS_GNO = getAddress("0x9c58bacc331c9aa871afd802db6379a98e80cedb");
const GNOSIS_COW = getAddress("0x177127622c4a00f3d409b75571e12cb3c8973d3c");

const chainId = 100;
const tokenDataFixture = {
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
    let data = await getPriceAndIcon({ chainId, ...tokenDataFixture.sell });
    console.log(data);

    data = await getPriceAndIcon({ chainId, ...tokenDataFixture.buy });
    console.log(data);
  });

  it("parseSwapData", async () => {
    const tokenData = {
      buy: await getTokenDetails(chainId, GNOSIS_COW),
      sell: await getTokenDetails(chainId, GNOSIS_GNO),
    };
    const quote: OrderParameters = {
      sellToken: tokenData.sell!.address,
      buyToken: tokenData.buy!.address,
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
      feeAmount: "1234",
      tokenData,
      quote,
    });
    console.log(JSON.stringify(swapData, null, 2));
  });
});
