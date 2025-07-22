import { getPriceAndIcon } from "@/src/lib/ui";


describe("getPriceAndIcon", () => {
  it("known tokens", async () => {
    let data = await getPriceAndIcon({chainId: 100, address: "0x177127622c4a00f3d409b75571e12cb3c8973d3c"});
    console.log(data);

    data = await getPriceAndIcon({chainId: 100, address: "0x38fb649ad3d6ba1113be5f57b927053e97fc5bf7"});
    console.log(data);
  });
});
