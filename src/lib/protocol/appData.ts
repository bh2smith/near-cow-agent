import { MetadataApi } from "@cowprotocol/app-data";

import type { AppDataInfo } from "@cowprotocol/app-data";

const metadataApi = new MetadataApi();

export async function buildAppData(slippageBips: number): Promise<AppDataInfo> {
  const appCode = "bitte.ai/CowAgent";
  const referralAddress = "0x54F08c27e75BeA0cdDdb8aA9D69FD61551B19BbA";
  const partnerAddress = "0xB00b4C1e371DEe4F6F32072641430656D3F7c064";
  const partnerBps = 25;

  const appDataDoc = await metadataApi.generateAppDataDoc({
    metadata: {
      referrer: {
        address: referralAddress,
      },
      quote: {
        slippageBips,
      },
      orderClass: {
        orderClass: "market",
      },
      partnerFee: [
        {
          surplusBps: partnerBps,
          maxVolumeBps: partnerBps,
          recipient: partnerAddress,
        },
      ],
      utm: {
        utmSource: "bitte.ai/CowAgent",
        utmMedium: "cow",
        utmCampaign: "bitte.ai",
        utmContent: "bitte.ai",
        utmTerm: "nextJS",
      },
      widget: {
        appCode,
      },
    },
  });

  await metadataApi.validateAppDataDoc(appDataDoc);
  return metadataApi.getAppDataInfo(appDataDoc);
}
