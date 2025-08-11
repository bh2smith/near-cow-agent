import {
  buildAppData as buildAppDataSdk,
  OrderClass,
} from "@cowprotocol/cow-sdk";
import { buildAppData as buildAppDataAppData } from "@/src/lib/protocol/appData";
import { keccak256, toBytes } from "viem";
describe("AppData Construction", () => {
  it("uses sdk to build AppData", async () => {
    // TODO: This is not updated enough to use.
    const params = {
      slippageBps: 100,
      appCode: "bitte.ai/CowAgent",
      orderClass: OrderClass.MARKET,
      partnerFee: {
        surplusBps: 25,
        volumeBps: 25,
        recipient: "0xB00b4C1e371DEe4F6F32072641430656D3F7c064",
      },
    };
    const { fullAppData } = await buildAppDataSdk(params);
    console.log("SDK", fullAppData);
  });

  it("builds AppData using our own library", async () => {
    const { appDataContent, appDataHex } = await buildAppDataAppData(100);
    expect(keccak256(toBytes(appDataContent))).toEqual(appDataHex);
  });
});
