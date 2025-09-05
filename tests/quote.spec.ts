import { handleQuoteRequest } from "@/src/app/api/tools/quote/logic";
import { withRedactedErrorHandling } from "@/src/lib/error";
import { isEOA } from "@/src/lib/protocol/quote";
import { EthRpc, ParsedQuoteRequest } from "@/src/lib/types";
import { getClientForChain } from "@bitte-ai/agent-sdk";
import { OrderQuoteRequest } from "@cowprotocol/cow-sdk";
const MAX_VALID_FROM = 10800; // 3 hours
describe("Quote Route Logic", () => {
  it.skip("should transform parsedQuoteRequest into Full Quote", async () => {
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

  it.only("should transform parsedQuoteRequest into Full Quote", async () => {
    const client = getClientForChain(8453) as EthRpc;
    expect(
      await isEOA(client, "0x66268791B55e1F5fA585D990326519F101407257"),
    ).toBe(true);
  });
});
