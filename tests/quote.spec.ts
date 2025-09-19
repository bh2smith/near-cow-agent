import { handleQuoteRequest } from "@/src/app/api/tools/quote/logic";
import { withRedactedErrorHandling } from "@/src/lib/error";
import { ParsedQuoteRequest } from "@/src/lib/types";
import { OrderQuoteRequest } from "@cowprotocol/sdk-order-book";

const MAX_VALID_FROM = 10800; // 3 hours
describe.skip("Quote Route Logic", () => {
  it("should transform parsedQuoteRequest into Full Quote", async () => {
    const quoteRequest = {
      sellToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // ETH
      buyToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      sellAmountBeforeFee: "100000000000000",
      kind: "sell",
      receiver: "0xB00b4C1e371DEe4F6F32072641430656D3F7c064",
      from: "0xB00b4C1e371DEe4F6F32072641430656D3F7c064",
      signingScheme: "eip712",
      validFor: MAX_VALID_FROM + 1,
    } as OrderQuoteRequest;

    const tokenData = {
      sell: {
        address: quoteRequest.sellToken,
        decimals: 18,
        symbol: "ETH",
        name: "Ether",
      },
      buy: {
        address: quoteRequest.buyToken,
        decimals: 6,
        symbol: "USDC",
        name: "Circles USD",
      },
    };
    const input = {
      chainId: 8453,
      quoteRequest,
      tokenData,
      slippageBps: 100,
    } as ParsedQuoteRequest;
    // const quote = await handleQuoteRequest(input);
    // console.log(JSON.stringify(quote.meta.quote, null, 2));
    await expect(
      withRedactedErrorHandling(handleQuoteRequest(input)),
    ).rejects.toThrow("ExcessiveValidTo: validTo is too far into the future");
  }, 10000);
});
