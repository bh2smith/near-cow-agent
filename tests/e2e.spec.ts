import { handleCancellationRequest } from "@/src/app/api/tools/cancel/logic";
import { handleQuoteRequest } from "@/src/app/api/tools/quote/logic";
import { withCowErrorHandling } from "@/src/lib/error";
import { createOrder } from "@/src/lib/protocol/order";
import { OrderRequestBody, ParsedQuoteRequest } from "@/src/lib/types";
import { OrderQuoteRequest } from "@cowprotocol/cow-sdk";
import {
  createWalletClient,
  http,
  parseEther,
  recoverTypedDataAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const tokenData = {
  sell: {
    address: "0xe485E2f1bab389C08721B291f6b59780feC83Fd7",
    decimals: 18,
    symbol: "SHU",
    name: "Shutter",
  },
  buy: {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    symbol: "USDC",
    name: "Circles USD",
  },
};
const chainId = 1;

describe("End To End", () => {
  /**
   * This test goes through the full flow (utilizing all primary paths of each agent tool)
   * 1. Quote Tool: get quote and return signable payload
   * 3. Order Tool: post signed order
   * 4. Cancellation Tool: build signable payload
   * 5. Cancellation Tool: post signed cancellation
   */
  it.skip("Quote to Order", async () => {
    const slippageBps = 1; // So the order will not get filled before we can cancel
    const wallet = createWalletClient({
      transport: http(),
      chain: mainnet,
      account: privateKeyToAccount(process.env.PRIVATE_KEY! as `0x${string}`),
    });
    console.log("Account", wallet.account.address);
    const quoteRequest = {
      sellToken: tokenData.sell.address,
      buyToken: tokenData.buy.address,
      sellAmountBeforeFee: parseEther("5000").toString(),
      kind: "sell",
      receiver: wallet.account.address,
      from: wallet.account.address,
      signingScheme: "eip712",
    } as OrderQuoteRequest;

    const input = {
      chainId,
      quoteRequest,
      tokenData,
      slippageBps,
    } as ParsedQuoteRequest;
    const {
      transaction,
      meta: { quote },
    } = await handleQuoteRequest(input);
    console.log("Order to Sign", transaction);
    const typedDataString = transaction[0].params[1] as string;
    const typedData = JSON.parse(typedDataString);
    const signature = await wallet.signTypedData(typedData);
    const recoveredAddress = await recoverTypedDataAddress({
      ...typedData,
      signature,
    });
    expect(recoveredAddress).toBe(wallet.account.address);
    const orderRequest = {
      ...quote.quote,
      signature,
      chainId,
      // receiver: wallet.account.address,
      // evmAddress: wallet.account.address,
    } as OrderRequestBody;
    const order = await createOrder(orderRequest);
    console.log("Order", order);
    const orderUid = order.orderUid!;
    const result = await handleCancellationRequest({
      chainId,
      orderUid,
    });
    if (result) {
      const cancellationSignature = await wallet.signTypedData(
        JSON.parse(result.params[1] as string),
      );
      handleCancellationRequest({
        chainId,
        orderUid,
        signature: cancellationSignature,
      });
    }
  }, 10000);

  it("Quote to Order", async () => {
    const order = {
      orderUrl:
        "https://explorer.cow.fi/orders/0xeaa2608341c2263962070fbebd56bee368d399960265d4e34e217108c56b2190b00b4c1e371dee4f6f32072641430656d3f7c06468962347",
      orderUid:
        "0xeaa2608341c2263962070fbebd56bee368d399960265d4e34e217108c56b2190b00b4c1e371dee4f6f32072641430656d3f7c06468962347",
    };
    // Call without signature produces signRequest:
    const result = await handleCancellationRequest({
      chainId,
      orderUid: order.orderUid,
    });

    if (result) {
      await expect(
        withCowErrorHandling(
          handleCancellationRequest({
            chainId,
            orderUid:
              "0xeaa2608341c2263962070fbebd56bee368d399960265d4e34e217108c56b2190b00b4c1e371dee4f6f32072641430656d3f7c06468962347",
            signature:
              "0x688ddd61d7bbd4a9034f9e76c8a13404fe703f82b8ba63d84a852457a69b378e2d22a3837485ea2b058b3ec9c3fc7b4913d4035175fa9f4a696b5328f24a78221c",
          }),
        ),
      ).rejects.toThrow("OrderExpired: Order is expired");
    }
  });
});
